'use server';
/**
 * @fileOverview An AI flow for generating email content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GenerateEmailInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the email to be generated.'),
  variables: z.string().optional().describe('A comma-separated list of template variables to include, like {{userName}}.')
});
export type GenerateEmailInput = z.infer<typeof GenerateEmailInputSchema>;

const GenerateEmailOutputSchema = z.object({
  htmlContent: z.string().describe('The complete, well-formatted HTML content for the email body. It should use inline styles for maximum compatibility and be responsive. Do not include <!DOCTYPE>, <html>, or <body> tags, only the content that would go inside the <body>.'),
});
export type GenerateEmailOutput = z.infer<typeof GenerateEmailOutputSchema>;

export async function generateEmail(input: GenerateEmailInput): Promise<GenerateEmailOutput> {
  return generateEmailFlow(input);
}

const prompt = ai.definePrompt(
  {
    name: 'generateEmailPrompt',
    input: { schema: GenerateEmailInputSchema },
    output: { schema: GenerateEmailOutputSchema },
    prompt: `You are an expert marketing copywriter and email designer specializing in the pet tech industry. Your task is to generate a complete, engaging, and visually appealing HTML email body based on the user's prompt.

    **Instructions:**
    1.  **HTML Structure:** Generate only the HTML content that would go inside the \`<body>\` tag. Do NOT include \`<!DOCTYPE>\`, \`<html>\`, or \`<body>\` tags.
    2.  **Styling:** Use inline CSS styles for all elements to ensure maximum compatibility across email clients. Do not use \`<style>\` blocks.
    3.  **Responsiveness:** Ensure the email is responsive and looks great on both mobile and desktop. Use techniques like fluid tables.
    4.  **Tone:** Adopt a friendly, enthusiastic, and professional tone suitable for the PawMe brand (an AI companion robot for pets).
    5.  **Variables:** If the user provides template variables, incorporate them naturally into the email using the \`{{variableName}}\` format. The available variables are: {{variables}}
    6.  **Brand Color:** Use PawMe's primary brand color, #7678EE, for key elements like buttons and highlights.

    **User Prompt:**
    "{{prompt}}"
    `,
  },
);

const generateEmailFlow = ai.defineFlow(
  {
    name: 'generateEmailFlow',
    inputSchema: GenerateEmailInputSchema,
    outputSchema: GenerateEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to generate email content.");
    }
    return output;
  },
);
