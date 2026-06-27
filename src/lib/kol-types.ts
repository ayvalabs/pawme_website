/**
 * Shared TypeScript types for the KOL dashboard.
 *
 * Firestore collection layout:
 *   kols/{code}                — one document per KOL (code = e.g. "MAYALUNA")
 *   kols/{code}/stats/latest   — most recent stats snapshot (refreshed on demand)
 *   kols/{code}/posts/{postId} — optional record of each post the KOL made
 */

export type KolTier = "nano" | "micro" | "mid" | "macro";

export type KolPlatform = "instagram" | "tiktok" | "youtube" | "x" | "other";

/** Top-level KOL document. */
export interface Kol {
  /** Short uppercase code used as Firestore doc id, ASC promo batch label,
   * Play vanity code, and the referral URL slug (pawme.ayvalabs.com/r/{code}). */
  code: string;
  name: string;
  handle: string;
  platform: KolPlatform;
  audienceSize: number;
  tier: KolTier;
  /** USD paid to creator (0 for nano). */
  stipendUsd: number;
  /** Email or PayPal — for paying out. */
  contact: string;
  /** Any notes (free text). */
  notes?: string;
  /** Date we sent the outreach DM. */
  outreachedAt?: string; // ISO
  /** Date the KOL's post went live. */
  postedAt?: string; // ISO
  status: "outreach" | "pending" | "live" | "complete" | "paused";
  createdAt: string; // ISO
}

export interface KolStats {
  /** Apple promo codes generated for this KOL (manual count). */
  appleCodesIssued: number;
  /** Apple codes redeemed (pulled from RC). */
  appleCodesRedeemed: number;
  /** Android vanity code redemptions (pulled from Play / RC). */
  playRedemptions: number;
  /** In-app PawMe promo code redemptions (cross-platform). Bumped by
   * /api/mobile/promo/redeem when the code has a kolCode set. */
  inAppRedemptions?: number;
  /** Referral link clicks (pawme.ayvalabs.com/r/{code}). */
  referralClicks: number;
  /** Installs we can attribute (sum of redemptions + cookie-based attribution). */
  attributedInstalls: number;
  /** Free trial starts attributable. */
  trialStarts: number;
  /** Trials that converted to paid. */
  paidConversions: number;
  /** Active paid subscribers right now (from RC). */
  activeSubscribers: number;
  /** Lifetime gross revenue from this KOL's cohort (USD). */
  grossRevenueUsd: number;
  /** Updated-at timestamp for this stats snapshot. */
  refreshedAt: string; // ISO
}

export function calcCpp(kol: Kol, stats: KolStats): number {
  // Cost = stipend + free Pro nominal value (assume 1 mo per redemption at $4.99)
  const cost = kol.stipendUsd + stats.appleCodesRedeemed * 4.99;
  return stats.paidConversions > 0 ? cost / stats.paidConversions : 0;
}

export function blankStats(): KolStats {
  return {
    appleCodesIssued: 0,
    appleCodesRedeemed: 0,
    playRedemptions: 0,
    inAppRedemptions: 0,
    referralClicks: 0,
    attributedInstalls: 0,
    trialStarts: 0,
    paidConversions: 0,
    activeSubscribers: 0,
    grossRevenueUsd: 0,
    refreshedAt: new Date().toISOString(),
  };
}
