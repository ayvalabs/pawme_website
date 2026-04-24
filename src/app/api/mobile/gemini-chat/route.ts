import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';

function buildChatPrompt(input: {
  petContext?: Record<string, unknown> | null;
  firestoreContext?: Awaited<ReturnType<typeof getOwnedPetContext>> | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const mergedPet = input.firestoreContext
    ? mergePetContext(input.firestoreContext, input.petContext)
    : input.petContext || {};

  return `You are PawMe Copilot, an AI pet care assistant. Be practical, concise, conservative, and never present yourself as a veterinarian or a diagnosis engine.

Return plain text only.

Rules:
- Give practical, pet-owner-friendly guidance.
- For medical risk or worsening symptoms, advise contacting a veterinarian.
- If there is urgency, clearly say whether to monitor, book a vet, or seek urgent care.
- Use the available pet and care history context when helpful.

Pet profile:
${JSON.stringify(mergedPet, null, 2)}

Recent care context:
${JSON.stringify(
    input.firestoreContext
      ? {
          observations: input.firestoreContext.observations,
          vaccinations: input.firestoreContext.vaccinations,
          reminders: input.firestoreContext.reminders,
          records: input.firestoreContext.records,
        }
      : {},
    null,
    2,
  )}

Conversation:
${JSON.stringify(input.messages, null, 2)}

Respond as PawMe Copilot to the latest user message.`;
}

const ENDPOINT = 'mobile/gemini-chat';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<{ response: string }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<{ response: string }> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const body = await request.json();
      const messages = Array.isArray(body.messages) ? body.messages : [];

      if (messages.length === 0) {
        const err: Error & { statusCode?: number } = new Error('messages are required');
        err.statusCode = 400;
        throw err;
      }

      logInfo({
        messageCount: messages.length,
        hasPetId: Boolean(body.petId),
        hasPetContext: Boolean(body.petContext),
      });

      let firestoreContext = null;
      if (body.petId) {
        try {
          firestoreContext = await getOwnedPetContext(uid, String(body.petId));
        } catch (petErr) {
          // Don't let a missing/foreign pet block chat — log and continue.
          logApi('warn', {
            requestId: reqId,
            endpoint: ENDPOINT,
            event: 'pet-context-skipped',
            petId: String(body.petId),
            reason: safePreview(petErr instanceof Error ? petErr.message : String(petErr), 200),
          });
        }
      }

      const geminiResult = await generateGeminiText(
        buildChatPrompt({
          petContext: body.petContext,
          firestoreContext,
          messages,
        }),
        { requestId: reqId, endpoint: ENDPOINT },
      );

      logInfo({ model: geminiResult.modelUsed, geminiMs: geminiResult.totalMs });
      return { response: geminiResult.text };
    },
  );

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { success: false, message, requestId },
      { status: statusCode, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
