import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { requireWithinFreeTier } from '@/lib/ai-allowance';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';

/**
 * POST /api/mobile/gemini-photo-scan
 *
 * Body:
 *   imageBase64: string (required, max ~8MB decoded)
 *   scanType:    'coat' | 'eyes' | 'ears' | 'wound' | 'body'
 *   petId?:      string  (Firestore pets/{petId} — owner enforced)
 *   petContext?: object  (caller-provided context, merged into Firestore)
 *
 * Auth: Bearer Firebase ID token (mobile user).
 *
 * Response:
 *   {
 *     success: true,
 *     data: PhotoScanResult,
 *     requestId
 *   }
 */

type ScanType = 'coat' | 'eyes' | 'ears' | 'wound' | 'body';

interface PhotoScanResult {
  scanType: ScanType;
  concernLevel: 'normal' | 'monitor' | 'see_vet' | 'emergency';
  observation: string;
  recommendations: string[];
  shouldSeeVet: boolean;
  urgency: string;
  // Optional, scan-specific fields the model may populate
  detectedConditions?: string[];
}

const FALLBACK_RESULT = (scanType: ScanType): PhotoScanResult => ({
  scanType,
  concernLevel: 'monitor',
  observation:
    'We could not reliably analyse this photo. Try a clearer, well-lit close-up of the affected area.',
  recommendations: [
    'Re-take the photo in good lighting, with the area in clear focus.',
    'Compare the area against the opposite side of the body, if applicable.',
    'Contact your veterinarian if the symptom persists or worsens.',
  ],
  shouldSeeVet: false,
  urgency: 'Re-scan or consult a veterinarian if the symptom persists.',
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB decoded

const ENDPOINT = 'mobile/gemini-photo-scan';

const SCAN_TYPE_PROMPTS: Record<ScanType, { focus: string; ask: string }> = {
  coat: {
    focus: 'the coat and skin',
    ask:
      'Look for dryness, dandruff, redness, hot spots, hair loss, scabs, parasites (fleas, ticks), lumps, or rashes.',
  },
  eyes: {
    focus: 'the eyes',
    ask:
      'Look for discharge (clear / coloured), redness, swelling, cloudiness, third-eyelid prominence, or asymmetry between eyes.',
  },
  ears: {
    focus: 'the ears',
    ask:
      'Look for waxy buildup, dark debris, redness, swelling, scabs, hair loss, or abnormal positioning. Note that odour cannot be inferred from a photo.',
  },
  wound: {
    focus: 'a wound or lesion',
    ask:
      'Estimate the size, depth, bleeding status, signs of infection (pus, redness, swelling), and whether stitches or vet attention are likely needed.',
  },
  body: {
    focus: 'the overall body condition',
    ask:
      'Estimate body condition score (1–9 scale: 1 emaciated, 5 ideal, 9 obese). Note visible ribs, waist visibility, abdominal tuck, and overall posture.',
  },
};

function isScanType(v: unknown): v is ScanType {
  return v === 'coat' || v === 'eyes' || v === 'ears' || v === 'wound' || v === 'body';
}

export async function POST(request: NextRequest) {
  const scanTypeFromBody = { value: 'coat' as ScanType };

  const { requestId, result, error } = await runApi<PhotoScanResult>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<PhotoScanResult> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      // Free-tier metering (PRD-ai-cost-metering §3) — non-Pro users hit
      // a monthly cap; over the cap throws structured 402 → app paywall.
      await requireWithinFreeTier(uid, 'gemini-photo-scan');

      const body = await request.json();

      if (!body.imageBase64) {
        const err: Error & { statusCode?: number } = new Error('imageBase64 is required');
        err.statusCode = 400;
        throw err;
      }
      if (!isScanType(body.scanType)) {
        const err: Error & { statusCode?: number } = new Error(
          'scanType must be one of: coat, eyes, ears, wound, body',
        );
        err.statusCode = 400;
        throw err;
      }
      scanTypeFromBody.value = body.scanType;

      const imageBytes = base64ApproxBytes(body.imageBase64);
      if (imageBytes > MAX_IMAGE_BYTES) {
        const err: Error & { statusCode?: number } = new Error(
          `Image too large (${Math.round(imageBytes / 1024 / 1024)}MB). Max 8MB.`,
        );
        err.statusCode = 413;
        throw err;
      }

      logInfo({
        scanType: body.scanType,
        imageBytes,
        hasPetId: Boolean(body.petId),
      });

      // Server-side usage gate. Throws 402 if free/Pro cap reached.
      const usage = await assertAndBumpUsage(uid, 'photoScan');
      logInfo({ usage: usage.used, limit: usage.limit, isPro: usage.isPro });

      let firestoreContext = null;
      if (body.petId) {
        try {
          firestoreContext = await getOwnedPetContext(uid, String(body.petId));
        } catch (petErr) {
          logApi('warn', {
            requestId: reqId,
            endpoint: ENDPOINT,
            event: 'pet-context-skipped',
            petId: String(body.petId),
            reason: safePreview(petErr instanceof Error ? petErr.message : String(petErr), 200),
          });
        }
      }

      const petContext = firestoreContext
        ? mergePetContext(firestoreContext, body.petContext)
        : body.petContext || {};

      const cfg = SCAN_TYPE_PROMPTS[body.scanType as ScanType];
      const pet = (petContext as Record<string, unknown>) || {};
      const petName = (pet.name as string) || 'this pet';

      const ageStr = `${(pet as any).ageYears ?? '?'}y${
        (pet as any).ageMonths ? ` ${(pet as any).ageMonths}m` : ''
      }`;

      const prompt = `You are PawPilot, a cautious AI inspecting a photo of ${cfg.focus} for ${petName}.

PET: ${petName} (${(pet.species as string) || 'unknown'}${
        pet.breed ? `, ${pet.breed}` : ''
      }, ${ageStr}${(pet as any).weightKg ? `, ${(pet as any).weightKg}kg` : ''})

Return JSON only:
{
  "scanType": "${body.scanType}",
  "concernLevel": "normal" | "monitor" | "see_vet" | "emergency",
  "observation": "1-2 sentences describing what you see ABOUT ${petName} BY NAME",
  "recommendations": ["3-5 practical steps that mention ${petName} by name; consider breed/age"],
  "shouldSeeVet": true | false,
  "urgency": "one line on vet-visit timing for ${petName}",
  "detectedConditions": ["0-3 short labels"]
}

Rules:
- ${cfg.ask}
- Always refer to the pet as "${petName}" — never "your pet" or "the dog/cat".
- Tailor to breed + life stage; note breed-specific risks.
- Use cautious language ("appears to", "may indicate"). Never definitive.
- If the photo is dark/blurred/off-target, set concernLevel="monitor" and ask for a re-take.
- Concern level mapping:
  · normal = nothing of concern
  · monitor = minor finding, re-check in 1-3 days
  · see_vet = book a vet in 24-48 hours
  · emergency = urgent veterinary attention now
- Include the "AI guidance only" framing in recommendations.`;

      const { data, modelUsed, totalMs } = await generateGeminiJson<PhotoScanResult>(
        prompt,
        String(body.imageBase64),
        undefined,
        { requestId: reqId, endpoint: ENDPOINT },
      );

      logInfo({ model: modelUsed, geminiMs: totalMs, concernLevel: data?.concernLevel });
      // Force scanType in the output to whatever the caller asked for, in case
      // the model echoes the wrong one.
      return { ...data, scanType: body.scanType as ScanType };
    },
  );

  if (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: 'usage_limit_reached',
          category: error.category,
          used: error.used,
          limit: error.limit,
          isPro: error.isPro,
          requestId,
        },
        { status: 402, headers: { 'x-request-id': requestId } },
      );
    }
    const statusCode =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 200;
    if (statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Invalid request',
          requestId,
        },
        { status: statusCode, headers: { 'x-request-id': requestId } },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: FALLBACK_RESULT(scanTypeFromBody.value),
        requestId,
        debug:
          process.env.NODE_ENV !== 'production'
            ? { error: error instanceof Error ? error.message : String(error) }
            : undefined,
      },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
