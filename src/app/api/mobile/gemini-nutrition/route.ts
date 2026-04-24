import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';

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

    const prompt = `You are PawMe Copilot, creating a practical pet nutrition plan.

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

    const data = await generateGeminiJson<NutritionPlan>(prompt);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[mobile/gemini-nutrition] Error:', error);
    return NextResponse.json({ success: true, data: FALLBACK_RESULT });
  }
}
