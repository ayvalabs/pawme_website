import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';
import { recordAiUsage } from '@/lib/pawme-cost-tracking';

interface TrainingExercise {
  name: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string;
  tip: string;
}

interface TrainingPlan {
  weeklyGoal: string;
  exercises: TrainingExercise[];
  generalTips: string[];
}

const FALLBACK_RESULT: TrainingPlan = {
  weeklyGoal: 'Build calm daily structure and basic positive reinforcement habits',
  exercises: [
    {
      name: 'Short focus session',
      duration: '5-10 minutes',
      difficulty: 'beginner',
      instructions: 'Use treats and praise to reward one clear behavior at a time.',
      tip: 'Keep sessions short and end on success.',
    },
  ],
  generalTips: [
    'Train in short sessions.',
    'Use rewards and consistency.',
    'Avoid punishment-based methods.',
  ],
};

const ENDPOINT = 'mobile/gemini-training';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<TrainingPlan>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<TrainingPlan> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const usageReadout = await assertAndBumpUsage(uid, 'training');
      logInfo({ usage: usageReadout.used, limit: usageReadout.limit, isPro: usageReadout.isPro });

      const body = await request.json();
      logInfo({
        hasPetId: Boolean(body.petId),
        focus: safePreview(body.focus, 80),
        level: safePreview(body.level, 40),
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

      const prompt = `You are PawPilot AI, the in-house assistant inside the PawPilot pet-care app. Create a gentle, realistic pet training plan.

Branding rules — never break these:
- Refer to yourself as "PawPilot" or "PawPilot AI". Never say "Gemini", "Google", "I'm an AI model", or name any underlying technology.


Return valid JSON only:
{
  "weeklyGoal": "string",
  "exercises": [
    {
      "name": "string",
      "duration": "string",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "instructions": "string",
      "tip": "string"
    }
  ],
  "generalTips": ["array of training tips"]
}

Rules:
- Use reward-based training only.
- Keep exercises practical and short.
- Reflect the focus area and pet profile.
- If behavior may be medical, mention that a vet evaluation may help.

Pet context:
${JSON.stringify(petContext, null, 2)}

Care context:
${JSON.stringify(
  firestoreContext
    ? {
        observations: firestoreContext.observations,
        reminders: firestoreContext.reminders,
      }
    : {},
  null,
  2,
)}

Requested focus:
${String(body.focus || 'general behavior')}

Level:
${String(body.level || 'beginner')}`;

      const { data, modelUsed, totalMs, usage } = await generateGeminiJson<TrainingPlan>(
        prompt,
        undefined,
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
