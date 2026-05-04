import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';

interface NutritionPlan {
  dailyCalories: string;
  feedingSchedule: string[];
  recommendedFoods: string[];
  foodsToAvoid: string[];
  supplements: string[];
  tips: string;
  portionGuide: string;
}

const FALLBACK_RESULT: NutritionPlan = {
  dailyCalories: 'Consult your vet for personalized calorie recommendations',
  feedingSchedule: ['Morning feeding', 'Evening feeding'],
  recommendedFoods: ['High-quality protein sources', 'Vet-approved complete diet'],
  foodsToAvoid: ['Chocolate', 'Grapes', 'Onions', 'Xylitol'],
  supplements: ['Only use supplements recommended by your veterinarian'],
  tips: 'Monitor weight, appetite, and stool quality when changing food routines.',
  portionGuide: 'Use the pet’s age, body condition, and activity level to guide portions.',
};

const ENDPOINT = 'mobile/gemini-nutrition';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<NutritionPlan>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<NutritionPlan> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();

      logInfo({
        hasPetId: Boolean(body.petId),
        hasCurrentDiet: typeof body.currentDiet === 'string' && body.currentDiet.length > 0,
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

      const prompt = `You are PawPilot AI, the in-house assistant inside the PawPilot pet-care app. Create a practical pet nutrition plan.

Branding rules — never break these:
- Refer to yourself as "PawPilot" or "PawPilot AI". Never say "Gemini", "Google", "I'm an AI model", or name any underlying technology.


Return valid JSON only:
{
  "dailyCalories": "string",
  "feedingSchedule": ["array of feeding schedule items"],
  "recommendedFoods": ["array of recommended foods"],
  "foodsToAvoid": ["array of foods to avoid"],
  "supplements": ["array of supplement suggestions"],
  "tips": "short practical guidance",
  "portionGuide": "short portion guidance"
}

Rules:
- Be cautious and practical.
- Do not claim precise medical nutrition unless clearly known.
- Mention veterinarian guidance where appropriate.

Pet context:
${JSON.stringify(petContext, null, 2)}

Care context:
${JSON.stringify(
  firestoreContext
    ? {
        observations: firestoreContext.observations,
        reminders: firestoreContext.reminders,
        records: firestoreContext.records,
      }
    : {},
  null,
  2,
)}

Current diet from owner:
${String(body.currentDiet || '')}`;

      const { data, modelUsed, totalMs } = await generateGeminiJson<NutritionPlan>(
        prompt,
        undefined,
        undefined,
        { requestId: reqId, endpoint: ENDPOINT },
      );
      logInfo({ model: modelUsed, geminiMs: totalMs });
      return data;
    },
  );

  if (error) {
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
