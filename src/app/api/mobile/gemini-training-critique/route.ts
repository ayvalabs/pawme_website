import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJsonMulti, type GeminiFrame } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, logApi, runApi, safePreview } from '@/lib/pawme-logging';

/**
 * POST /api/mobile/gemini-training-critique
 *
 * Body:
 *   skill:        string (required) — what the parent was practising, e.g. "sit"
 *   plan?:        TrainingPlan from /gemini-training-plan (optional, gives the model the steps)
 *   frames:       Array<{ base64: string; mimeType?: string; label?: string }> (1-6 frames)
 *   petId?:       string
 *   petContext?:  object
 *   userContext?: { firstName?: string }
 *
 * Returns coaching feedback after a session: what worked, what to fix, suggested next session.
 *
 * NOT a full obedience curriculum — these are bite-sized critiques to keep the parent
 * engaged. The frames are sampled from a short (~5s-30s) phone video on-device.
 */

interface CritiqueResult {
  skill: string;
  petName: string;
  /** 'great' | 'good' | 'try_again' | 'not_visible' */
  outcome: 'great' | 'good' | 'try_again' | 'not_visible';
  headline: string;
  whatWorked: string[];
  whatToFix: string[];
  /** One-sentence suggestion for the next session */
  nextSession: string;
  /** Voice-friendly summary the app can read aloud, ~25 words */
  voiceSummary: string;
}

const ENDPOINT = 'mobile/gemini-training-critique';

const MAX_FRAMES = 6;
// Per-frame size cap (decoded). Roughly a 1024px JPEG ~300-700KB.
const MAX_FRAME_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_TOTAL_BYTES = 18 * 1024 * 1024; // 18 MB across frames

const FALLBACK = (skill: string, petName: string): CritiqueResult => ({
  skill,
  petName,
  outcome: 'not_visible',
  headline: `We could not analyse ${petName}'s session.`,
  whatWorked: [],
  whatToFix: [
    'Re-record in better lighting with the whole pet in frame.',
    'Keep the phone still and capture 5–10 seconds of the cue + response.',
  ],
  nextSession: `Try the same ${skill} session again with a brighter, steadier shot of ${petName}.`,
  voiceSummary: `I could not see ${petName} clearly. Try again with the whole body in frame and brighter light.`,
});

export async function POST(request: NextRequest) {
  const fallbackBucket = { skill: 'a skill', petName: 'this pet' };

  const { requestId, result, error } = await runApi<CritiqueResult>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }): Promise<CritiqueResult> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();
      const skill = String(body.skill ?? '').trim();
      if (!skill) {
        const err: Error & { statusCode?: number } = new Error('skill is required');
        err.statusCode = 400;
        throw err;
      }
      fallbackBucket.skill = skill;

      const rawFrames = Array.isArray(body.frames) ? body.frames : [];
      if (rawFrames.length === 0) {
        const err: Error & { statusCode?: number } = new Error('frames is required (1-6 stills)');
        err.statusCode = 400;
        throw err;
      }
      if (rawFrames.length > MAX_FRAMES) {
        const err: Error & { statusCode?: number } = new Error(
          `Too many frames (${rawFrames.length}). Max ${MAX_FRAMES}.`,
        );
        err.statusCode = 400;
        throw err;
      }

      const frames: GeminiFrame[] = [];
      let totalBytes = 0;
      for (let i = 0; i < rawFrames.length; i++) {
        const f = rawFrames[i];
        const b64 = String(f?.base64 ?? '');
        if (!b64) continue;
        const bytes = base64ApproxBytes(b64);
        if (bytes > MAX_FRAME_BYTES) {
          const err: Error & { statusCode?: number } = new Error(
            `Frame ${i + 1} too large (${Math.round(bytes / 1024 / 1024)}MB). Max 4MB per frame.`,
          );
          err.statusCode = 413;
          throw err;
        }
        totalBytes += bytes;
        frames.push({
          base64: b64,
          mimeType: typeof f?.mimeType === 'string' ? f.mimeType : 'image/jpeg',
          label: typeof f?.label === 'string' ? f.label : `frame ${i + 1} of ${rawFrames.length}`,
        });
      }
      if (totalBytes > MAX_TOTAL_BYTES) {
        const err: Error & { statusCode?: number } = new Error(
          `Total frame size too large (${Math.round(totalBytes / 1024 / 1024)}MB). Max 18MB combined.`,
        );
        err.statusCode = 413;
        throw err;
      }
      if (frames.length === 0) {
        const err: Error & { statusCode?: number } = new Error('No usable frames in payload');
        err.statusCode = 400;
        throw err;
      }

      logInfo({ skill, frameCount: frames.length, totalBytes });

      let firestoreContext = null;
      if (body.petId) {
        try {
          firestoreContext = await getOwnedPetContext(uid, String(body.petId));
        } catch (petErr) {
          logApi('warn', {
            requestId: rid,
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
      fallbackBucket.petName = petName;

      const planSummary = body.plan
        ? `# Plan we asked them to follow
${JSON.stringify(body.plan, null, 2)}`
        : '';

      const prompt = `You are PawPilot, a hands-on dog/cat trainer reviewing a short video of a training session.
The user attached ${frames.length} frame(s) sampled from the clip in chronological order.

# About the pet
Name: ${petName}
Species: ${(pet.species as string) || 'unknown'}
Breed: ${(pet.breed as string) || 'mixed/unknown'}
Age: ${(pet as any).ageYears ?? '?'}y${(pet as any).ageMonths ? ` ${(pet as any).ageMonths}m` : ''}
Weight: ${(pet as any).weightKg ?? '?'} kg
Sex: ${(pet.gender as string) || 'unknown'}
${parentName ? `\nParent: ${parentName}` : ''}

# Skill being practised
${skill}
${planSummary ? `\n${planSummary}` : ''}

# Your task
Critique the session in JSON only. Be specific — reference what you can SEE in the frames
(body posture, ear position, gaze direction, distance, treat handling). Do not invent details.

Return JSON exactly matching:
{
  "skill": "${skill}",
  "petName": "${petName}",
  "outcome": "great" | "good" | "try_again" | "not_visible",
  "headline": "one sentence verdict that uses ${petName}'s name",
  "whatWorked": ["1-3 specific positives — reference body language or timing"],
  "whatToFix": ["1-3 specific corrections, each actionable in the next 60 seconds"],
  "nextSession": "one sentence on what to try next, mentioning ${petName} by name",
  "voiceSummary": "~25 word spoken summary the app will read aloud — warm, encouraging, mentions ${petName}"
}

Rules:
- Always refer to the pet as "${petName}" — never "your pet" or "the dog/cat".
- If you cannot clearly see ${petName} or the cue in the frames, set outcome to "not_visible"
  and ask for a clearer re-record. Do NOT make up a critique you cannot verify.
- Keep voiceSummary under 30 words, plain English, no markdown, no emoji.
- Tailor advice to ${petName}'s breed and age — puppies need shorter sessions, terriers need
  more focus work, sighthounds tire fast, etc.
- Be honest but kind. Praise specifics, not vague "good job".`;

      try {
        const { data } = await generateGeminiJsonMulti<CritiqueResult>(prompt, frames, {
          requestId: rid,
          endpoint: ENDPOINT,
        });
        return { ...data, skill, petName };
      } catch (e: any) {
        logApi('warn', {
          requestId: rid,
          endpoint: ENDPOINT,
          event: 'fallback',
          reason: safePreview(e?.message || String(e), 300),
        });
        return FALLBACK(skill, petName);
      }
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 200;
    if (status >= 400 && status < 500) {
      return NextResponse.json(
        {
          success: false,
          message: (error as Error)?.message ?? 'Critique failed',
          requestId,
        },
        { status, headers: { 'x-request-id': requestId } },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: FALLBACK(fallbackBucket.skill, fallbackBucket.petName),
        requestId,
      },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
