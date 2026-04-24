import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';

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

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ success: false, message: 'messages are required' }, { status: 400 });
    }

    let firestoreContext = null;
    if (body.petId) {
      firestoreContext = await getOwnedPetContext(uid, String(body.petId));
    }

    const response = await generateGeminiText(
      buildChatPrompt({
        petContext: body.petContext,
        firestoreContext,
        messages,
      }),
    );

    return NextResponse.json({ success: true, data: { response } });
  } catch (error) {
    console.error('[mobile/gemini-chat] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to generate chat response' },
      { status: 500 },
    );
  }
}
