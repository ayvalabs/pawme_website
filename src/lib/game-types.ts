/**
 * Shared types for the viral games infrastructure.
 *
 * Phase 2 (web playable + friend invite loop) lives in
 * src/app/play/* and src/app/api/web/game/*. Phase 1 (in-app version)
 * lives in pawme_app/src/screens/games/FoodSwipeGame.tsx — the deck content
 * is mirrored here in food-game-deck.ts so the web page is self-contained.
 */

export type SwipeAnswer = 'safe' | 'avoid';
export type Species = 'dog' | 'cat' | 'both';

export interface FoodCard {
  id: string;
  food: string;
  emoji: string;
  species: Species;
  answer: SwipeAnswer;
  why: string;
}

export interface GameInviteDoc {
  token: string;
  createdAt: string;
  parentToken?: string;
  ipHash?: string;
}

export interface GameInviteRedemptionDoc {
  token: string;       // the inviter's token (parent)
  anonId: string;      // the player's anonymous identifier
  redeemedAt: string;
  score?: number;
}
