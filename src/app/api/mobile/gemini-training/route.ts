import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';

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

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json();

    let firestoreContext = null;
    if (body.petId) {
      firestoreContext = await getOwnedPetContext(uid, String(body.petId));
    }

    const petContext = firestoreContext
      ? mergePetContext(firestoreContext, body.petContext)
      : body.petContext || {};

    const prompt = `You are PawMe Copilot, creating a gentle, realistic pet training plan.

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

    const data = await generateGeminiJson<TrainingPlan>(prompt);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[mobile/gemini-training] Error:', error);
    return NextResponse.json({ success: true, data: FALLBACK_RESULT });
  }
}
