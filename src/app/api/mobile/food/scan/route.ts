import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { recordAiUsage } from '@/lib/pawme-cost-tracking';
import { optionalMobileUser } from '@/lib/pawme-mobile';
import { requireWithinFreeTier } from '@/lib/ai-allowance';
import { base64ApproxBytes, runApi } from '@/lib/pawme-logging';
import { scoreFood, type FoodScore } from '@/lib/pawme-food-scoring';

// AI Food Scanner (PRD v2 §4). Reachable pre-signup (hero acquisition feature),
// so we use optionalMobileUser for cost attribution rather than requiring auth.
const ENDPOINT = 'mobile/food/scan';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OPFF_UA = 'PawPilot/2.0 (support@ayvalabs.com)';

interface FoodProduct {
  name: string;
  brand: string;
  ingredientsText: string;
  imageUrl: string | null;
  barcode: string | null;
  source: 'openpetfoodfacts' | 'photo-ocr';
}

interface PetContext {
  name?: string;
  species?: string;
  breed?: string;
  age?: string;
  weight?: string;
  allergies?: string[];
  conditions?: string[];
}

interface ScanResponse {
  product: FoodProduct;
  score: number;
  grade: FoodScore['grade'];
  flags: FoodScore['flags'];
  positives: string[];
  methodologyNote: string;
  verdict: string;
  petConcerns: string[];
  betterOptionsGuidance: string;
}

// ── Open Pet Food Facts barcode lookup (free, open product DB). ───────────────
async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  const url =
    `https://world.openpetfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
    `?fields=product_name,brands,ingredients_text,ingredients_text_en,image_url`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': OPFF_UA }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { status?: number; product?: Record<string, any> };
    if (j.status !== 1 || !j.product) return null;
    const p = j.product;
    const ingredients = (p.ingredients_text_en || p.ingredients_text || '').trim();
    if (!p.product_name && !ingredients) return null;
    return {
      name: p.product_name || 'Unknown product',
      brand: String(p.brands || '').split(',')[0]?.trim() || '',
      ingredientsText: ingredients,
      imageUrl: p.image_url || null,
      barcode,
      source: 'openpetfoodfacts',
    };
  } catch {
    return null; // network/timeout/abort — fall through to photo OCR
  } finally {
    clearTimeout(timer);
  }
}

const OCR_PROMPT = `You are a pet-food label reader. Read this photo of a pet-food package and respond in JSON ONLY (no markdown):
{
  "isPetFood": true or false,
  "productName": "the product name as printed, or empty",
  "brand": "the brand, or empty",
  "ingredientsText": "the FULL ingredient list exactly as printed, comma-separated, or empty if not visible"
}
Set "isPetFood" to false if this is not a pet-food package (e.g. a person, a pet, an unrelated object). Only transcribe the ingredients you can actually read.`;

function petLine(pet?: PetContext): string {
  if (!pet) return 'No pet profile provided — give general guidance.';
  const parts = [
    pet.name ? `name=${pet.name}` : '',
    pet.species ? `species=${pet.species}` : '',
    pet.breed ? `breed=${pet.breed}` : '',
    pet.age ? `age=${pet.age}` : '',
    pet.weight ? `weight=${pet.weight}` : '',
    pet.allergies?.length ? `allergies=${pet.allergies.join('; ')}` : '',
    pet.conditions?.length ? `conditions=${pet.conditions.join('; ')}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No pet details provided — give general guidance.';
}

function verdictPrompt(product: FoodProduct, s: FoodScore, pet?: PetContext): string {
  return `You are a veterinary nutrition assistant. Given a pet food's computed facts and THIS pet's profile, write a short, friendly, plain-English verdict. Respond in JSON ONLY:
{
  "verdict": "2-3 sentences. ALWAYS address the pet by name when a name is given (e.g. 'Bailey'), not 'your dog'. Mention the grade and the main reason, tailored to this pet's breed/age/allergies. Warm, clear, no jargon.",
  "petConcerns": ["each a short specific concern that ties an ingredient to THIS pet's allergies/conditions/age/breed; [] if none"],
  "betterOptionsGuidance": "1-2 sentences on what to look for in a better food for this pet. No brand names."
}

FOOD: ${product.name}${product.brand ? ' by ' + product.brand : ''}
GRADE: ${s.grade} (${s.score}/100)
FLAGGED: ${s.flags.map((f) => f.ingredient).join(', ') || 'none'}
POSITIVES: ${s.positives.join(', ') || 'none'}
INGREDIENTS: ${product.ingredientsText.slice(0, 1500)}
PET: ${petLine(pet)}

Rules: Do NOT contradict the grade/score (it is fixed). If an ingredient matches a listed allergy, you MUST call it out in petConcerns. This is guidance, not veterinary advice.`;
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<ScanResponse>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<ScanResponse> => {
      const { uid } = await optionalMobileUser(request);
      // Free-tier metering — only for signed-in users (anon scans are
      // reachable pre-signup as hero acquisition). When uid is null,
      // requireWithinFreeTier short-circuits to allow.
      await requireWithinFreeTier(uid, 'food-scan');
      const body = await request.json();
      const barcode: string | undefined = body?.barcode ? String(body.barcode).trim() : undefined;
      const imageBase64: string | undefined = body?.imageBase64;
      const pet: PetContext | undefined = body?.petContext;

      if (!barcode && !imageBase64) {
        const err: Error & { statusCode?: number } = new Error('Provide a barcode or an image.');
        err.statusCode = 400;
        throw err;
      }
      if (imageBase64) {
        const bytes = base64ApproxBytes(imageBase64);
        if (bytes > MAX_IMAGE_BYTES) {
          const err: Error & { statusCode?: number } = new Error('Image too large. Max 10MB.');
          err.statusCode = 413;
          throw err;
        }
      }

      // 1) Resolve the product: barcode lookup first, photo OCR fallback.
      let product: FoodProduct | null = null;
      if (barcode) product = await lookupBarcode(barcode);

      if (!product && imageBase64) {
        const ocr = await generateGeminiJson<{
          isPetFood: boolean;
          productName: string;
          brand: string;
          ingredientsText: string;
        }>(OCR_PROMPT, imageBase64, undefined, { requestId: reqId, endpoint: ENDPOINT });
        void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: ocr.modelUsed, usage: ocr.usage, requestId: reqId });

        if (!ocr.data?.isPetFood) {
          const err: Error & { statusCode?: number; userMessage?: string } = new Error('not-pet-food');
          err.statusCode = 422;
          err.userMessage = "That doesn't look like a pet-food label. Try a clear photo of the ingredients panel.";
          throw err;
        }
        const ingredients = (ocr.data.ingredientsText || '').trim();
        if (!ingredients) {
          const err: Error & { statusCode?: number; userMessage?: string } = new Error('no-ingredients');
          err.statusCode = 422;
          err.userMessage = "We couldn't read the ingredients. Try a sharper photo of the ingredients list.";
          throw err;
        }
        product = {
          name: ocr.data.productName || 'Scanned food',
          brand: ocr.data.brand || '',
          ingredientsText: ingredients,
          imageUrl: null,
          barcode: barcode || null,
          source: 'photo-ocr',
        };
      }

      if (!product) {
        // Barcode given but not in the DB, and no photo to fall back on.
        const err: Error & { statusCode?: number; userMessage?: string } = new Error('not-found');
        err.statusCode = 404;
        err.userMessage = "We couldn't find this product. Snap a photo of the ingredients label and we'll read it.";
        throw err;
      }

      // 2) Deterministic score (transparent, not LLM-decided).
      const s = scoreFood({ ingredientsText: product.ingredientsText, productName: product.name, species: pet?.species });
      logInfo({ source: product.source, score: s.score, grade: s.grade, flags: s.flags.length });

      // 3) Pet-tailored plain-English verdict from Gemini.
      let verdict = '';
      let petConcerns: string[] = [];
      let betterOptionsGuidance = '';
      try {
        const v = await generateGeminiJson<{
          verdict: string;
          petConcerns: string[];
          betterOptionsGuidance: string;
        }>(verdictPrompt(product, s, pet), undefined, undefined, { requestId: reqId, endpoint: ENDPOINT });
        void recordAiUsage({ userId: uid, endpoint: ENDPOINT, model: v.modelUsed, usage: v.usage, requestId: reqId });
        verdict = v.data?.verdict || '';
        petConcerns = Array.isArray(v.data?.petConcerns) ? v.data.petConcerns : [];
        betterOptionsGuidance = v.data?.betterOptionsGuidance || '';
      } catch {
        // Verdict is a nice-to-have; the score/flags still stand on their own.
        verdict = `This food grades ${s.grade} (${s.score}/100). See the flagged ingredients below.`;
      }

      return {
        product,
        score: s.score,
        grade: s.grade,
        flags: s.flags,
        positives: s.positives,
        methodologyNote: s.methodologyNote,
        verdict,
        petConcerns,
        betterOptionsGuidance,
      };
    },
  );

  if (error) {
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 200;
    const userMessage = (error as any)?.userMessage as string | undefined;
    if (statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        { success: false, message: userMessage || (error instanceof Error ? error.message : 'Invalid request'), requestId },
        { status: statusCode === 422 || statusCode === 404 ? 200 : statusCode, headers: { 'x-request-id': requestId } },
      );
    }
    return NextResponse.json(
      { success: false, message: 'Food analysis temporarily unavailable.', requestId },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: true, data: result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
