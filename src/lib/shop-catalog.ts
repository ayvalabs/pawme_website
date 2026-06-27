/**
 * src/lib/shop-catalog.ts
 *
 * Curated Amazon affiliate product catalog. Hand-picked so we can ship
 * the Shop tab today without waiting on Amazon's Product Advertising API
 * (which requires 3 qualifying sales in 180 days to keep access).
 *
 * Replace ASINs with real Amazon product IDs you want to promote. Each
 * URL gets the `pawme-20` Associates tag injected at request time by
 * `/api/shop/redirect`, so the user clicks an opaque app URL and lands
 * on Amazon with proper attribution.
 *
 * Hybrid plan: when you're approved for PA-API 5.0, swap this file's
 * `getProducts()` for a PA-API call — same input/output shape — and the
 * mobile app needs zero changes.
 *
 * Personalization fields drive matching:
 *   species:    which pet types this product is for
 *   lifeStage:  puppy / kitten / adult / senior — '*' = any
 *   breedSize:  small / medium / large / giant — '*' = any
 *   breedTags:  optional breed-specific tags (e.g. "brachycephalic" for
 *               flat-faced breeds, "long-coat" for grooming products)
 */

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type LifeStage = 'puppy' | 'kitten' | 'adult' | 'senior' | '*';
export type BreedSize = 'small' | 'medium' | 'large' | 'giant' | '*';
export type ProductCategory =
  | 'food'
  | 'treats'
  | 'toys'
  | 'grooming'
  | 'health'
  | 'training'
  | 'travel'
  | 'sleep';

export interface ShopProduct {
  /** Amazon Standard Identification Number (10-char). Use real ASINs. */
  asin: string;
  title: string;
  /** Short tagline — appears under the title on the product card. */
  tagline: string;
  /** Image URL — Amazon CDN, e.g. https://m.media-amazon.com/images/I/<id>._SL500_.jpg */
  imageUrl: string;
  /** Display price hint like "$24.99". Real price will be on Amazon. */
  priceHint: string;
  /**
   * Optional explicit merchant destination URL. When omitted, clicks fall
   * back to an Amazon search for `title` (see destinationFor()). Set this
   * to point a product at an exact merchant page (Chewy, Walmart, etc.) —
   * the Skimlinks aggregator monetises whichever merchant it lands on.
   */
  url?: string;
  category: ProductCategory;
  /** Which species this is suitable for. */
  species: PetSpecies[];
  /** Which life stages benefit from this. */
  lifeStage: LifeStage[];
  /** Which breed sizes. */
  breedSize: BreedSize[];
  /** Optional breed-specific tags ("brachycephalic", "long-coat", "anxious"). */
  breedTags?: string[];
  /** Why we recommend it — surfaced in the personalized description. */
  whyItFits: string;
  /**
   * Short benefit phrase for the recommendation carousel, e.g. "relax and
   * sleep more soundly" → "Could help <pet> relax and sleep more soundly."
   */
  benefit?: string;
  /**
   * Whether the item is currently purchasable. First-party catalog items
   * ship as `false` ("coming soon" / remind-me) until affiliate or direct
   * commerce is live. Undefined is treated as in stock (static catalog).
   */
  inStock?: boolean;
}

// Replace these ASINs with real product IDs from your Amazon Associates
// dashboard. The structure below is the input the personalization API
// expects; the actual SKUs are placeholders so you can ship a complete
// pipeline before content review.
export const CATALOG: ShopProduct[] = [
  // ── FOOD ──────────────────────────────────────────────────────────
  {
    asin: 'B001QCKS4O',
    title: "Purina Pro Plan SAVOR Adult Shredded Blend Chicken & Rice",
    tagline: 'Vet-recommended dry food for adult dogs',
    imageUrl: 'https://m.media-amazon.com/images/I/81qHzCSqGML._SL500_.jpg',
    priceHint: '$54.99',
    category: 'food',
    species: ['dog'],
    lifeStage: ['adult', 'senior'],
    breedSize: ['small', 'medium', 'large'],
    whyItFits: 'High-protein recipe trusted by US vets for adult dogs of every size.',
  },
  {
    asin: 'B002OY0Q9K',
    title: "Purina Pro Plan Puppy Chicken & Rice",
    tagline: 'DHA-rich puppy formula for brain & vision',
    imageUrl: 'https://m.media-amazon.com/images/I/81FCSqMLNFL._SL500_.jpg',
    priceHint: '$44.99',
    category: 'food',
    species: ['dog'],
    lifeStage: ['puppy'],
    breedSize: ['small', 'medium', 'large'],
    whyItFits: 'DHA from fish oil supports brain and vision development through the first year.',
  },
  {
    asin: 'B003MA3AW0',
    title: 'Hill’s Science Diet Adult Indoor Cat Chicken Recipe',
    tagline: 'Low-cal kibble for indoor cats',
    imageUrl: 'https://m.media-amazon.com/images/I/81DhKqZGS8L._SL500_.jpg',
    priceHint: '$38.99',
    category: 'food',
    species: ['cat'],
    lifeStage: ['adult'],
    breedSize: ['*'],
    whyItFits: 'Optimised calories and natural fibre for indoor cats with lower activity.',
  },

  // ── TREATS ────────────────────────────────────────────────────────
  {
    asin: 'B006W6YHHI',
    title: 'Greenies Original Regular Dental Dog Treats',
    tagline: 'Daily dental chew, vet-recommended',
    imageUrl: 'https://m.media-amazon.com/images/I/91U7iIp2eFL._SL500_.jpg',
    priceHint: '$26.99',
    category: 'treats',
    species: ['dog'],
    lifeStage: ['adult', 'senior'],
    breedSize: ['medium', 'large'],
    whyItFits: 'Helps reduce tartar and freshen breath — a daily chew that doubles as a treat.',
  },
  {
    asin: 'B00IOTB7PG',
    title: 'Temptations Classic Cat Treats Tasty Chicken',
    tagline: 'Bag-rattle treat cats come running for',
    imageUrl: 'https://m.media-amazon.com/images/I/91vG5w2Jw1L._SL500_.jpg',
    priceHint: '$8.49',
    category: 'treats',
    species: ['cat'],
    lifeStage: ['*'],
    breedSize: ['*'],
    whyItFits: 'Crunchy outside, soft inside — the universal cat reward for training and bonding.',
  },

  // ── TOYS ──────────────────────────────────────────────────────────
  {
    asin: 'B0002AR0I8',
    title: 'KONG Classic Dog Toy',
    tagline: 'Stuff with treats for hours of focus',
    imageUrl: 'https://m.media-amazon.com/images/I/81cmYpu2GqL._SL500_.jpg',
    priceHint: '$14.99',
    category: 'toys',
    species: ['dog'],
    lifeStage: ['*'],
    breedSize: ['small', 'medium', 'large', 'giant'],
    whyItFits: 'The benchmark enrichment toy — fillable, bouncy, and almost indestructible.',
  },
  {
    asin: 'B006XE35YU',
    title: 'Petstages Catnip Plaque Away Pretzel',
    tagline: 'Catnip-infused dental toy',
    imageUrl: 'https://m.media-amazon.com/images/I/71XbAvqK5kL._SL500_.jpg',
    priceHint: '$5.99',
    category: 'toys',
    species: ['cat'],
    lifeStage: ['*'],
    breedSize: ['*'],
    whyItFits: 'Doubles as a dental chew and a catnip toy — mental stim plus tartar control.',
  },

  // ── GROOMING ──────────────────────────────────────────────────────
  {
    asin: 'B07MZDTG76',
    title: 'FURminator Undercoat deShedding Tool',
    tagline: 'Reduces shedding up to 90%',
    imageUrl: 'https://m.media-amazon.com/images/I/71m4VTYBQML._SL500_.jpg',
    priceHint: '$36.99',
    category: 'grooming',
    species: ['dog', 'cat'],
    lifeStage: ['*'],
    breedSize: ['medium', 'large', 'giant'],
    breedTags: ['long-coat', 'double-coat'],
    whyItFits: 'Cuts undercoat shedding dramatically — ideal for medium-to-long-coated breeds.',
  },
  {
    asin: 'B00LNEDDLA',
    title: 'Earthbath Oatmeal & Aloe Shampoo',
    tagline: 'Gentle, soap-free coat care',
    imageUrl: 'https://m.media-amazon.com/images/I/71X3yHfZyYL._SL500_.jpg',
    priceHint: '$12.49',
    category: 'grooming',
    species: ['dog'],
    lifeStage: ['*'],
    breedSize: ['*'],
    whyItFits: 'pH-balanced and tear-free — safe for dogs with dry or sensitive skin.',
  },

  // ── HEALTH ────────────────────────────────────────────────────────
  {
    asin: 'B003ULL1NQ',
    title: 'Nutramax Cosequin Joint Health Supplement (Dogs)',
    tagline: 'Glucosamine + chondroitin chews',
    imageUrl: 'https://m.media-amazon.com/images/I/81Sb1q8t6oL._SL500_.jpg',
    priceHint: '$38.99',
    category: 'health',
    species: ['dog'],
    lifeStage: ['adult', 'senior'],
    breedSize: ['medium', 'large', 'giant'],
    whyItFits: 'Joint-support chews recommended for medium-to-large breeds prone to hip / elbow issues.',
  },
  {
    asin: 'B00RZDXA7K',
    title: 'Virbac C.E.T. Enzymatic Toothpaste (Poultry)',
    tagline: 'Daily dental care, no rinsing',
    imageUrl: 'https://m.media-amazon.com/images/I/71nbqr5oVWL._SL500_.jpg',
    priceHint: '$10.99',
    category: 'health',
    species: ['dog', 'cat'],
    lifeStage: ['*'],
    breedSize: ['*'],
    whyItFits: 'Vet-favourite enzyme paste that controls plaque without water rinsing.',
  },

  // ── TRAINING ──────────────────────────────────────────────────────
  {
    asin: 'B00074L4RW',
    title: 'PetSafe Gentle Leader Headcollar',
    tagline: 'No-pull headcollar for leash training',
    imageUrl: 'https://m.media-amazon.com/images/I/71kKbpcjJ5L._SL500_.jpg',
    priceHint: '$24.99',
    category: 'training',
    species: ['dog'],
    lifeStage: ['adult', 'senior'],
    breedSize: ['medium', 'large', 'giant'],
    whyItFits: 'Stops pulling without pain or pressure on the neck — gold standard for leash training.',
  },
  {
    asin: 'B0010B8CHG',
    title: 'PetSafe Treat & Train Remote Reward Trainer',
    tagline: 'Remote treat dispenser for shaping behaviour',
    imageUrl: 'https://m.media-amazon.com/images/I/81wD3xMrqaL._SL500_.jpg',
    priceHint: '$169.99',
    category: 'training',
    species: ['dog'],
    lifeStage: ['*'],
    breedSize: ['*'],
    whyItFits: 'Pair with PawPilot AI Training sessions — timed rewards reinforce sit / stay / settle.',
  },

  // ── TRAVEL ────────────────────────────────────────────────────────
  {
    asin: 'B07GPKK1RR',
    title: 'AmazonBasics Premium Folding Portable Soft Pet Crate',
    tagline: 'Foldable carrier with mesh windows',
    imageUrl: 'https://m.media-amazon.com/images/I/81kvOzS9bxL._SL500_.jpg',
    priceHint: '$42.99',
    category: 'travel',
    species: ['dog', 'cat'],
    lifeStage: ['*'],
    breedSize: ['small', 'medium'],
    whyItFits: 'Folds flat for car trips and vet visits — zip mesh keeps anxious pets secure.',
  },

  // ── SLEEP ─────────────────────────────────────────────────────────
  {
    asin: 'B08CXGYW1Q',
    title: 'Bedsure Calming Donut Pet Bed',
    tagline: 'Anti-anxiety raised-edge bed',
    imageUrl: 'https://m.media-amazon.com/images/I/71YO6L0Z47L._SL500_.jpg',
    priceHint: '$32.99',
    category: 'sleep',
    species: ['dog', 'cat'],
    lifeStage: ['*'],
    breedSize: ['small', 'medium', 'large'],
    breedTags: ['anxious'],
    whyItFits: 'The raised donut shape supports neck-curling sleep posture cats and small dogs prefer.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Filtering + ranking
// ─────────────────────────────────────────────────────────────────────

export interface PetSignal {
  species?: PetSpecies | null;
  /** "puppy" / "kitten" / "adult" / "senior" computed by caller from birthday. */
  lifeStage?: LifeStage | null;
  /** "small" / "medium" / "large" / "giant" — computed by caller from weight or breed. */
  breedSize?: BreedSize | null;
  /** Free-form breed tags ("long-coat", "brachycephalic", etc.) */
  breedTags?: string[] | null;
}

/**
 * Filter the catalog to products suitable for a given pet, ranked by
 * match score. Products are NOT filtered out for partial mismatches —
 * we still return them with lower rank so the Shop tab always has
 * enough variety to show.
 */
export function filterAndRankProducts(
  pet: PetSignal,
  opts?: { category?: ProductCategory; limit?: number; all?: boolean },
): ShopProduct[] {
  return rankProducts(CATALOG, pet, opts);
}

/**
 * Rank an arbitrary product list (e.g. loaded from Firestore) for a pet.
 *
 * `opts.all` = true bypasses pet tailoring: every product in the category
 * is returned (still score-sorted for a sensible order). This backs the
 * "Show all products" toggle. Without it, products are tailored to the
 * pet and a hard species mismatch is dropped.
 */
export function rankProducts(
  products: ShopProduct[],
  pet: PetSignal,
  opts?: { category?: ProductCategory; limit?: number; all?: boolean },
): ShopProduct[] {
  const limit = opts?.limit ?? 20;
  const wantCat = opts?.category;
  const all = opts?.all ?? false;

  return products
    .filter((p) => (wantCat ? p.category === wantCat : true))
    .map((p) => ({ product: p, score: all ? 1 : scoreProduct(p, pet) }))
    // In tailored mode drop hard mismatches; in "all" mode keep everything.
    .filter((r) => all || r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.product);
}

function scoreProduct(p: ShopProduct, pet: PetSignal): number {
  let score = 1; // baseline so unrelated products still appear

  if (pet.species) {
    if (p.species.includes(pet.species)) score += 10;
    else return 0; // hard species mismatch — never show cat toys for a dog
  }

  if (pet.lifeStage) {
    if (p.lifeStage.includes('*') || p.lifeStage.includes(pet.lifeStage)) {
      score += 4;
    }
  }
  if (pet.breedSize) {
    if (p.breedSize.includes('*') || p.breedSize.includes(pet.breedSize)) {
      score += 3;
    }
  }
  if (pet.breedTags && p.breedTags && p.breedTags.length > 0) {
    const overlap = p.breedTags.filter((t) => pet.breedTags!.includes(t)).length;
    score += overlap * 2;
  }
  return score;
}
