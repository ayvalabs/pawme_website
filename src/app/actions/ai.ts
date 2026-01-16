'use server';

import { generateEmail as generateEmailFlow } from '@/ai/flows/generate-email-flow';
import type { GenerateEmailInput } from '@/ai/flows/generate-email-flow';

// This is a server action that can be called from client components.
export async function generateEmail(input: GenerateEmailInput) {
  // The Genkit flow is executed on the server.
  return await generateEmailFlow(input);
}
