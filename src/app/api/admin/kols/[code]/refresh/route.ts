/**
 * POST /api/admin/kols/[code]/refresh
 *
 * Fetches the latest stats for a single KOL from RevenueCat, App Store
 * Connect, and Google Play. Stores nothing — the client merges + writes
 * to Firestore (so a single client-side admin SDK is enough).
 *
 * Today this is partially stubbed:
 *   - RevenueCat v2 API requires a v2 secret key (LAUNCH_TODO #3). When
 *     set as RC_SECRET_API_KEY_V2 we'll fetch redemptions and active subs.
 *   - App Store Connect promo code redemption stats aren't exposed in
 *     the public API; we expose the value passed in via query for manual
 *     bookkeeping.
 *   - Play Store: vanity code redemptions exposed via Play Developer API
 *     monetization endpoints (TBD).
 *
 * Returns { stats: Partial<KolStats> } — only the fields we could refresh.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { runApi } from "@/lib/pawme-logging";

// Mirror of lib/admin-gate.ts — kept inline so this route works without
// the layout's middleware-style protection on the client.
function isAdminViaCookie(secret: string | undefined, cookieValue: string | undefined): boolean {
  if (!secret || !cookieValue) return false;
  const expected = createHmac("sha256", secret).update("pm_admin_v1").digest("hex");
  return cookieValue === expected;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const ENDPOINT = `admin/kols/${code}/refresh`;

  const { requestId, result, error } = await runApi<{
    stats: Record<string, number>;
    notes: string[];
  }>(
    { endpoint: ENDPOINT, request: _req },
    async ({ logInfo }) => {
      const jar = await cookies();
      if (!isAdminViaCookie(process.env.ADMIN_PASSWORD, jar.get("pm_admin")?.value)) {
        const err: Error & { statusCode?: number } = new Error("unauthorized");
        err.statusCode = 401;
        throw err;
      }

      const partial: Record<string, number> = {};
      const notes: string[] = [];

      // ── RevenueCat ──────────────────────────────────────────────────────────
      // Filter redemptions by metadata.kol_code == this code. RC v2 supports
      // `metadata` filtering on subscriptions / purchases.
      const rcKey = process.env.RC_SECRET_API_KEY_V2;
      const rcProject = process.env.RC_PROJECT_ID;
      if (rcKey && rcProject) {
        try {
          // RC v2 — list customers with the kol_code attribute matching `code`.
          const url =
            `https://api.revenuecat.com/v2/projects/${rcProject}/customers` +
            `?limit=100&filter[attributes.kol_code.value]=${encodeURIComponent(code)}`;
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${rcKey}`,
              Accept: "application/json",
            },
          });
          if (!res.ok) {
            notes.push(`RC ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
          } else {
            const j = await res.json();
            const customers = (j.items || []) as Array<{
              subscriptions?: Array<{ status?: string }>;
            }>;
            partial.attributedInstalls = customers.length;
            partial.trialStarts = customers.filter((c) =>
              c.subscriptions?.some((s) => s.status === "in_trial"),
            ).length;
            partial.paidConversions = customers.filter((c) =>
              c.subscriptions?.some((s) => s.status === "active" || s.status === "paid"),
            ).length;
            partial.activeSubscribers = customers.filter((c) =>
              c.subscriptions?.some((s) => s.status === "active"),
            ).length;
          }
        } catch (e: unknown) {
          notes.push(`RC error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        notes.push(
          "RC_SECRET_API_KEY_V2 not set — RevenueCat stats not refreshed. " +
            "See LAUNCH_TODO.md section 3.",
        );
      }

      // ── App Store Connect ────────────────────────────────────────────────────
      // Apple does not expose promo code redemption counts via API. Skipped.
      notes.push(
        "Apple promo code redemptions: track manually (see KOL playbook).",
      );

      // ── Google Play ──────────────────────────────────────────────────────────
      // Play Developer v3 doesn't expose subscription promo code redemptions.
      // The new Monetization API (preview) may; revisit when GA.
      notes.push(
        "Play promo code redemptions: track manually until Google Monetization API GA.",
      );

      // ── Referral clicks (our own server) ───────────────────────────────────────────
      // TODO: when /r/[code] starts logging to Firestore, aggregate here.
      // Stubbed for now; remove the explicit 0 once wired up so manual edits
      // aren't clobbered.
      // partial.referralClicks = 0;

      logInfo({ code, statsKeys: Object.keys(partial), notesCount: notes.length });
      return { stats: partial, notes };
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === "number" ? (error as any).statusCode : 500;
    return NextResponse.json(
      { error: (error as Error)?.message || "internal error", requestId },
      { status, headers: { "x-request-id": requestId } },
    );
  }
  return NextResponse.json(
    { ...result, requestId },
    { headers: { "x-request-id": requestId } },
  );
}
