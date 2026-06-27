/**
 * src/lib/pawme-food-safety.ts
 *
 * Curated food-safety knowledge base for the "Can my dog/cat eat this?" checker
 * (PRD v2 §4.7 "Check"). For well-established dangerous foods the verdict is
 * DETERMINISTIC here — the LLM never gets to "guess" whether chocolate is safe,
 * because a wrong answer is a real harm/liability. Gemini only writes the
 * tailored, plain-English explanation on top of (and constrained by) this
 * verdict, and handles genuinely unlisted items conservatively.
 *
 * Sources: ASPCA Animal Poison Control + veterinary consensus on common
 * human-food hazards for dogs and cats. Guidance, not veterinary advice.
 */

export type SafetyVerdict = 'safe' | 'caution' | 'toxic';
export type SafetySpecies = 'dog' | 'cat' | 'both';

export interface SafetyEntry {
  re: RegExp;
  label: string;
  verdict: 'toxic' | 'caution';
  reason: string;
  species: SafetySpecies;
}

export interface SafetyMatch {
  label: string;
  verdict: SafetyVerdict;
  reason: string;
  source: 'database';
}

// Ordered most-dangerous-first; first match wins. Toxic entries precede caution.
const TOXIC: SafetyEntry[] = [
  { re: /chocolate|cocoa|cacao/i, label: 'Chocolate', verdict: 'toxic', species: 'both', reason: "Contains theobromine and caffeine, which pets can't metabolize — can cause vomiting, seizures and heart problems." },
  { re: /\bgrapes?\b|raisins?|currants?|sultanas?/i, label: 'Grapes & raisins', verdict: 'toxic', species: 'both', reason: 'Can cause sudden kidney failure in dogs, even in small amounts. Avoid entirely.' },
  { re: /xylitol|birch sugar|sugar[-\s]?free|sugarless/i, label: 'Xylitol', verdict: 'toxic', species: 'both', reason: 'A sweetener (gum, peanut butter, baked goods) that triggers dangerous blood-sugar crashes and liver failure in dogs.' },
  { re: /\bonions?\b|\bgarlic\b|chives?|\bleeks?\b|shallots?/i, label: 'Onion, garlic & chives', verdict: 'toxic', species: 'both', reason: 'Damage red blood cells and cause anemia. Cats are especially sensitive; powders/cooked forms count too.' },
  { re: /macadamia/i, label: 'Macadamia nuts', verdict: 'toxic', species: 'dog', reason: 'Cause weakness, vomiting, tremors and overheating in dogs.' },
  { re: /alcohol|\bbeer\b|\bwine\b|liquor|ethanol|spirits/i, label: 'Alcohol', verdict: 'toxic', species: 'both', reason: 'Even small amounts can cause dangerous intoxication, vomiting and breathing trouble.' },
  { re: /caffeine|\bcoffee\b|espresso|energy drink/i, label: 'Caffeine', verdict: 'toxic', species: 'both', reason: 'A stimulant that can cause a racing heart, tremors and seizures.' },
  { re: /raw\s+(bread\s+)?dough|yeast dough/i, label: 'Raw yeast dough', verdict: 'toxic', species: 'both', reason: 'Expands in the stomach and ferments into alcohol — a double danger.' },
  { re: /\bhops\b/i, label: 'Hops', verdict: 'toxic', species: 'dog', reason: 'Can cause life-threatening overheating in dogs.' },
  { re: /\bnutmeg\b/i, label: 'Nutmeg', verdict: 'toxic', species: 'both', reason: 'Contains myristicin, which is toxic in larger amounts.' },
];

const CAUTION: SafetyEntry[] = [
  { re: /avocado/i, label: 'Avocado', verdict: 'caution', species: 'both', reason: 'Persin plus the pit and skin can cause stomach upset or a choking/obstruction risk.' },
  { re: /\bmilk\b|cheese|dairy|ice ?cream|yogurt/i, label: 'Dairy', verdict: 'caution', species: 'both', reason: 'Most adult pets are lactose-intolerant — small amounts of plain yogurt are usually fine, but milk/cheese can cause diarrhea.' },
  { re: /macadamia|\bnuts?\b|almonds?|walnuts?|pecans?|cashews?|pistachios?/i, label: 'Nuts', verdict: 'caution', species: 'both', reason: 'High fat can cause stomach upset or pancreatitis, and some nuts are toxic — best avoided.' },
  { re: /cooked bones?|\bbones?\b/i, label: 'Cooked bones', verdict: 'caution', species: 'both', reason: 'Cooked bones can splinter and cause choking or internal injury. Raw recreational bones carry their own risks.' },
  { re: /\bsalt\b|salty|\bchips\b|pretzels?|crackers?/i, label: 'Salty snacks', verdict: 'caution', species: 'both', reason: 'Too much salt can cause excessive thirst, vomiting, or sodium poisoning.' },
  { re: /cherr(y|ies)|\bpeach|\bplum|apricot|\bnectarine/i, label: 'Stone fruit', verdict: 'caution', species: 'both', reason: 'The pits contain cyanide and are an obstruction risk; a little ripe flesh (no pit) is usually fine.' },
  { re: /raw\s+(egg|fish|meat|chicken)|sushi|sashimi/i, label: 'Raw egg/fish/meat', verdict: 'caution', species: 'both', reason: 'Risk of Salmonella/E. coli and parasites; raw egg whites can also block biotin absorption.' },
  { re: /tomato|eggplant|raw potato|green potato|\brhubarb\b/i, label: 'Nightshades & rhubarb', verdict: 'caution', species: 'both', reason: 'Green/unripe parts and leaves contain solanine/oxalates; ripe, cooked flesh is usually fine in moderation.' },
  { re: /\bfat\b|fatty|fried|\bgrease\b|bacon|sausage/i, label: 'Fatty foods', verdict: 'caution', species: 'both', reason: 'Rich, fatty foods can trigger pancreatitis, especially in smaller or older pets.' },
  { re: /corn\s*cob/i, label: 'Corn on the cob', verdict: 'caution', species: 'both', reason: 'The cob is a serious intestinal-obstruction hazard (the kernels themselves are fine).' },
  { re: /citrus|\blemon|\blime\b|\borange|grapefruit/i, label: 'Citrus', verdict: 'caution', species: 'both', reason: 'Citric acid and oils can upset the stomach in larger amounts.' },
  { re: /bread|dough|baked goods/i, label: 'Bread & baked goods', verdict: 'caution', species: 'both', reason: 'Plain bread in small amounts is low-risk, but watch for xylitol, raisins, chocolate or nuts in baked goods.' },
];

// Commonly-safe-in-moderation foods → a confident "safe" without calling the LLM.
const SAFE: Array<{ re: RegExp; label: string }> = [
  { re: /carrots?/i, label: 'Carrot' },
  { re: /blueberr(y|ies)|strawberr(y|ies)|raspberr(y|ies)/i, label: 'Berries' },
  { re: /\bapples?\b/i, label: 'Apple (no seeds/core)' },
  { re: /banana/i, label: 'Banana' },
  { re: /pumpkin|squash/i, label: 'Pumpkin' },
  { re: /sweet potato|\byam/i, label: 'Sweet potato (cooked)' },
  { re: /green beans?/i, label: 'Green beans' },
  { re: /cucumbers?/i, label: 'Cucumber' },
  { re: /watermelon/i, label: 'Watermelon (no seeds/rind)' },
  { re: /cantaloupe|honeydew|melon/i, label: 'Melon' },
  { re: /\bpears?\b/i, label: 'Pear (no seeds)' },
  { re: /cooked (chicken|turkey)|plain (chicken|turkey)/i, label: 'Plain cooked chicken/turkey' },
  { re: /cooked (salmon|fish)|plain salmon/i, label: 'Cooked salmon' },
  { re: /cooked eggs?|scrambled eggs?|boiled eggs?/i, label: 'Cooked egg' },
  { re: /plain rice|white rice|brown rice/i, label: 'Plain rice' },
  { re: /oatmeal|\boats\b/i, label: 'Plain oatmeal' },
  { re: /peanut butter/i, label: 'Peanut butter (xylitol-free)' },
  { re: /\bcelery\b/i, label: 'Celery' },
  { re: /zucchini|courgette/i, label: 'Zucchini' },
  { re: /broccoli/i, label: 'Broccoli (small amounts)' },
  { re: /spinach|kale/i, label: 'Leafy greens (small amounts)' },
  { re: /\bpeas\b/i, label: 'Peas' },
];

/**
 * Deterministic lookup. Returns the most severe established match (toxic >
 * caution > safe), or null when the food isn't in our curated lists (then the
 * caller asks Gemini, conservatively). `species` lets us scope dog/cat-specific
 * entries (e.g. macadamia/hops are dog-specific).
 */
export function checkFoodSafety(query: string, species?: string): SafetyMatch | null {
  const q = (query || '').toLowerCase().trim();
  if (!q) return null;
  const sp: SafetySpecies = species === 'cat' ? 'cat' : species === 'dog' ? 'dog' : 'both';
  const applies = (e: SafetyEntry) => e.species === 'both' || sp === 'both' || e.species === sp;

  for (const e of TOXIC) if (applies(e) && e.re.test(q)) return { label: e.label, verdict: 'toxic', reason: e.reason, source: 'database' };
  for (const e of CAUTION) if (applies(e) && e.re.test(q)) return { label: e.label, verdict: 'caution', reason: e.reason, source: 'database' };
  for (const s of SAFE) if (s.re.test(q)) return { label: s.label, verdict: 'safe', reason: 'Generally safe for pets in small, plain amounts as an occasional treat.', source: 'database' };
  return null;
}
