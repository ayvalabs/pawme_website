/**
 * Shared TypeScript types for the PawPilot promo-code system.
 *
 * Firestore collection layout:
 *
 *   promoCodes/{CODE}                — one doc per code, doc id IS the code
 *     code:            string  (uppercase A-Z 0-9 dash, same as doc id)
 *     kolCode?:        string  (optional — link to kols/{kolCode} for attribution)
 *     quantity:        number | null  (max redemptions; null = unlimited)
 *     redeemedCount:   number  (atomic counter — incremented on redeem)
 *     expiresAt:       ISO string (codes auto-expire — server-validated)
 *     status:          'active' | 'paused' | 'expired' | 'exhausted'
 *     discount:        PromoDiscount
 *     notes?:          string
 *     createdBy:       string  (admin email)
 *     createdAt:       ISO string
 *     updatedAt:       ISO string
 *
 *   promoRedemptions/{auto}          — one doc per successful redemption
 *     code:            string
 *     userId:          string (firebase uid)
 *     userEmail?:      string (denormalized for analytics)
 *     redeemedAt:      ISO string
 *     grantedUntil:    ISO string (when the entitlement granted by RC expires)
 *     via:             'deep_link' | 'manual' | 'admin'
 *     rcGrantId?:      string (response id from RC grant API for debugging)
 *
 * Firestore security rules (see firestore.rules):
 *   - promoCodes: server-only writes (admin SDK or admin password-cookie).
 *     Reads: server-only (validate API reads it, never the client).
 *   - promoRedemptions: server-only writes. Reads: user can read own;
 *     admin can read all.
 */

/** What kind of "discount" the promo represents. */
export type PromoDiscountType =
  /** Grant Pro for N days, free. */
  | 'trial_days'
  /** Grant Pro for N months, free. Mapped to RC durations: 1 → monthly,
   * 2 → two_month, 3 → three_month, 6 → six_month, 12 → yearly. */
  | 'free_months'
  /** Reserved for future: % off the next paid period. Requires Apple/Play
   * Subscription Offer integration — not implemented in v1. */
  | 'percent_off';

export interface PromoDiscount {
  type: PromoDiscountType;
  /** For 'trial_days': number of days (e.g. 30, 90).
   *  For 'free_months': number of months (1..12).
   *  For 'percent_off': percentage (1..100). */
  value: number;
  /** RC entitlement identifier to grant. Matches our app's `pro_access`. */
  entitlementId: string;
  /** Display product identifier — used for analytics + paywall hints. */
  productId?: string;
}

export type PromoStatus = 'active' | 'paused' | 'expired' | 'exhausted';

export interface PromoCode {
  /** Uppercase code; same as Firestore doc id. */
  code: string;
  kolCode?: string;
  quantity: number | null;
  redeemedCount: number;
  expiresAt: string;
  status: PromoStatus;
  discount: PromoDiscount;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Set when this code is a user-generated invite code. The redeem flow
   * grants Pro to the redeemer AND a matching reward to this inviter.
   */
  inviterUserId?: string;
  /** Inviter's reward discount when redeemed by a new user. Defaults to a
   * mirror of `discount` if absent. */
  inviterReward?: PromoDiscount;
}

export interface PromoRedemption {
  code: string;
  userId: string;
  /** Set when the code that was redeemed belonged to another user (invite).
   * Lets us aggregate "invites attributed to this user" without a join. */
  inviterUserId?: string;
  userEmail?: string;
  redeemedAt: string;
  grantedUntil: string;
  via: 'deep_link' | 'manual' | 'admin';
  rcGrantId?: string;
}

/**
 * Compute the human-readable grant duration label.
 *
 * Examples:
 *   { type: 'trial_days', value: 30 }   → "30 days free"
 *   { type: 'free_months', value: 3 }   → "3 months free"
 *   { type: 'percent_off', value: 50 }  → "50% off"
 */
export function describeDiscount(d: PromoDiscount): string {
  switch (d.type) {
    case 'trial_days':
      return `${d.value} day${d.value === 1 ? '' : 's'} free`;
    case 'free_months':
      return `${d.value} month${d.value === 1 ? '' : 's'} free`;
    case 'percent_off':
      return `${d.value}% off`;
  }
}

/**
 * Map a free-grant discount to RC's `duration` enum for the
 * Grant Promotional Entitlement API.
 *
 * RC accepts: "daily", "three_day", "weekly", "monthly", "two_month",
 *             "three_month", "six_month", "yearly", "lifetime"
 *
 * For trial_days, we pick the smallest standard window that ≥ requested days
 * to avoid under-granting (a 30-day request maps to "monthly", a 90-day to
 * "three_month", a 7-day to "weekly", etc).
 *
 * Returns null for percent_off — that's an Apple/Play Subscription Offer,
 * not a free-grant case.
 */
export function rcDurationFor(d: PromoDiscount): string | null {
  if (d.type === 'percent_off') return null;

  const days = d.type === 'trial_days' ? d.value : d.value * 30;

  if (days <= 1) return 'daily';
  if (days <= 3) return 'three_day';
  if (days <= 7) return 'weekly';
  if (days <= 30) return 'monthly';
  if (days <= 60) return 'two_month';
  if (days <= 90) return 'three_month';
  if (days <= 180) return 'six_month';
  if (days <= 365) return 'yearly';
  return 'lifetime';
}

/**
 * Compute the ISO timestamp when a grant of this discount type would expire,
 * starting from `from` (defaults to now). Used to populate
 * promoRedemptions.grantedUntil.
 */
export function grantedUntilFor(d: PromoDiscount, from: Date = new Date()): string {
  if (d.type === 'percent_off') return from.toISOString(); // n/a
  const days = d.type === 'trial_days' ? d.value : d.value * 30;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms).toISOString();
}

/**
 * Reconcile the stored status with current quota + expiry. The doc's
 * `status` field is the source of truth for admin-set states ("paused"),
 * but server should also flip to "expired" / "exhausted" before honoring
 * a redemption.
 */
export function effectiveStatus(c: PromoCode, now: Date = new Date()): PromoStatus {
  if (c.status === 'paused') return 'paused';
  if (new Date(c.expiresAt).getTime() < now.getTime()) return 'expired';
  if (c.quantity != null && c.redeemedCount >= c.quantity) return 'exhausted';
  return 'active';
}
