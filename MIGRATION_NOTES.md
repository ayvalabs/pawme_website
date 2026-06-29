# Mobile API Migration — pawpilot_website → pawme_website

Branch: `feat/v2-mobile-api-port`

Brings the 11 `/api/mobile/*` routes that were proxied to `pawpilot.ayvalabs.com` in-house, so the PawMe v2.0 mobile app can hit `pawme.ayvalabs.com` directly and `pawpilot_website` can be decommissioned.

## Routes added

| Route | File |
|---|---|
| `POST /api/mobile/contact-us` | `src/app/api/mobile/contact-us/route.ts` |
| `POST /api/mobile/food/scan` | `src/app/api/mobile/food/scan/route.ts` |
| `POST /api/mobile/food/safety-check` | `src/app/api/mobile/food/safety-check/route.ts` |
| `POST /api/mobile/invite/generate` | `src/app/api/mobile/invite/generate/route.ts` |
| `POST /api/mobile/passport/create` | `src/app/api/mobile/passport/create/route.ts` |
| `POST /api/mobile/promo/redeem` | `src/app/api/mobile/promo/redeem/route.ts` |
| `POST /api/mobile/promo/validate` | `src/app/api/mobile/promo/validate/route.ts` |
| `GET /api/mobile/shop/products` | `src/app/api/mobile/shop/products/route.ts` |
| `GET /api/mobile/shop/redirect` | `src/app/api/mobile/shop/redirect/route.ts` |
| `POST /api/mobile/shop/remind` | `src/app/api/mobile/shop/remind/route.ts` |

## Lib files added

- `src/lib/pawme-cost-tracking.ts` — per-user AI cost accounting (used by food/scan, food/safety-check)
- `src/lib/pawme-food-scoring.ts` — scores ingredient labels (used by food/scan)
- `src/lib/pawme-food-safety.ts` — checks ingredient safety (used by food/safety-check)
- `src/lib/promo-types.ts` — PromoCode / PromoRedemption types + helpers (used by promo/* and invite/generate)
- `src/lib/shop-firestore.ts` — Firestore-backed shop product catalog loader (used by shop/products)
- `src/lib/shop-catalog.ts` — static fallback shop catalog + ranking (used by shop/products, shop/redirect)
- `src/lib/affiliate-links.ts` — Amazon Associates / Skimlinks URL construction (used by shop/redirect)

## Lib files upgraded (pawpilot has strict superset)

- `src/lib/pawme-mobile.ts` — adds `optionalMobileUser()` (auth-optional handler) + tagged 401 errors via `.statusCode`
- `src/lib/pawme-logging.ts` — adds `sanitizeForLog()` and `LOG_REDACT_KEYS` for safe structured logging
- `src/lib/pawme-gemini.ts` — adds `GeminiUsage` token tracking (consumed by `pawme-cost-tracking`)
- `src/lib/firebase-admin.ts` — enables `ignoreUndefinedProperties` so optional fields can be `undefined` without throwing

## next.config.ts

Removed the three proxy rewrites for `/api/mobile/{shop,promo,invite}/:path*` → `https://pawpilot.ayvalabs.com/...`. Routes are now served locally.

## Env vars required

All env vars below must be set on Firebase App Hosting for `pawme_website` before deploying this branch.

### Same value as pawpilot_website (copy them over)

| Var | Used by | Notes |
|---|---|---|
| `GEMINI_API_KEY` | food/scan, food/safety-check (via pawme-gemini) | Org-level Google AI key — safe to share |
| `AMAZON_ASSOC_TAG` | shop/redirect | Amazon Associates tag (`pawme-20`) — shared |
| `SKIMLINKS_PUBLISHER_ID` | shop/redirect (affiliate-links) | Skimlinks fallback publisher ID — shared |
| `NEXT_PUBLIC_APP_URL` | passport/create | Already set on pawme_website |

### Pawme-specific (NEW value required — do NOT copy pawpilot's)

| Var | Used by | Action |
|---|---|---|
| `RESEND_API_KEY` | contact-us | **Create a new Resend API key** scoped just to mobile contact-us feedback. Do not reuse pawpilot's (rotation/security). |
| `REVENUECAT_SECRET_API_KEY` | promo/redeem | **Blocker** — create the pawme RC project first, then generate a secret REST key (`sk_...`) with "Grant Promotional Entitlement" permission. Pawpilot's RC secret key targets pawpilot's RC project and cannot be reused. |
| `FIREBASE_SERVICE_ACCOUNT` | all routes (via firebase-admin) | Already set on pawme_website (points at `pawme-bc0a0`). **Verify** the service account has Firestore read/write on the collections this branch introduces (`promoCodes`, `promoRedemptions`, `shopProducts`, `shopRedirects`, `shopReminders`). |

## Firestore collections the new routes read / write

The migration assumes pawme_website's Firestore project (`pawme-bc0a0`) is the source of truth. If pawpilot has been writing to a DIFFERENT Firestore project, these collections need to be migrated first (else promoCodes/etc. will appear empty after cutover):

- `promoCodes/{code}` — coupon definitions (status, expiry, quota, discount, redeemedCount). Read by promo/validate, read+transactionally-incremented by promo/redeem, written by invite/generate.
- `promoRedemptions/{autoId}` — per-user redemption log. Written by promo/redeem.
- `users/{uid}.subscription` — RC entitlement state cache. Written by promo/redeem after RC grant.
- `pets/{petId}.passport` — pet passport record. Written by passport/create.
- `shopProducts/*` — affiliate product catalog (Firestore-backed; falls back to in-code `shop-catalog.ts` if missing). Read by shop/products.
- `shopRedirects/*` — click-tracking log. Written by shop/redirect.
- `shopReminders/*` — back-in-stock / price-drop signup. Written by shop/remind.

## Deployment / DNS decisions still open

1. **Firestore data ownership.** If pawpilot has been writing to `pawme-bc0a0`, no migration needed. If pawpilot has its own Firestore project, run an export/import of the four collections above BEFORE cutover.
2. **Hosting**: pawme_website is on Firebase App Hosting (`apphosting.yaml` has `maxInstances: 1`). Raise `maxInstances` (e.g. to 5-10) before sending real traffic — IAP validation + RC promo grants + Gemini calls are bursty.
3. **RevenueCat webhook URL**: when pawme RC project is created, paste its S2S webhook URL into App Store Connect → App Information → Production Server URL. Pawpilot's webhook URL must NOT be left there post-cutover or pawme IAP events will fan out to pawpilot's RC project.
4. **App Store Connect IAP products**: must be registered against `ai.ayvalabs.pawme` and linked to the new RC project before promo/redeem can grant the `pro_access` entitlement.

## Verification before deploy

- [ ] `npm run typecheck` clean (the errors in `actions/users.ts`, `tweets/*`, `components/ui/*` predate this branch and are unrelated).
- [ ] `npm run build` clean.
- [ ] Smoke each route with curl against a Firebase App Hosting preview channel before promoting.
- [ ] Confirm pawpilot's S2S webhook URL has been swapped (otherwise IAP events for pawme bundle will be silently dropped on pawme side).
- [ ] After deploy, remove the proxy URLs from any leftover docs and decommission pawpilot_website routes.

---

## Apple Wallet pet passport pass (PR feat/v2-passport-apple-wallet-backend)

**New env vars (REQUIRED for pass generation; route 503s without them):**
- `APPLE_PASS_TYPE_ID` — e.g. `pass.ai.ayvalabs.pawme.passport`
- `APPLE_PASS_CERT_P12_BASE64` — `base64 -i pawme-pass.p12` from the user-generated cert
- `APPLE_PASS_KEY_PASSWORD` — password set when exporting the .p12

**Public assets needed at `public/wallet-assets/`:**
- `icon.png` (29×29), `icon@2x.png` (58×58), `logo.png` (160×50), `wwdr.pem` (Apple Worldwide Developer Relations intermediate cert — public, from https://www.apple.com/certificateauthority/)

**Until cert + assets are in place** the route gracefully returns 503 with `{ reason: 'wallet_not_configured' }` — the app shows "Coming soon" alert.

**Apple Developer steps:** Identifiers → Pass Type IDs → New → `pass.ai.ayvalabs.pawme.passport` → generate signing cert → download `.p12` → convert to base64 → set env vars.

**App side** (separate PR feat/v2-passport-apple-wallet-app): "Add to Apple Wallet" button in PetPassport's card actions row, iOS only.
## AI cost metering — per-user free-tier (PR feat/v2-ai-cost-metering)

**New env var (optional):**
- `AI_FREE_ALLOWANCE_PER_MONTH` — integer. Default `25`. Per-user
  monthly AI-call cap. Pro users are unmetered. Anon users (no uid)
  short-circuit to allow.

**Wired into these high-cost routes** (per PRD §7 step 3):
- `gemini-photo-scan`
- `gemini-chat`
- `food/scan` (only for signed-in users; anon scans always allowed)

**402 response shape** the app must handle:
```json
{
  "success": false,
  "reason": "free_limit_reached",
  "feature": "gemini-photo-scan",
  "used": 25,
  "allowance": 25,
  "remaining": 0
}
```
App should route to `PaywallScreen` when it sees `reason === 'free_limit_reached'`.

**Pro detection:** reads `users/{uid}.isPro === true`. Set by the RC webhook handler (existing) on subscription start.

**Counter source:** `users/{uid}/aiUsage/{YYYY-MM}.callCount` — same doc that `pawme-cost-tracking.ts:recordAiUsage` already writes. No new collection.

### Note on the two usage-gating libs

This PR adds `src/lib/ai-allowance.ts` BUT the codebase already had
`src/lib/pawme-usage.ts` doing similar work (it gates gemini-chat,
gemini-photo-scan, gemini-symptoms, training via `assertAndBumpUsage`).

For this PR we removed the redundant `requireWithinFreeTier` calls on
gemini-chat + gemini-photo-scan (the existing `assertAndBumpUsage` fires
first and is more sophisticated — per-category limits, day/month windows).

`ai-allowance.ts` is wired ONLY into `food/scan` (which had no usage gate
before). It reads the same `users/{uid}/aiUsage/{YYYY-MM}.callCount`
counter that `pawme-cost-tracking.ts:recordAiUsage` writes — so the
data already flows.

**Follow-up** (not blocking this PR): pick ONE gate. Either:
- (a) Migrate `assertAndBumpUsage` callers to `requireWithinFreeTier`
  (simpler — one counter source, one PR shape)
- (b) Delete `ai-allowance.ts` and route `food/scan` through
  `assertAndBumpUsage` with a new 'foodScan' category

(a) is cleaner if you want pooled limits across features. (b) is cleaner
if you want per-category limits. Pick when this PR lands.
