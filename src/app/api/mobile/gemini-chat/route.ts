import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';
import { assertAndBumpUsage, UsageLimitError } from '@/lib/pawme-usage';

/**
 * Trim a chat history to the last N turns to keep token usage bounded.
 * Each user/assistant message averages ~80 tokens; capping at 6 turns keeps
 * conversation context under ~500 tokens regardless of how long the user has
 * been chatting.
 */
function trimHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTurns = 6,
) {
  return messages.slice(-maxTurns);
}

function buildChatPrompt(input: {
  petContext?: Record<string, unknown> | null;
  userContext?: Record<string, unknown> | null;
  firestoreContext?: Awaited<ReturnType<typeof getOwnedPetContext>> | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const mergedPet = input.firestoreContext
    ? mergePetContext(input.firestoreContext, input.petContext)
    : input.petContext || {};

  const pet = mergedPet as Record<string, unknown>;
  const petName = (pet?.name as string) || 'their pet';
  const parentName = (input.userContext?.firstName as string) || '';

  const species = (pet?.species as string) || 'pet';
  const breed = (pet?.breed as string) || '';
  const ageYears = (pet as any)?.ageYears;
  const ageMonths = (pet as any)?.ageMonths;
  const weightKg = (pet as any)?.weightKg;
  const ageStr =
    ageYears != null || ageMonths != null
      ? `${ageYears ?? 0}y${ageMonths ? ` ${ageMonths}m` : ''}`
      : 'unknown';

  // Compact recent care context — keep only the most recent 3 of each type
  // and only the fields the AI needs to reason about. The full Firestore docs
  // were ballooning the prompt to 1500+ tokens. This caps it under ~250.
  const careLines: string[] = [];
  if (input.firestoreContext) {
    const fc = input.firestoreContext;
    const lastObs = fc.observations?.slice(0, 3) ?? [];
    if (lastObs.length) {
      careLines.push(
        `Recent symptoms: ${lastObs
          .map((o: any) => `${o.condition || 'check'} (${o.severity || '?'})`)
          .join('; ')}`,
      );
    }
    const lastVax = fc.vaccinations?.slice(0, 3) ?? [];
    if (lastVax.length) {
      careLines.push(
        `Recent vaccines: ${lastVax.map((v: any) => v.name).filter(Boolean).join(', ')}`,
      );
    }
    const meds = (fc.records as any[])?.filter((r) => r?.kind === 'medication').slice(0, 3) ?? [];
    if (meds.length) {
      careLines.push(
        `Active meds: ${meds.map((m: any) => m.title || m.name).filter(Boolean).join(', ')}`,
      );
    }
  }
  const careBlock = careLines.length ? `\nRecent care: ${careLines.join(' | ')}` : '';

  const trimmed = trimHistory(input.messages);
  const conversation = trimmed
    .map((m) => `${m.role === 'user' ? 'Parent' : 'PawPilot'}: ${m.content}`)
    .join('\n');

  return `You are PawPilot, a warm AI pet co-pilot. Never claim to be a vet.

PET: ${petName} (${species}${breed ? `, ${breed}` : ''}, ${ageStr}${
    weightKg ? `, ${weightKg}kg` : ''
  })${parentName ? ` — Parent: ${parentName}` : ''}${careBlock}

RULES:
- First sentence MUST mention "${petName}" by name.
- Reference breed/age when it changes the answer (e.g. "Because ${petName} is a ${
    breed || species
  }…").
- Replace "your dog/pet" with "${petName}".
- Plain prose. No markdown, no bullets. Max 3 short paragraphs.
- For health concerns, end with: "AI guidance only — not a substitute for a vet."
- If urgent, say so plainly: "monitor", "book a vet", or "seek urgent care".

CONVERSATION (latest user message at the bottom):
${conversation}

Respond as PawPilot.`;
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

      // Server-side gate (source of truth). Throws 402 UsageLimitError
      // if free/Pro cap reached.
      const usage = await assertAndBumpUsage(uid, 'chat');
      logInfo({ usage: usage.used, limit: usage.limit, isPro: usage.isPro });

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
          userContext: body.userContext,
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
      error instanceof UsageLimitError
        ? 402
        : typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    const payload: Record<string, unknown> = { success: false, message, requestId };
    if (error instanceof UsageLimitError) {
      payload.code = 'usage_limit_reached';
      payload.category = error.category;
      payload.used = error.used;
      payload.limit = error.limit;
      payload.isPro = error.isPro;
    }
    return NextResponse.json(payload, {
      status: statusCode,
      headers: { 'x-request-id': requestId },
    });
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
