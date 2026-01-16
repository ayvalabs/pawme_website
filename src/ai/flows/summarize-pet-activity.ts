'use server';
/**
 * @fileOverview Summarizes a pet's activities during the day.
 *
 * - summarizePetActivity - A function that generates a summary report of a pet's activities.
 * - SummarizePetActivityInput - The input type for the summarizePetActivity function.
 * - SummarizePetActivityOutput - The return type for the summarizePetActivity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePetActivityInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  petType: z.string().describe('The type of pet (e.g., dog, cat).'),
  activities: z.array(z.string()).describe('A list of activities the pet engaged in during the day.'),
});
export type SummarizePetActivityInput = z.infer<typeof SummarizePetActivityInputSchema>;

const SummarizePetActivityOutputSchema = z.object({
  summary: z.string().describe('A summarized report of the pet\'s activities during the day.'),
});
export type SummarizePetActivityOutput = z.infer<typeof SummarizePetActivityOutputSchema>;

export async function summarizePetActivity(input: SummarizePetActivityInput): Promise<SummarizePetActivityOutput> {
  return summarizePetActivityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePetActivityPrompt',
  input: {schema: SummarizePetActivityInputSchema},
  output: {schema: SummarizePetActivityOutputSchema},
  prompt: `You are an AI assistant that summarizes a pet\'s activities for their owner.\n\nPet Name: {{{petName}}}
Pet Type: {{{petType}}}
Activities: {{#each activities}}\n- {{{this}}}{{/each}}\n\nSummary: `,
});

const summarizePetActivityFlow = ai.defineFlow(
  {
    name: 'summarizePetActivityFlow',
    inputSchema: SummarizePetActivityInputSchema,
    outputSchema: SummarizePetActivityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
