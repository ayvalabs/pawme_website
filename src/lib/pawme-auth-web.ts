/**
 * src/lib/pawme-auth-web.ts
 *
 * Web-side auth helpers. The browser holds a Firebase ID token; we
 * exchange it for a session cookie that's HttpOnly + Secure + SameSite,
 * verified server-side on every request.
 *
 * Why a session cookie instead of just reading the Firebase token on
 * every request:
 *   - Cookie is HttpOnly → XSS can't read it.
 *   - We can refresh it from the server side without a network round-trip
 *     to Firebase on every page load.
 *   - We can attach extra claims (isPro, etc.) at session-issuance time
 *     so isPro is available without an RC lookup on every render.
 *
 * Flow:
 *   1. Browser signs in via Firebase Auth (signInWithEmailAndPassword etc).
 *   2. Browser POSTs the ID token to /api/web/session/login.
 *   3. Server verifies the token via firebase-admin, issues a session
 *      cookie (createSessionCookie, 7-day expiry by default).
 *   4. Every subsequent request: server reads cookie via `currentWebUser()`.
 *
 * Logout: /api/web/session/logout clears the cookie.
 */

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from './firebase-admin';
import { isUserPro } from './pawme-rc';

const SESSION_COOKIE = 'pawme_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface WebUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isPro: boolean;
  /** Snapshot from Firestore users/{uid} if it exists. */
  profile?: { displayName?: string; firstName?: string } | null;
}

/**
 * Issue a session cookie from a Firebase ID token. Called by the login
 * route. Throws on invalid/expired token.
 */
export async function issueSessionCookie(idToken: string): Promise<void> {
  const sessionCookie = await getAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Resolve the current web user from the session cookie. Returns null
 * for anonymous visitors. Use in server components and route handlers.
 * Includes a Pro check via the RC REST client.
 */
export async function currentWebUser(): Promise<WebUser | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await getAuth().verifySessionCookie(cookie, true);
    const uid = decoded.uid;
    // Read Firestore profile + RC entitlement in parallel.
    const [profileSnap, isPro] = await Promise.all([
      adminDb.collection('users').doc(uid).get().catch(() => null),
      isUserPro(uid),
    ]);
    const profile = profileSnap?.exists
      ? (profileSnap.data() as { displayName?: string; firstName?: string } | undefined) ?? null
      : null;
    return {
      uid,
      email: decoded.email || null,
      emailVerified: !!decoded.email_verified,
      isPro,
      profile,
    };
  } catch {
    return null;
  }
}

/**
 * Throw a redirect if the visitor isn't signed in. Use in pages that
 * require auth. Returns the user on success.
 */
export async function requireWebUser(): Promise<WebUser> {
  const u = await currentWebUser();
  if (!u) {
    // Caller decides how to render the redirect; throwing here keeps
    // type narrowing tight in pages.
    throw new Error('UNAUTHENTICATED');
  }
  return u;
}
