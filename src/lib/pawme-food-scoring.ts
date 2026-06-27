/**
 * src/lib/pawme-food-scoring.ts
 *
 * Transparent, deterministic pet-food quality scoring for the v2 AI Food
 * Scanner. The SCORE is computed here (not by the LLM) so it's explainable and
 * stable — Gemini only writes the plain-English, pet-tailored explanation on
 * top of these facts (see /api/mobile/food/scan).
 *
 * Methodology (documented = trust = differentiation, per PRD §4.3):
 *   start at 100, subtract for harmful additives and low-quality fillers/
 *   by-products, subtract if the first ingredient isn't a named whole protein,
 *   add a little for positive markers. Clamp 0–100 → letter grade A–F.
 *
 * Inputs come from Open Pet Food Facts (barcode) or Gemini label OCR (photo).
 */

export type FoodGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type FlagSeverity = 'harmful' | 'low-quality';

export interface FoodFlag {
  ingredient: string;
  reason: string;
  severity: FlagSeverity;
}

export interface FoodScore {
  score: number; // 0–100
  grade: FoodGrade;
  flags: FoodFlag[];
  positives: string[];
  methodologyNote: string;
}

export interface ScoreInput {
  ingredientsText?: string | null;
  productName?: string | null;
  species?: 'dog' | 'cat' | string | null;
}

// ── Harmful additives: each match is a heavy penalty. Keyword -> reason. ──────
const HARMFUL: Array<{ re: RegExp; label: string; reason: string }> = [
  { re: /\bBHA\b|butylated hydroxyanisole/i, label: 'BHA', reason: 'Preservative classified as a possible carcinogen.' },
  { re: /\bBHT\b|butylated hydroxytoluene/i, label: 'BHT', reason: 'Controversial preservative; restricted in some countries.' },
  { re: /\bTBHQ\b/i, label: 'TBHQ', reason: 'Petroleum-derived preservative with safety concerns.' },
  { re: /ethoxyquin/i, label: 'Ethoxyquin', reason: 'Controversial preservative (often hidden in fish meal).' },
  { re: /propylene glycol/i, label: 'Propylene glycol', reason: 'Banned by the FDA in cat food; humectant.' },
  { re: /carrageenan/i, label: 'Carrageenan', reason: 'Thickener linked to gut inflammation in studies.' },
  { re: /\b(red|yellow|blue)\s*#?\s*\d+\b|artificial colou?r|fd&c/i, label: 'Artificial color', reason: 'Synthetic dye with no nutritional value.' },
  { re: /menadione|vitamin k3/i, label: 'Menadione (Vit K3)', reason: 'Synthetic vitamin K form flagged in several studies.' },
  { re: /melamine/i, label: 'Melamine', reason: 'Contaminant linked to past pet-food recalls.' },
  { re: /\bMSG\b|monosodium glutamate/i, label: 'MSG', reason: 'Flavor enhancer; unnecessary in pet food.' },
  { re: /corn syrup|added sugar|\bsucrose\b/i, label: 'Added sugar', reason: 'Unnecessary sugar; promotes weight gain.' },
];

// ── Low-quality fillers / vague rendered ingredients: moderate penalty. ───────
const LOW_QUALITY: Array<{ re: RegExp; label: string; reason: string }> = [
  { re: /by[-\s]?products?/i, label: 'By-products', reason: 'Vague, lower-quality protein source.' },
  { re: /meat and bone meal|animal digest|animal fat\b(?!.*\((chicken|beef|pork)\))/i, label: 'Unnamed animal source', reason: 'Generic rendered ingredient of unknown origin.' },
  { re: /corn gluten meal|ground (yellow )?corn|\bcorn\b/i, label: 'Corn', reason: 'Cheap filler / common allergen.' },
  { re: /wheat gluten|\bwheat\b/i, label: 'Wheat', reason: 'Filler / common allergen.' },
  { re: /soybean meal|\bsoy\b/i, label: 'Soy', reason: 'Filler / common allergen.' },
  { re: /\bcellulose\b/i, label: 'Cellulose', reason: 'Powdered fiber filler (often wood pulp).' },
  { re: /brewers rice/i, label: 'Brewers rice', reason: 'Milling by-product used as filler.' },
];

const NAMED_PROTEINS = [
  'chicken', 'beef', 'salmon', 'turkey', 'lamb', 'duck', 'venison', 'bison',
  'whitefish', 'fish', 'tuna', 'herring', 'rabbit', 'pork', 'trout', 'mackerel',
  'sardine', 'cod', 'quail', 'goat', 'kangaroo',
];

const POSITIVE: Array<{ re: RegExp; label: string }> = [
  { re: /\bdeboned\b/i, label: 'Deboned whole-meat first ingredient' },
  { re: /probiotic|lactobacillus|bifidobacterium/i, label: 'Added probiotics' },
  { re: /glucosamine|chondroitin/i, label: 'Joint support (glucosamine/chondroitin)' },
  { re: /omega[-\s]?3|fish oil|flaxseed/i, label: 'Omega-3 fatty acids' },
  { re: /no artificial|grain[-\s]?free|human[-\s]?grade/i, label: 'Clean-label claim' },
  { re: /taurine/i, label: 'Taurine (heart/eye health)' },
];

function firstIngredientIsNamedProtein(ingredientsText: string): boolean {
  const first = ingredientsText
    .split(/[,(]/)[0]
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .trim();
  return NAMED_PROTEINS.some((p) => first.includes(p)) && !/by[-\s]?product|meal\b/.test(first);
}

export function gradeFor(score: number): FoodGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

const HARMFUL_PENALTY = 12;
const LOW_QUALITY_PENALTY = 6;
const NO_PROTEIN_FIRST_PENALTY = 10;
const MAX_HARMFUL_PENALTY = 60;
const MAX_LOW_QUALITY_PENALTY = 30;

/**
 * Score a pet food from its ingredient list. Returns a 0–100 score, A–F grade,
 * the flagged ingredients (with reasons), and positive markers found. If the
 * ingredient list is missing/empty we return a neutral, low-confidence result
 * rather than a fake score.
 */
export function scoreFood(input: ScoreInput): FoodScore {
  const text = (input.ingredientsText || '').trim();

  if (!text) {
    return {
      score: 0,
      grade: 'F',
      flags: [],
      positives: [],
      methodologyNote:
        "We couldn't read this product's ingredient list, so we can't grade it yet. Try scanning the ingredients label.",
    };
  }

  const flags: FoodFlag[] = [];
  const seen = new Set<string>();

  let harmfulPenalty = 0;
  for (const h of HARMFUL) {
    if (h.re.test(text) && !seen.has(h.label)) {
      seen.add(h.label);
      flags.push({ ingredient: h.label, reason: h.reason, severity: 'harmful' });
      harmfulPenalty += HARMFUL_PENALTY;
    }
  }
  harmfulPenalty = Math.min(harmfulPenalty, MAX_HARMFUL_PENALTY);

  let lowPenalty = 0;
  for (const l of LOW_QUALITY) {
    if (l.re.test(text) && !seen.has(l.label)) {
      seen.add(l.label);
      flags.push({ ingredient: l.label, reason: l.reason, severity: 'low-quality' });
      lowPenalty += LOW_QUALITY_PENALTY;
    }
  }
  lowPenalty = Math.min(lowPenalty, MAX_LOW_QUALITY_PENALTY);

  const positives: string[] = [];
  for (const p of POSITIVE) {
    if (p.re.test(text)) positives.push(p.label);
  }

  const proteinFirst = firstIngredientIsNamedProtein(text);
  if (proteinFirst) positives.unshift('Named whole protein as the first ingredient');

  let score = 100 - harmfulPenalty - lowPenalty;
  if (!proteinFirst) score -= NO_PROTEIN_FIRST_PENALTY;
  score += Math.min(positives.length * 2, 6); // small bonus, capped
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    grade: gradeFor(score),
    flags,
    positives,
    methodologyNote:
      'Score starts at 100; harmful additives (−12 each) and low-quality fillers/by-products (−6 each) subtract, ' +
      'a non-protein first ingredient subtracts 10, and positive markers add a little. Guidance only — not veterinary advice.',
  };
}
