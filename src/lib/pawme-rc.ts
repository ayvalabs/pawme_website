/**
 * src/lib/pawme-rc.ts
 *
 * Server-side RevenueCat REST client. Used so the web app can:
 *   1. Read a user's current Pro entitlement (so isPro works on web).
 *   2. Grant a promotional entitlement from a Stripe checkout success,
 *      keeping mobile + web in sync on a single source of truth.
 *
 * REVENUECAT_SECRET_API_KEY must be set in env. This key is sensitive —
 * it can mutate any user's entitlement. Never expose it to the client.
 */

const RC_BASE_V1 = 'https://api.revenuecat.com/v1';

function key(): string {
  const k = process.env.REVENUECAT_SECRET_API_KEY;
  if (!k) throw new Error('REVENUECAT_SECRET_API_KEY not configured');
  return k;
}

/**
 * Returns true if the user has an active `pro_access` entitlement in
 * RevenueCat. Source of truth for "is this user Pro" across mobile + web.
 */
export async function isUserPro(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${RC_BASE_V1}/subscribers/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${key()}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      // 404 = no subscriber record yet — definitely not Pro.
      // Anything else, log + treat as not-Pro so we never falsely upgrade.
      return false;
    }
    const data = await res.json();
    const ent = data?.subscriber?.entitlements?.pro_access;
    if (!ent) return false;
    // RC returns `expires_date` (ISO) — null/undefined = lifetime.
    if (!ent.expires_date) return true;
    return new Date(ent.expires_date).getTime() > Date.now();
  } catch {
    return false;
  }
}

/**
 * Grant a promotional entitlement to a user. Used by:
 *   - /api/mobile/promo/redeem (existing — uses similar endpoint)
 *   - /api/webhooks/stripe (new — on successful Stripe checkout)
 *
 * Duration must be one of RC's accepted values:
 *   "daily" | "three_day" | "weekly" | "monthly" | "two_month"
 *   | "three_month" | "six_month" | "yearly" | "lifetime"
 */
export async function grantProEntitlement(
  uid: string,
  duration: string,
  reason: string,
): Promise<{ ok: boolean; rcGrantId?: string; error?: string }> {
  try {
    const url = `${RC_BASE_V1}/subscribers/${encodeURIComponent(uid)}/entitlements/pro_access/promotional`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ duration, reason }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `RC ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, rcGrantId: data?.id || data?.grant_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
