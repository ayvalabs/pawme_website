/**
 * GET /api/mobile/shop/products
 *
 * Returns Amazon affiliate product recommendations for the mobile Shop
 * tab. Filtered + ranked by pet attributes so we surface relevant items
 * ("Best for <pet name>") instead of generic catalog browsing.
 *
 * Query params:
 *   petId         optional. If provided + caller is authed, we pull
 *                 species/breed/age/weight from Firestore.
 *   species       fallback if no petId — "dog" | "cat" | etc.
 *   lifeStage     fallback — "puppy" | "kitten" | "adult" | "senior"
 *   breedSize     fallback — "small" | "medium" | "large" | "giant"
 *   category      optional — "food" | "toys" | "grooming" | ...
 *   limit         default 20
 *
 * Returns:
 *   {
 *     products: ShopProduct[],
 *     personalizedIntro: string,   // "Best for Bailey, your 3-year-old…"
 *     pet: { name, species, lifeStage, breedSize } | null
 *   }
 *
 * Affiliate URLs are NOT baked in here. The mobile app passes each ASIN
 * back through `/api/mobile/shop/redirect?asin=…` which appends the
 * `pawme-20` Associates tag at click time. That way we can rotate tags
 * or swap to PA-API later without an app update.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi } from '@/lib/pawme-logging';
import { requireMobileUser } from '@/lib/pawme-mobile';
import {
  CATALOG,
  rankProducts,
  type BreedSize,
  type LifeStage,
  type PetSignal,
  type PetSpecies,
  type ProductCategory,
  type ShopProduct,
} from '@/lib/shop-catalog';
import { loadShopProducts } from '@/lib/shop-firestore';

const ENDPOINT = 'mobile/shop/products';

function isSpecies(v: unknown): v is PetSpecies {
  return v === 'dog' || v === 'cat' || v === 'bird' || v === 'rabbit' || v === 'other';
}
function isLifeStage(v: unknown): v is LifeStage {
  return v === 'puppy' || v === 'kitten' || v === 'adult' || v === 'senior';
}
function isBreedSize(v: unknown): v is BreedSize {
  return v === 'small' || v === 'medium' || v === 'large' || v === 'giant';
}
function isCategory(v: unknown): v is ProductCategory {
  return (
    v === 'food' ||
    v === 'treats' ||
    v === 'toys' ||
    v === 'grooming' ||
    v === 'health' ||
    v === 'training' ||
    v === 'travel' ||
    v === 'sleep'
  );
}

interface PetSummary {
  name: string;
  species: PetSpecies;
  lifeStage: LifeStage | null;
  breedSize: BreedSize | null;
  breed?: string;
  weightKg?: number;
  ageYears?: number;
}

/**
 * Bucket a pet into puppy/kitten/adult/senior. Rules of thumb:
 *   - dog under 1y = puppy
 *   - cat under 1y = kitten
 *   - dog over ~8y, cat over ~10y = senior
 *   - everything else = adult
 */
function deriveLifeStage(
  species: PetSpecies | null | undefined,
  ageYears: number | undefined,
): LifeStage | null {
  if (!species || ageYears == null) return null;
  if (species === 'dog') {
    if (ageYears < 1) return 'puppy';
    if (ageYears >= 8) return 'senior';
    return 'adult';
  }
  if (species === 'cat') {
    if (ageYears < 1) return 'kitten';
    if (ageYears >= 10) return 'senior';
    return 'adult';
  }
  return 'adult';
}

/**
 * Bucket a dog by weight into small/medium/large/giant. Cats and small
 * mammals are always 'small'. If no weight, null (no filter applied).
 *   - small:  < 10kg
 *   - medium: 10–25kg
 *   - large:  25–40kg
 *   - giant:  > 40kg
 */
function deriveBreedSize(
  species: PetSpecies | null | undefined,
  weightKg: number | undefined,
): BreedSize | null {
  if (!species) return null;
  if (species !== 'dog') return 'small';
  if (weightKg == null) return null;
  if (weightKg < 10) return 'small';
  if (weightKg < 25) return 'medium';
  if (weightKg < 40) return 'large';
  return 'giant';
}

/**
 * One sentence introducing the picks, personalised to the pet.
 *
 * Deterministic + free — we deliberately do NOT use Gemini here so the
 * Shop tab is fast (one round-trip) and doesn't add per-impression AI
 * cost. If you later want a smarter blurb, swap to /api/mobile/gemini-*.
 */
function buildPersonalizedIntro(pet: PetSummary | null): string {
  if (!pet) {
    return 'Hand-picked PawPilot favourites.';
  }
  const name = pet.name;
  const species = pet.species;
  const stageWords: Record<LifeStage, string> = {
    puppy: 'puppy',
    kitten: 'kitten',
    adult: species === 'cat' ? 'adult cat' : 'adult dog',
    senior: species === 'cat' ? 'senior cat' : 'senior dog',
    '*': species === 'cat' ? 'cat' : 'dog',
  };
  const breed = pet.breed ? ` ${pet.breed}` : '';
  const ageBit = pet.ageYears != null ? `${pet.ageYears}-year-old` : '';
  const stage = pet.lifeStage ? stageWords[pet.lifeStage] : species;
  // Build a natural-sounding phrase. Examples:
  //   "Best for Bailey, your 3-year-old Black Mouth Cur adult dog."
  //   "Best for Smokey, your kitten."
  //   "Best for Luna, your adult cat."
  const subject = [ageBit, breed.trim(), stage].filter(Boolean).join(' ');
  return `Best for ${name}, your ${subject}.`;
}

async function loadPetSummary(
  request: NextRequest,
  url: URL,
  reqId: string,
): Promise<PetSummary | null> {
  const petId = url.searchParams.get('petId') || undefined;
  if (petId) {
    try {
      // Only signed-in users can look up their own pet's signal. If auth
      // fails we silently fall back to the query-string overrides.
      const { uid } = await requireMobileUser(request);
      const snap = await adminDb.collection('pets').doc(petId).get();
      const data = snap.exists ? snap.data() : null;
      if (data && data.userId === uid) {
        // Pet docs store species under `type` (per pawpilot_app's Pet
        // interface). Older docs may use `species`; accept either.
        const rawSpecies = data.type ?? data.species;
        const species = isSpecies(rawSpecies) ? rawSpecies : 'other';

        // Age: try explicit ageYears + ageMonths first, then fall back to
        // computing it from `birthday`. Older docs may have only one or
        // the other; we want to give the personalization engine a signal
        // either way.
        let ageYears: number | undefined;
        if (typeof data.ageYears === 'number') {
          const months =
            typeof data.ageMonths === 'number' ? data.ageMonths : 0;
          ageYears = data.ageYears + months / 12;
        } else if (typeof data.birthday === 'string' && data.birthday) {
          const ms = Date.parse(data.birthday);
          if (!Number.isNaN(ms)) {
            const years = (Date.now() - ms) / (365.25 * 24 * 60 * 60 * 1000);
            if (years >= 0 && years < 60) ageYears = years;
          }
        }

        // Weight: prefer numeric weightKg, fall back to parsing the
        // display "weight" string (e.g. "30.5 kg" → 30.5).
        let weightKg: number | undefined;
        if (typeof data.weightKg === 'number') {
          weightKg = data.weightKg;
        } else if (typeof data.weight === 'string') {
          const m = data.weight.match(/(\d+(?:\.\d+)?)/);
          if (m) {
            const n = parseFloat(m[1]);
            if (Number.isFinite(n) && n > 0) weightKg = n;
          }
        }

        const breed = typeof data.breed === 'string' ? data.breed : undefined;
        const name =
          (typeof data.name === 'string' && data.name.trim()) || 'your pet';
        return {
          name,
          species,
          lifeStage: deriveLifeStage(species, ageYears),
          breedSize: deriveBreedSize(species, weightKg),
          breed,
          weightKg,
          ageYears: ageYears != null ? Math.round(ageYears) : undefined,
        };
      }
    } catch {
      // fall through to query-string fallback
    }
  }

  // Anonymous / query-string fallback. Useful before signup or for
  // testing without an auth token.
  const qSpecies = url.searchParams.get('species');
  if (!qSpecies || !isSpecies(qSpecies)) {
    logApi('info', {
      requestId: reqId,
      endpoint: ENDPOINT,
      event: 'shop-no-pet-signal',
    });
    return null;
  }
  const qStage = url.searchParams.get('lifeStage');
  const qSize = url.searchParams.get('breedSize');
  const qName = url.searchParams.get('name') || 'your pet';
  return {
    name: qName,
    species: qSpecies,
    lifeStage: isLifeStage(qStage) ? qStage : null,
    breedSize: isBreedSize(qSize) ? qSize : null,
  };
}

export async function GET(request: NextRequest) {
  const { requestId, result, error } = await runApi<{
    products: ShopProduct[];
    personalizedIntro: string;
    pet: PetSummary | null;
  }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }) => {
      const url = new URL(request.url);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20),
      );
      const catRaw = url.searchParams.get('category');
      const category = isCategory(catRaw) ? catRaw : undefined;
      // "all=true" → bypass pet tailoring (the "Show all products" toggle).
      const allRaw = url.searchParams.get('all');
      const all = allRaw === 'true' || allRaw === '1';

      const pet = await loadPetSummary(request, url, reqId);
      const signal: PetSignal = {
        species: pet?.species ?? null,
        lifeStage: pet?.lifeStage ?? null,
        breedSize: pet?.breedSize ?? null,
        breedTags: null,
      };

      // First-party Firestore catalog (real AI images, inStock flags);
      // fall back to the static CATALOG if Firestore is empty/unreachable.
      const firestore = await loadShopProducts();
      const source = firestore.length > 0 ? firestore : CATALOG;
      const products = rankProducts(source, signal, { category, limit, all });

      logInfo({
        catalogSize: source.length,
        fromFirestore: firestore.length > 0,
        all,
        returned: products.length,
        species: signal.species,
        lifeStage: signal.lifeStage,
        breedSize: signal.breedSize,
        category,
      });

      return {
        products,
        personalizedIntro: buildPersonalizedIntro(pet),
        pet,
      };
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), requestId },
      { status: 500 },
    );
  }
  return NextResponse.json(result);
}
