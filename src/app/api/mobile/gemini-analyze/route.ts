import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { base64ApproxBytes, runApi } from '@/lib/pawme-logging';

const BREED_PROMPT = `You are a veterinary AI expert. Analyze this pet photo and provide the following information in JSON format ONLY (no markdown, no code blocks, just raw JSON):

{
  "breed": "specific breed name",
  "type": "dog" or "cat" or "bird" or "rabbit" or "other",
  "color": "coat/fur color description (e.g. Gray Tabby, Golden, Black & White)",
  "estimatedAge": "estimated age (e.g. 2 Years, 6 Months)",
  "gender": "Male or Female (best guess based on appearance)",
  "weight": "estimated weight in kg (e.g. 4.5 kg)",
  "careNotes": "2-3 sentences of breed-specific care advice",
  "confidence": 0.0 to 1.0
}

Be specific about the breed. If you can't determine something, make your best educated guess.`;

interface BreedAnalysis {
  breed: string;
  type: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  color: string;
  estimatedAge: string;
  gender: string;
  weight: string;
  careNotes: string;
  confidence: number;
}

const FALLBACK_RESULT: BreedAnalysis = {
  breed: 'Unknown',
  type: 'other',
  color: 'Unknown',
  estimatedAge: 'Unknown',
  gender: 'Unknown',
  weight: 'Unknown',
  careNotes: 'Please consult your veterinarian for specific care advice.',
  confidence: 0,
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ENDPOINT = 'mobile/gemini-analyze';

// Note: This endpoint is called during onboarding when the user may not be
// signed in yet, so we intentionally do NOT call requireMobileUser here.
// It's read-only and image-only — no user data leaks.
export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<BreedAnalysis>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<BreedAnalysis> => {
      const body = await request.json();
      const imageBase64 = body?.imageBase64;

      if (!imageBase64) {
        const err: Error & { statusCode?: number } = new Error('imageBase64 is required.');
        err.statusCode = 400;
        throw err;
      }

      const imageBytes = base64ApproxBytes(imageBase64);
      if (imageBytes > MAX_IMAGE_BYTES) {
        const err: Error & { statusCode?: number } = new Error(
          `Image too large (${Math.round(imageBytes / 1024 / 1024)}MB). Max 10MB.`,
        );
        err.statusCode = 413;
        throw err;
      }

      logInfo({ imageBytes });

      const { data, modelUsed, totalMs } = await generateGeminiJson<BreedAnalysis>(
        BREED_PROMPT,
        String(imageBase64),
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
