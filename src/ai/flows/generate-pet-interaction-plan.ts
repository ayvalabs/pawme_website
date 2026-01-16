'use server';

/**
 * @fileOverview Generates a dynamic pet interaction plan based on pet preferences and activity levels.
 *
 * - generatePetInteractionPlan - A function that generates the pet interaction plan.
 * - GeneratePetInteractionPlanInput - The input type for the generatePetInteractionPlan function.
 * - GeneratePetInteractionPlanOutput - The return type for the generatePetInteractionPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePetInteractionPlanInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  petType: z.string().describe('The type of pet (e.g., dog, cat).'),
  petPreferences: z
    .string()
    .describe(
      'A description of the pet’s preferences, including favorite toys, activities, and treats.'
    ),
  petActivityLevel: z
    .string()
    .describe(
      'The pet’s current activity level (e.g., high, medium, low).  Consider if the pet is usually energetic or more calm.'
    ),
  ownerInstructions: z
    .string()
    .optional()
    .describe(
      'Any special instructions from the owner regarding the pet’s care or activities.'
    ),
});

export type GeneratePetInteractionPlanInput = z.infer<
  typeof GeneratePetInteractionPlanInputSchema
>;

const GeneratePetInteractionPlanOutputSchema = z.object({
  interactionPlan: z
    .string()
    .describe(
      'A detailed plan for the PawMe robot to interact with the pet, including specific activities, timings, and instructions. Make sure to use the available tools for the robot.'
    ),
});

export type GeneratePetInteractionPlanOutput = z.infer<
  typeof GeneratePetInteractionPlanOutputSchema
>;

export async function generatePetInteractionPlan(
  input: GeneratePetInteractionPlanInput
): Promise<GeneratePetInteractionPlanOutput> {
  return generatePetInteractionPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePetInteractionPlanPrompt',
  input: {schema: GeneratePetInteractionPlanInputSchema},
  output: {schema: GeneratePetInteractionPlanOutputSchema},
  prompt: `You are an AI assistant designed to help PawMe robot keep pets entertained and happy while their owners are away.

  Based on the information provided about the pet, generate a detailed interaction plan for the PawMe robot. The plan should include specific activities, timings, and instructions for the robot.

  Pet Name: {{{petName}}}
  Pet Type: {{{petType}}}
  Pet Preferences: {{{petPreferences}}}
  Pet Activity Level: {{{petActivityLevel}}}
  Owner Instructions: {{{ownerInstructions}}}

  Interaction Plan:`,
});

const generatePetInteractionPlanFlow = ai.defineFlow(
  {
    name: 'generatePetInteractionPlanFlow',
    inputSchema: GeneratePetInteractionPlanInputSchema,
    outputSchema: GeneratePetInteractionPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
