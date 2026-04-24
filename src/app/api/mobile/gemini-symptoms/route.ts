import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';

interface SymptomResult {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  condition: string;
  description: string;
  recommendations: string[];
  shouldSeeVet: boolean;
  urgency: string;
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

      const prompt = `You are PawMe Copilot, a conservative AI pet symptom guide.

Return valid JSON only:
{
  "severity": "low" | "medium" | "high" | "emergency",
  "condition": "short symptom summary",
  "description": "short explanation of what this may represent",
  "recommendations": ["3-5 practical next steps"],
  "shouldSeeVet": true,
  "urgency": "clear next-step guidance"
}

Rules:
- Never diagnose with certainty.
- Use cautious language.
- Escalate emergencies clearly.
- Consider recent observations and care history if present.

Pet context:
${JSON.stringify(petContext, null, 2)}

Recent care context:
${JSON.stringify(
  firestoreContext
    ? {
        observations: firestoreContext.observations,
        vaccinations: firestoreContext.vaccinations,
        records: firestoreContext.records,
      }
    : {},
  null,
  2,
)}

Owner description:
${String(body.description || '')}`;

      const { data, modelUsed, totalMs } = await generateGeminiJson<SymptomResult>(
        prompt,
        body.imageBase64 ? String(body.imageBase64) : undefined,
        undefined,
        { requestId: reqId, endpoint: ENDPOINT },
      );

      logInfo({ model: modelUsed, geminiMs: totalMs });
      return data;
    },
  );

  if (error) {
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
