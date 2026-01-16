'use server';

import {
  generatePetInteractionPlan,
  type GeneratePetInteractionPlanInput,
  type GeneratePetInteractionPlanOutput,
} from '@/ai/flows/generate-pet-interaction-plan';

type ActionResult = GeneratePetInteractionPlanOutput & {
  error?: string;
};

export async function generatePetInteractionPlanAction(
  input: GeneratePetInteractionPlanInput
): Promise<ActionResult> {
  try {
    const output = await generatePetInteractionPlan(input);
    // Simple markdown-like formatting for better presentation
    const formattedPlan = output.interactionPlan
      .replace(/(\b\d+\.\s)/g, '\n**$1**') // Bold numbered lists
      .replace(/^- /gm, '\n- '); // Ensure lists have newlines
    return { ...output, interactionPlan: formattedPlan };
  } catch (e: any) {
    console.error(e);
    return {
      interactionPlan: '',
      error: e.message || 'Failed to generate plan.',
    };
  }
}
