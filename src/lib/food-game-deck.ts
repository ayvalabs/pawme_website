/**
 * Web deck for the food-swipe viral game.
 *
 * Mirrors pawme_app/src/data/foodGameDeck.ts so the web page is fully
 * self-contained. Keep the two files in sync when content changes — the
 * "experience parity" is part of the viral loop (friend plays the same
 * game on the web that the inviter played in the app).
 */

import type { FoodCard } from './game-types';

export const FOOD_GAME_DECK: FoodCard[] = [
  // ── DOGS ───────────────────────────────────────────────────────────────
  { id: 'd-choc',    food: 'Chocolate',     emoji: '🍫', species: 'dog',  answer: 'avoid', why: 'Theobromine is toxic to dogs — even small amounts can cause vomiting or seizures.' },
  { id: 'd-grape',   food: 'Grapes',        emoji: '🍇', species: 'dog',  answer: 'avoid', why: 'Grapes (and raisins) can cause sudden kidney failure in dogs.' },
  { id: 'd-onion',   food: 'Onion',         emoji: '🧅', species: 'dog',  answer: 'avoid', why: 'Damages red blood cells — leads to anemia. Garlic and chives are the same risk.' },
  { id: 'd-xyli',    food: 'Xylitol (sugar-free gum)', emoji: '🍬', species: 'dog', answer: 'avoid', why: 'Triggers a massive insulin spike — life-threatening hypoglycemia within minutes.' },
  { id: 'd-avo',     food: 'Avocado',       emoji: '🥑', species: 'dog',  answer: 'avoid', why: 'Persin in the pit and skin is mildly toxic; small flesh amounts are usually fine but still skip.' },
  { id: 'd-mac',     food: 'Macadamia nuts', emoji: '🌰', species: 'dog', answer: 'avoid', why: 'Causes weakness, tremors, hyperthermia — mechanism is still poorly understood.' },
  { id: 'd-cooked-bone', food: 'Cooked chicken bones', emoji: '🍗', species: 'dog', answer: 'avoid', why: 'Splinter into sharp shards that can perforate the intestine.' },
  { id: 'd-coffee',  food: 'Coffee',        emoji: '☕', species: 'dog',  answer: 'avoid', why: 'Caffeine is far more toxic to dogs than humans — same family as theobromine.' },
  { id: 'd-blue',    food: 'Blueberries',   emoji: '🫐', species: 'dog',  answer: 'safe',  why: 'Antioxidant-rich, low-cal — popular in dog treats. Fine in moderation.' },
  { id: 'd-carrot',  food: 'Carrots',       emoji: '🥕', species: 'dog',  answer: 'safe',  why: 'Great crunchy low-cal snack. Raw or cooked, both fine.' },
  { id: 'd-pb',      food: 'Peanut butter (no xylitol)', emoji: '🥜', species: 'dog', answer: 'safe', why: 'Check the label — no xylitol = safe and dogs love it.' },
  { id: 'd-pumpkin', food: 'Plain pumpkin', emoji: '🎃', species: 'dog',  answer: 'safe',  why: 'Plain canned (not pie filling) is a great fiber source — helps with mild stomach upset.' },

  // ── CATS ───────────────────────────────────────────────────────────────
  { id: 'c-milk',    food: 'Cow milk',      emoji: '🥛', species: 'cat',  answer: 'avoid', why: 'Most cats are lactose intolerant. The kitten-with-milk-bowl image is a myth.' },
  { id: 'c-onion',   food: 'Onion',         emoji: '🧅', species: 'cat',  answer: 'avoid', why: 'Even more sensitive than dogs — destroys red blood cells.' },
  { id: 'c-tuna-raw', food: 'Raw tuna daily', emoji: '🐟', species: 'cat', answer: 'avoid', why: 'High mercury + can cause thiamine deficiency if it\'s the main food. Cooked, occasional treat is OK.' },
  { id: 'c-dog-food', food: 'Dog food',     emoji: '🥣', species: 'cat',  answer: 'avoid', why: 'Lacks taurine — cats develop heart disease without it. Different formulas for a reason.' },
  { id: 'c-cooked-chx', food: 'Plain cooked chicken', emoji: '🍗', species: 'cat', answer: 'safe', why: 'High-protein, easy to digest, low calorie — the gold standard treat.' },
  { id: 'c-egg',     food: 'Scrambled egg', emoji: '🥚', species: 'cat',  answer: 'safe',  why: 'Cooked egg is a great occasional protein boost — never raw (Salmonella + biotin block).' },

  // ── BOTH ───────────────────────────────────────────────────────────────
  { id: 'b-bread',   food: 'Raw bread dough', emoji: '🍞', species: 'both', answer: 'avoid', why: 'Ferments in the stomach — bloating + alcohol poisoning. Baked bread in tiny amounts is fine.' },
  { id: 'b-rice',    food: 'Plain rice (cooked)', emoji: '🍚', species: 'both', answer: 'safe', why: 'Bland, easy on the stomach — vets often recommend it for digestive upset.' },
];
