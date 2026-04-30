import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { logApi, runApi } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';

/**
 * POST /api/mobile/gemini-training-plan
 *
 * Body: { skill, petId?, petContext?, userContext?, level? }
 * Returns a 3-step micro-coaching plan tailored to this specific pet.
 *
 * NOT a full training curriculum — these are short focused 5-minute sessions
 * the pet parent can run on demand.
 */

interface TrainingStep {
  index: number;
  title: string;
  cue: string;
  duration_seconds: number;
  tip: string;
}

interface TrainingPlan {
  skill: string;
  petName: string;
  oneLineSummary: string;
  prepNote: string;
  steps: TrainingStep[];
  successLooksLike: string;
  estimatedMinutes: number;
}

const ENDPOINT = 'mobile/gemini-training-plan';

const FALLBACK_PLAN = (skill: string, petName: string): TrainingPlan => ({
  skill,
  petName,
  oneLineSummary: `Quick warm-up for ${petName} on ${skill}.`,
  prepNote: 'Have a few small high-value treats ready and pick a quiet spot.',
  steps: [
    {
      index: 1,
      title: 'Warm up',
      cue: `Get ${petName}'s attention with their name.`,
      duration_seconds: 30,
      tip: 'A calm voice works better than a loud one.',
    },
    {
      index: 2,
      title: 'Practice the cue',
      cue: 'Repeat the cue three times, rewarding success.',
      duration_seconds: 60,
      tip: 'Reward within one second of the right behaviour.',
    },
    {
      index: 3,
      title: 'End on a win',
      cue: 'Finish with one clean attempt and lots of praise.',
      duration_seconds: 30,
      tip: 'Always end the session on something the pet got right.',
    },
  ],
  successLooksLike: `${petName} responds at least once on cue with a relaxed body posture.`,
  estimatedMinutes: 3,
});

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<TrainingPlan>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }) => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();
      const skill = String(body.skill ?? '').trim();
      if (!skill) {
        const err: Error & { statusCode?: number } = new Error('skill is required');
        err.statusCode = 400;
        throw err;
      }
      const level = String(body.level ?? 'beginner');

      // Server-side usage gate. The "training" category covers the whole
      // session (plan + critique). Bumped here so a user starting a session
      // counts as one use even if they back out before recording a clip.
      const usage = await assertAndBumpUsage(uid, 'training');
      logInfo({ usage: usage.used, limit: usage.limit, isPro: usage.isPro });

      let firestoreContext = null;
      if (body.petId) {
        try {
          firestoreContext = await getOwnedPetContext(uid, String(body.petId));
        } catch (e) {
          logApi('warn', { requestId: rid, endpoint: ENDPOINT, event: 'pet-context-skipped' });
        }
      }

      const petContext = firestoreContext
        ? mergePetContext(firestoreContext, body.petContext)
        : body.petContext || {};

      const pet = petContext as Record<string, unknown>;
      const petName = (pet.name as string) || 'this pet';
      const parentName = (body.userContext?.firstName as string) || '';

      const prompt = `You are PawPilot, a friendly, modern dog/cat trainer designing a short hands-on coaching session.

# Pet
Name: ${petName}
Species: ${pet.species ?? 'unknown'}
Breed: ${pet.breed ?? 'mixed/unknown'}
Age: ${(pet as any).ageYears ?? '?'}y${(pet as any).ageMonths ? ` ${(pet as any).ageMonths}m` : ''}
Weight: ${(pet as any).weightKg ?? '?'} kg
Sex: ${pet.gender ?? 'unknown'}
Neutered: ${(pet as any).neutered ? 'yes' : 'unknown'}

# Skill the parent wants to work on
${skill}
${parentName ? `\n# Parent\n${parentName}` : ''}

# Goal
Generate a 3-step micro-session that takes ~3-5 minutes total. Voice will read each step aloud,
so write each step's "cue" field as a clear one-sentence instruction the parent can follow without
looking at the screen.

Return valid JSON only matching this shape:
{
  "skill": "${skill}",
  "petName": "${petName}",
  "oneLineSummary": "what we're working on with ${petName}, in one sentence",
  "prepNote": "what the parent should have ready before starting",
  "steps": [
    {
      "index": 1,
      "title": "short title",
      "cue": "one-sentence instruction the voice will read aloud (mention ${petName} by name where natural)",
      "duration_seconds": 30,
      "tip": "tiny coaching tip that mentions breed/age if relevant"
    },
    { "index": 2, ... },
    { "index": 3, ... }
  ],
  "successLooksLike": "what a successful session looks like for ${petName}",
  "estimatedMinutes": 3
}

Rules:
- Mention "${petName}" in the summary AND in the cue text of at least 2 of the 3 steps.
- Tailor the difficulty to ${petName}'s age + breed (puppies = 30s steps, adults = 60s steps; high-energy breeds need more reset time).
- Total session should not exceed 5 minutes.
- Be specific about timing, treat placement, body posture cues. No vague "be patient" advice.
- Level: ${level}. If beginner, scaffold harder steps; if advanced, add distraction or duration.
- No markdown. No emoji.`;

      try {
        const { data } = await generateGeminiJson<TrainingPlan>(prompt, undefined, undefined, {
          requestId: rid,
          endpoint: ENDPOINT,
        });
        return { ...data, skill, petName };
      } catch (e: any) {
        logApi('warn', { requestId: rid, endpoint: ENDPOINT, event: 'fallback', reason: e?.message });
        return FALLBACK_PLAN(skill, petName);
      }
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
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { success: false, message: (error as Error)?.message ?? 'Plan failed', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
