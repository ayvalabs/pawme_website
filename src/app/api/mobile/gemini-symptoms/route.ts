import { NextRequest, NextResponse } from 'next/server';
import { buildGeminiMeta, generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';
import { recordAiUsage } from '@/lib/pawme-cost-tracking';

interface SymptomResult {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  condition: string;
  description: string;
  recommendations: string[];
  shouldSeeVet: boolean;
  urgency: string;
  /** 0–100: how confident the AI is given the information provided. */
  confidence: number;
}

const FALLBACK_RESULT: SymptomResult = {
  severity: 'medium',
  condition: 'Unable to analyze',
  description: 'We could not reliably analyze this symptom from the available information.',
  recommendations: [
    'Monitor your pet closely.',
    'Take clearer photos if the symptom is visible.',
    'Contact your veterinarian if symptoms persist or worsen.',
  ],
  shouldSeeVet: true,
  urgency: 'Consult your veterinarian if symptoms are worsening or severe.',
  confidence: 0,
};

// Refuse images larger than this to protect Gemini quotas and log bloat.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB decoded

const ENDPOINT = 'mobile/gemini-symptoms';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<SymptomResult>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<SymptomResult> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();

      if (!body.imageBase64 && !body.description) {
        const err: Error & { statusCode?: number } = new Error(
          'imageBase64 or description is required',
        );
        err.statusCode = 400;
        throw err;
      }

      const imageBytes = base64ApproxBytes(body.imageBase64);
      if (imageBytes > MAX_IMAGE_BYTES) {
        const err: Error & { statusCode?: number } = new Error(
          `Image too large (${Math.round(imageBytes / 1024 / 1024)}MB). Max 8MB.`,
        );
        err.statusCode = 413;
        throw err;
      }

      // Server-side usage gate (source of truth). Throws 402 if free/Pro cap reached.
      const usage = await assertAndBumpUsage(uid, 'symptom');
      logInfo({ usage: usage.used, limit: usage.limit, isPro: usage.isPro });

      logInfo({
        hasImage: Boolean(body.imageBase64),
        imageBytes,
        descriptionLength: typeof body.description === 'string' ? body.description.length : 0,
        hasPetId: Boolean(body.petId),
      });

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

      const pet = (petContext as Record<string, unknown>) || {};
      const petName = (pet.name as string) || 'this pet';
      const parentName = (body.userContext?.firstName as string) || '';

      // Compact recent-care summary (token-efficient — just the highlights).
      const careLines: string[] = [];
      if (firestoreContext) {
        const lastObs = firestoreContext.observations?.slice(0, 3) ?? [];
        if (lastObs.length) {
          careLines.push(
            `Recent symptoms: ${lastObs
              .map((o: any) => `${o.condition || 'check'} (${o.severity || '?'})`)
              .join('; ')}`,
          );
        }
        const meds = (firestoreContext.records as any[])?.filter((r) => r?.kind === 'medication').slice(0, 3) ?? [];
        if (meds.length) {
          careLines.push(`Active meds: ${meds.map((m: any) => m.title || m.name).filter(Boolean).join(', ')}`);
        }
      }
      const careBlock = careLines.length ? `\nCare history: ${careLines.join(' | ')}` : '';

      const ageStr = `${(pet as any).ageYears ?? '?'}y${
        (pet as any).ageMonths ? ` ${(pet as any).ageMonths}m` : ''
      }`;

      const prompt = `You are PawPilot, a cautious AI pet symptom guide. Never diagnose with certainty.

PET: ${petName} (${(pet.species as string) || 'unknown'}${
        pet.breed ? `, ${pet.breed}` : ''
      }, ${ageStr}${(pet as any).weightKg ? `, ${(pet as any).weightKg}kg` : ''})${careBlock}

Return JSON only:
{
  "severity": "low" | "medium" | "high" | "emergency",
  "condition": "short symptom summary mentioning ${petName}",
  "description": "1-2 sentences ABOUT ${petName} specifically; reference breed/age when relevant",
  "recommendations": ["3-5 actionable steps that mention ${petName} by name"],
  "shouldSeeVet": true | false,
  "urgency": "one-line next step for ${parentName || 'the parent'}"
}

Rules:
- Always refer to the pet as "${petName}" — never "your pet" or "the dog/cat".
- Use cautious language ("may indicate", "consistent with"). Never definitive.
- Escalate emergencies clearly.

Parent reports: ${String(body.description || '(image only)')}`;

      const geminiResult = await generateGeminiJson<SymptomResult>(
        prompt,
        body.imageBase64 ? String(body.imageBase64) : undefined,
        undefined,
        { requestId: reqId, endpoint: ENDPOINT },
      );
      const { data, modelUsed, totalMs, usage: geminiUsage } = geminiResult;

      void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: modelUsed, usage: geminiUsage, requestId: reqId });
      logInfo({ model: modelUsed, geminiMs: totalMs, confidence: data.confidence, costUsd: geminiUsage?.estimatedCostUsd });
      return {
        ...data,
        _meta: buildGeminiMeta(
          { text: '', modelUsed, totalMs, usage: geminiUsage, attempts: [] },
          data.confidence ?? null,
        ),
      } as SymptomResult & { _meta: ReturnType<typeof buildGeminiMeta> };
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
    // 400/413 surface as JSON error; everything else returns a safe fallback
    // so the mobile app UI never shows a generic failure on the symptom card.
    if (statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Invalid request', requestId },
        { status: statusCode, headers: { 'x-request-id': requestId } },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: FALLBACK_RESULT,
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
