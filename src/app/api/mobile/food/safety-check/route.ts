import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { recordAiUsage } from '@/lib/pawme-cost-tracking';
import { optionalMobileUser } from '@/lib/pawme-mobile';
import { base64ApproxBytes, runApi } from '@/lib/pawme-logging';
import { checkFoodSafety, type SafetyVerdict } from '@/lib/pawme-food-safety';

// "Can my dog/cat eat this?" — the viral Check face of the Nutrition pillar
// (PRD v2 §4.7). Reachable pre-signup. Verdict for established hazards is
// DETERMINISTIC (pawme-food-safety); Gemini only tailors the wording.
const ENDPOINT = 'mobile/food/safety-check';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface PetContext {
  name?: string;
  species?: string;
  breed?: string;
  age?: string;
  weight?: string;
  allergies?: string[];
  conditions?: string[];
}

interface SafetyResponse {
  food: string;
  verdict: SafetyVerdict;
  title: string;
  explanation: string;
  reason: string;
  shareText: string;
  source: 'database' | 'ai';
}

function petLine(pet?: PetContext): string {
  if (!pet) return 'a pet (no profile given)';
  const parts = [
    pet.species || 'pet',
    pet.breed ? `breed ${pet.breed}` : '',
    pet.age ? `age ${pet.age}` : '',
    pet.weight ? `${pet.weight}` : '',
    pet.allergies?.length ? `allergies: ${pet.allergies.join('; ')}` : '',
    pet.conditions?.length ? `conditions: ${pet.conditions.join('; ')}` : '',
  ].filter(Boolean);
  return (pet.name ? `${pet.name}, ` : '') + parts.join(', ');
}

const IDENTIFY_PROMPT = `Identify the single food or ingredient a pet owner is asking about in this photo. Respond JSON ONLY:
{ "isFood": true or false, "food": "the common name of the food, e.g. 'grapes', 'chicken', 'dark chocolate', or empty" }
Set isFood=false if there is no identifiable food/ingredient.`;

function verdictPrompt(
  food: string,
  pet: PetContext | undefined,
  fixed: { verdict: SafetyVerdict; reason: string } | null,
  species: string,
): string {
  const constraint = fixed
    ? `The correct verdict is FIXED as "${fixed.verdict}" because: ${fixed.reason} Do NOT change the verdict — explain it.`
    : `This food is not in our hazard database. Decide the verdict yourself but be CONSERVATIVE: if you are at all unsure, use "caution" and suggest checking with a vet. Never call something "safe" unless it is well established as safe for ${species}s.`;

  return `You are a friendly veterinary nutrition assistant answering "Can my ${species} eat ${food}?" for THIS pet: ${petLine(pet)}.

${constraint}

Respond JSON ONLY:
{
  "verdict": "safe" | "caution" | "toxic",
  "title": "short headline, e.g. 'Safe in small amounts' or 'Toxic — never feed this'",
  "explanation": "2-3 warm, plain-English sentences. ALWAYS address the pet by name when a name is given (e.g. 'Bailey'), not 'your dog'. Tailor to its breed/age/allergies. No jargon.",
  "shareText": "one punchy line for a share card, e.g. 'Can ${pet?.name || 'your dog'} eat ${food}? ❌ No — toxic.' Use ✅ for safe, ⚠️ for caution, ❌ for toxic."
}
This is guidance, not veterinary advice; for any real concern, advise contacting a vet.`;
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<SafetyResponse>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<SafetyResponse> => {
      const { uid } = await optionalMobileUser(request);
      const body = await request.json();
      let query: string = body?.query ? String(body.query).trim() : '';
      const imageBase64: string | undefined = body?.imageBase64;
      const pet: PetContext | undefined = body?.petContext;
      const species = pet?.species === 'cat' ? 'cat' : 'dog';

      if (!query && !imageBase64) {
        const err: Error & { statusCode?: number } = new Error('Provide a food name or an image.');
        err.statusCode = 400;
        throw err;
      }

      // Resolve the food from a photo if no text query was given.
      if (!query && imageBase64) {
        if (base64ApproxBytes(imageBase64) > MAX_IMAGE_BYTES) {
          const err: Error & { statusCode?: number } = new Error('Image too large. Max 10MB.');
          err.statusCode = 413;
          throw err;
        }
        const id = await generateGeminiJson<{ isFood: boolean; food: string }>(
          IDENTIFY_PROMPT,
          imageBase64,
          undefined,
          { requestId: reqId, endpoint: ENDPOINT },
        );
        void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: id.modelUsed, usage: id.usage, requestId: reqId });
        if (!id.data?.isFood || !id.data.food) {
          const err: Error & { statusCode?: number; userMessage?: string } = new Error('no-food');
          err.statusCode = 422;
          err.userMessage = "We couldn't spot a food in that photo. Try typing the food name instead.";
          throw err;
        }
        query = id.data.food;
      }

      // Deterministic verdict for established hazards/safe foods.
      const db = checkFoodSafety(query, species);
      const fixed = db ? { verdict: db.verdict, reason: db.reason } : null;
      // Prefer the DB's clean label over a raw sentence query (e.g. the user
      // typed "is chocolate ok") so the title + share card read naturally.
      const foodLabel = db ? db.label : query;
      logInfo({ food: foodLabel.slice(0, 40), dbVerdict: db?.verdict || 'none', species });

      // Gemini writes the tailored explanation (constrained by the DB verdict).
      let verdict: SafetyVerdict = db?.verdict ?? 'caution';
      let title = '';
      let explanation = '';
      let shareText = '';
      try {
        const v = await generateGeminiJson<{
          verdict: SafetyVerdict;
          title: string;
          explanation: string;
          shareText: string;
        }>(verdictPrompt(foodLabel, pet, fixed, species), undefined, undefined, { requestId: reqId, endpoint: ENDPOINT });
        void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: v.modelUsed, usage: v.usage, requestId: reqId });
        // The database is authoritative — never let the model flip a known verdict.
        verdict = db ? db.verdict : (['safe', 'caution', 'toxic'].includes(v.data?.verdict) ? v.data.verdict : 'caution');
        title = v.data?.title || '';
        explanation = v.data?.explanation || '';
        shareText = v.data?.shareText || '';
      } catch {
        // Fall back to the database facts if the explanation call fails.
        verdict = db?.verdict ?? 'caution';
        title = verdict === 'toxic' ? 'Toxic — do not feed' : verdict === 'caution' ? 'Use caution' : 'Generally safe';
        explanation = db?.reason || "We couldn't fully analyze this — when in doubt, check with your vet.";
      }

      const emoji = verdict === 'safe' ? '✅' : verdict === 'caution' ? '⚠️' : '❌';
      if (!shareText) shareText = `Can ${pet?.name || `my ${species}`} eat ${foodLabel}? ${emoji} ${verdict}.`;

      return {
        food: foodLabel,
        verdict,
        title,
        explanation,
        reason: db?.reason || explanation,
        shareText,
        source: db ? 'database' : 'ai',
      };
    },
  );

  if (error) {
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 200;
    const userMessage = (error as any)?.userMessage as string | undefined;
    if (statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        { success: false, message: userMessage || (error instanceof Error ? error.message : 'Invalid request'), requestId },
        { status: statusCode === 422 ? 200 : statusCode, headers: { 'x-request-id': requestId } },
      );
    }
    return NextResponse.json(
      { success: false, message: 'Safety check temporarily unavailable.', requestId },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
