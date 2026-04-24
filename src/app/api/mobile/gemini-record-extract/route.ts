import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';

interface ExtractedMedicalRecord {
  title: string;
  type: 'vaccination' | 'lab' | 'prescription' | 'invoice' | 'certificate' | 'visit-note' | 'other';
  providerName?: string;
  issuedAt?: string;
  summary: string;
  extractedFields: Record<string, string>;
  vaccinations?: Array<{
    vaccineName: string;
    dateAdministered?: string;
    nextDueDate?: string;
    clinicName?: string;
  }>;
}

const FALLBACK_RESULT: ExtractedMedicalRecord = {
  title: 'Scanned pet record',
  type: 'other',
  providerName: '',
  issuedAt: new Date().toISOString().split('T')[0],
  summary: 'We saved your scan, but could not confidently extract the full record details.',
  extractedFields: {
    review: 'Manual confirmation recommended',
  },
  vaccinations: [],
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB decoded

const ENDPOINT = 'mobile/gemini-record-extract';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<ExtractedMedicalRecord>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<ExtractedMedicalRecord> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();

      if (!body.imageBase64) {
        const err: Error & { statusCode?: number } = new Error('imageBase64 is required');
        err.statusCode = 400;
        throw err;
      }

      const imageBytes = base64ApproxBytes(body.imageBase64);
      if (imageBytes > MAX_IMAGE_BYTES) {
        const err: Error & { statusCode?: number } = new Error(
          `Image too large (${Math.round(imageBytes / 1024 / 1024)}MB). Max 10MB.`,
        );
        err.statusCode = 413;
        throw err;
      }

      logInfo({
        imageBytes,
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

      const prompt = `You are PawMe Copilot extracting a pet medical document from an image.

Return valid JSON only:
{
  "title": "short title for the record",
  "type": "vaccination" | "lab" | "prescription" | "invoice" | "certificate" | "visit-note" | "other",
  "providerName": "clinic or provider if visible",
  "issuedAt": "YYYY-MM-DD if visible, otherwise empty string",
  "summary": "2-3 sentence summary of what the document appears to be",
  "extractedFields": {
    "fieldName": "fieldValue"
  },
  "vaccinations": [
    {
      "vaccineName": "string",
      "dateAdministered": "YYYY-MM-DD if visible",
      "nextDueDate": "YYYY-MM-DD if visible",
      "clinicName": "string if visible"
    }
  ]
}

Rules:
- Only extract what is reasonably visible.
- Leave values empty instead of inventing specifics.
- If the image looks like a vaccine card, include vaccination entries.
- Keep the summary practical and cautious.

Pet context:
${JSON.stringify(petContext, null, 2)}

Existing care context:
${JSON.stringify(
  firestoreContext
    ? {
        vaccinations: firestoreContext.vaccinations,
        records: firestoreContext.records,
      }
    : {},
  null,
  2,
)}`;

      const { data, modelUsed, totalMs } = await generateGeminiJson<ExtractedMedicalRecord>(
        prompt,
        String(body.imageBase64),
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
