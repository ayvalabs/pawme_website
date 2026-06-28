import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/web/game/event
 *
 * Server-side analytics sink for the public game page. The page also
 * fires GA4 via gtag, but this route persists per-game-session signals so
 * we can attribute referral-chain conversions (web_game_played →
 * referral_from_game) without GA4 export.
 *
 * Body: { event: string, score?: number, ref?: string, anonId?: string,
 *         meta?: object }
 *
 * Special handling for `web_game_played` with `ref` set:
 *   - writes gameInviteRedemptions/{ref}_{anonId} (idempotent) so we don't
 *     double-credit a friend who refreshes the page
 *   - also emits a `referral_from_game` row in gameEvents/
 *
 * No auth (page is public). Throttling left to platform — most plays only
 * fire 2-4 events end-to-end so the route is naturally low-volume.
 */

export const runtime = 'nodejs';

const ALLOWED_EVENTS = new Set([
  'web_game_played',
  'web_game_completed',
  'web_game_cta_click',
  'web_game_share',
]);

function str(v: unknown, max = 64): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = str(body?.event, 48);
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ success: false, message: 'Invalid event.' }, { status: 400 });
    }

    const ref = str(body?.ref, 32);
    const anonId = str(body?.anonId, 64);
    const score = typeof body?.score === 'number' ? Math.max(0, Math.min(100, body.score)) : undefined;
    const meta = (body?.meta && typeof body.meta === 'object') ? body.meta : undefined;

    const now = new Date().toISOString();

    // Persist the raw event for later analysis.
    await adminDb.collection('gameEvents').add({
      event,
      ref: ref ?? null,
      anonId: anonId ?? null,
      score: score ?? null,
      meta: meta ?? null,
      createdAt: now,
    });

    // Attribution: idempotent redemption write on first-play with a ref.
    if (event === 'web_game_played' && ref && anonId) {
      const redemptionId = `${ref}_${anonId}`;
      const redemptionRef = adminDb.collection('gameInviteRedemptions').doc(redemptionId);
      const existing = await redemptionRef.get();
      if (!existing.exists) {
        await redemptionRef.set({
          token: ref,
          anonId,
          redeemedAt: now,
        });
        // Mirror the attribution as its own row so the funnel is queryable.
        await adminDb.collection('gameEvents').add({
          event: 'referral_from_game',
          ref,
          anonId,
          createdAt: now,
        });
      }
    }

    // Score update on completion (best-effort).
    if (event === 'web_game_completed' && ref && anonId && typeof score === 'number') {
      const redemptionId = `${ref}_${anonId}`;
      await adminDb.collection('gameInviteRedemptions').doc(redemptionId).set(
        { score, completedAt: now },
        { merge: true },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[game/event] failed', e);
    // Never block the user-facing page on analytics — return 200.
    return NextResponse.json({ success: true, soft: true });
  }
}
