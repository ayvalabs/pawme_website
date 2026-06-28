import type { Metadata } from 'next';
import FoodSwipeWebGame from './FoodSwipeWebGame';

/**
 * /play/food-swipe — public, mobile-first viral game page.
 *
 * Server component shell: sets OG tags so the share link previews well in
 * iMessage / Twitter / WhatsApp, then renders the client-side game.
 *
 * URL params:
 *   ?ref=<token>  the inviter's token (attribution chain).
 *
 * Phase 2 of PRD-viral-games.md — the actual viral mechanic (web playable
 * with no app install required, then install CTA at the end). Phase 1 (the
 * in-app version) lives in pawme_app/src/screens/games/FoodSwipeGame.tsx.
 */

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Can your pet eat this? — PawMe',
  description: "Quick 60s game. How well do you know what's safe for your dog or cat?",
  openGraph: {
    title: 'Can your pet eat this? — PawMe',
    description: "Quick 60s game. How well do you know what's safe for your dog or cat?",
    images: ['https://api.ayvalabs.com/og/play-food-swipe.png'],
    type: 'website',
    url: 'https://api.ayvalabs.com/play/food-swipe',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Can your pet eat this? — PawMe',
    description: "Quick 60s game. How well do you know what's safe for your dog or cat?",
    images: ['https://api.ayvalabs.com/og/play-food-swipe.png'],
  },
};

interface PageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function PlayFoodSwipePage({ searchParams }: PageProps) {
  const { ref } = await searchParams;
  // Validate ref shape server-side so we don't pass garbage to the client.
  const cleanRef = (typeof ref === 'string' && /^[A-Za-z0-9_-]{6,32}$/.test(ref)) ? ref : undefined;

  return <FoodSwipeWebGame initialRef={cleanRef} />;
}
