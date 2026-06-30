import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';
import { recordAiUsage } from '@/lib/pawme-cost-tracking';

/**
 * Tracker-screenshot extraction.
 *
 * Mobile sends a screenshot from a pet GPS / activity tracker app
 * (Tractive, Fi, PitPat, Whistle, Apple Find My, Garmin, etc.) and we ask
 * Gemini to read the visible numbers + activity type and return structured
 * JSON the client can save into the activity timeline.
 *
 * Mirrors gemini-record-extract pattern (auth → image size guard → pet
 * context → Gemini call → graceful fallback on error).
 */

interface ExtractedTrackerData {
  /** Source app, e.g. "Tractive", "Fi", "PitPat", "Apple Find My". Free-form. */
  source: string;
  /** "walk", "run", "play", "rest", "lost", or any other label visible. */
  activityType: string;
  /** Date the activity occurred — YYYY-MM-DD if visible, else empty string. */
  occurredOn: string;
  /** Step count if visible, else null. */
  steps: number | null;
  /** Distance in meters if visible, else null. */
  distanceMeters: number | null;
  /** Duration in minutes if visible, else null. */
  durationMinutes: number | null;
  /** Calories burned if visible, else null. */
  calories: number | null;
  /** Highest-level summary the screenshot conveys, 1–2 sentences. */
  summary: string;
  /** Anything the model couldn't bucket but worth keeping. */
  notes: string;
}

const FALLBACK_RESULT: ExtractedTrackerData = {
  source: 'Tracker app',
  activityType: 'activity',
  occurredOn: new Date().toISOString().split('T')[0],
  steps: null,
  distanceMeters: null,
  durationMinutes: null,
  calories: null,
  summary: 'We saved your screenshot but could not confidently extract the tracker stats. Tap the entry to view the original image.',
  notes: '',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB decoded

const ENDPOINT = 'mobile/gemini-tracker-extract';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<ExtractedTrackerData>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<ExtractedTrackerData> => {
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

      const usageReadout = await assertAndBumpUsage(uid, 'trackerExtract');
      logInfo({ imageBytes, hasPetId: Boolean(body.petId), usage: usageReadout.used, limit: usageReadout.limit });

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
            reason: safePreview(
              petErr instanceof Error ? petErr.message : String(petErr),
              200,
            ),
          });
        }
      }

      const petContext = firestoreContext
        ? mergePetContext(firestoreContext, body.petContext)
        : body.petContext || {};

      const prompt = `You are PawPilot AI, the in-house assistant inside the PawPilot pet-care app. You are reading a screenshot from a pet GPS / activity tracker app.

Branding rules — never break these:
- Refer to yourself as "PawPilot" or "PawPilot AI". Never say "Gemini", "Google", "I'm an AI model", or name any underlying technology.
- If you must self-describe, say "PawPilot read this screenshot for you" or similar.


Common sources: Tractive, Fi, PitPat, Whistle, Apple Find My, Garmin, FitBark.
The screenshot may show: a daily summary, a walk / run record, a live location, a goal screen, or a multi-day chart.

Return valid JSON only:
{
  "source": "the app the screenshot came from (e.g. 'Tractive', 'Fi', 'PitPat', 'Apple Find My'). Best guess from logos / styling. Default 'Tracker app' if unclear.",
  "activityType": "single label: 'walk' | 'run' | 'play' | 'rest' | 'lost' | 'goal' | 'sleep' | 'other'",
  "occurredOn": "YYYY-MM-DD if a date is visible, otherwise empty string",
  "steps": number or null,
  "distanceMeters": number or null (convert km / miles to meters; 1 mi = 1609 m),
  "durationMinutes": number or null (convert hours to minutes),
  "calories": number or null,
  "summary": "1-2 sentences describing what the screenshot shows. Mention pet by name if known.",
  "notes": "anything else worth preserving — landmarks, goal completion %, heart-rate, etc. Empty string if none."
}

Rules:
- Only extract what is visibly written in the screenshot.
- Convert all distances to METERS, all durations to MINUTES.
- If a value isn't shown, use null (or empty string for source/occurredOn/notes).
- Keep summary practical, no fluff like "great job".
- Pet context is optional — if pet name is provided, you may use it in summary.

Pet context:
${JSON.stringify(petContext, null, 2)}`;

      const { data, modelUsed, totalMs, usage } = await generateGeminiJson<ExtractedTrackerData>(
        prompt,
        String(body.imageBase64),
        undefined,
        { requestId: reqId, endpoint: ENDPOINT },
      );
      void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: modelUsed, usage, requestId: reqId });
      logInfo({ model: modelUsed, geminiMs: totalMs, costUsd: usage?.estimatedCostUsd });
      return data;
    },
  );

  if (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        { success: false, message: error.message, code: 'usage_limit_reached', category: error.category, used: error.used, limit: error.limit, isPro: error.isPro, requestId },
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
