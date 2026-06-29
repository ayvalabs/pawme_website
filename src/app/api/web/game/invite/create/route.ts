import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/web/game/invite/create
 *
 * Mints a fresh `token` for a viral game share link. Public (no auth) —
 * throttled by IP (max 20/hour) to mitigate abuse.
 *
 * Body (optional): { parentToken?: string }  — the inviter's token; this
 * chains attribution so we can credit the original referrer when a
 * friend-of-a-friend completes a play.
 *
 * Response: { token, url }  — url is the full share link the client can
 * copy / share.
 */

export const runtime = 'nodejs';

const THROTTLE_WINDOW_MS = 60 * 60 * 1000;
const THROTTLE_LIMIT = 20;
const PUBLIC_BASE = 'https://api.ayvalabs.com';

function makeToken(): string {
  return randomBytes(9).toString('base64url');
}

function hashIp(ip: string): string {
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0;
  return `ip_${(h >>> 0).toString(36)}`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const ipKey = hashIp(ip);

    const throttleRef = adminDb.collection('gameInviteThrottle').doc(ipKey);
    const now = Date.now();
    const throttleSnap = await throttleRef.get();
    const t = throttleSnap.exists ? (throttleSnap.data() as { count: number; windowStart: number }) : null;
    if (t && now - t.windowStart < THROTTLE_WINDOW_MS && t.count >= THROTTLE_LIMIT) {
      return NextResponse.json(
        { success: false, message: 'Too many invites recently — please try again later.' },
        { status: 429 },
      );
    }
    await throttleRef.set(
      t && now - t.windowStart < THROTTLE_WINDOW_MS
        ? { count: t.count + 1, windowStart: t.windowStart }
        : { count: 1, windowStart: now },
    );

    const body = await request.json().catch(() => ({}));
    const parentToken = typeof body?.parentToken === 'string' && /^[A-Za-z0-9_-]{6,32}$/.test(body.parentToken)
      ? body.parentToken
      : undefined;

    const token = makeToken();
    await adminDb.collection('gameInvites').doc(token).set({
      token,
      createdAt: new Date().toISOString(),
      parentToken: parentToken ?? null,
      ipHash: ipKey,
    });

    return NextResponse.json({
      success: true,
      token,
      url: `${PUBLIC_BASE}/play/food-swipe?ref=${token}`,
    });
  } catch (e) {
    console.error('[game/invite/create] failed', e);
    return NextResponse.json({ success: false, message: 'Could not create invite.' }, { status: 500 });
  }
}
