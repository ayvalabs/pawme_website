/**
 * Server-side admin auth gate.
 *
 * Uses a simple shared password (env var ADMIN_PASSWORD) + a httpOnly
 * cookie. Good enough for "one founder + a few teammates" until we
 * wire up real Firebase Auth + email allowlist.
 *
 * Pages under /admin/* call `requireAdmin()` at the top of their server
 * component; if the cookie's not set or doesn't match, they redirect
 * to /admin/login.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "node:crypto";

const COOKIE_NAME = "pm_admin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function expectedToken(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD not set");
  // The cookie value is an HMAC of the password against a stable string
  // so we don't store the password itself.
  return createHmac("sha256", secret).update("pm_admin_v1").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  try {
    return cookie === expectedToken();
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function setAdminCookie(password: string): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  if (password !== process.env.ADMIN_PASSWORD) return false;
  const jar = await cookies();
  jar.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return true;
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
