import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

/**
 * KOL referral landing.
 *
 * Two-stage flow that gives us the cleanest possible "no paste needed" UX
 * for new-install users:
 *
 *   Stage 1 (this handler) — render a 1.5-second HTML page that:
 *     • Copies the promo code to the user's clipboard via JS (still inside
 *       the gesture from the tap that loaded the page, so most browsers
 *       allow the clipboard write without an explicit confirm)
 *     • Increments referral click stats in Firestore
 *     • Sets a 30-day attribution cookie
 *     • Auto-redirects to the App Store after the JS runs
 *
 *   Stage 2 (mobile app, post-install) — PromoRedeemScreen reads the
 *   clipboard on mount; if it contains a code-shaped string we pre-fill
 *   the input. User taps Redeem → done. No typing.
 *
 * Falls back gracefully: if clipboard write fails (older Safari without
 * gesture, paranoid privacy modes), the page shows the code prominently
 * so the user can manually copy it before installing.
 */

const APP_STORE_URL =
  "https://apps.apple.com/app/pawme-pet-parent-ai-copilot/id6764225799";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  // Internal docs use UPPERCASE codes; cookies are lowercase for URL hygiene.
  const docId = code.toUpperCase().slice(0, 64);
  const codeUpper = docId; // shown in the landing page + copied to clipboard
  const cookieVal = code.toLowerCase().slice(0, 64);

  // Best-effort click log — never block the response on Firestore errors.
  // Gate on the KOL (or linked promo) doc existing so randoms hitting
  // /r/JUNK don't create empty subcollections under kols/JUNK/...
  try {
    const [kolSnap, promoSnap] = await Promise.all([
      adminDb.collection("kols").doc(docId).get(),
      adminDb.collection("promoCodes").doc(docId).get(),
    ]);
    // Prefer the explicit KOL doc; fall back to the kolCode on the promo
    // doc so /r/PAWFRIEND-A1B2 still attributes to MAYALUNA26.
    let attributedKol: string | null = null;
    if (kolSnap.exists) {
      attributedKol = docId;
    } else if (promoSnap.exists) {
      const data = promoSnap.data() as { kolCode?: string };
      if (data?.kolCode) attributedKol = data.kolCode.toUpperCase();
    }
    if (attributedKol) {
      await adminDb
        .collection("kols")
        .doc(attributedKol)
        .collection("clicks")
        .add({
          ts: FieldValue.serverTimestamp(),
          via: docId,
          userAgent: req.headers.get("user-agent") ?? "",
          referer: req.headers.get("referer") ?? "",
          ip: req.headers.get("x-forwarded-for") ?? "",
        });
      await adminDb
        .collection("kols")
        .doc(attributedKol)
        .collection("stats")
        .doc("latest")
        .set(
          { referralClicks: FieldValue.increment(1) },
          { merge: true },
        );
    }
  } catch {
    /* swallow — landing page must always render */
  }

  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  let storeUrl = APP_STORE_URL;
  if (/android/.test(ua)) {
    storeUrl = PLAY_STORE_URL;
  } else if (/iphone|ipad|ipod|mac/.test(ua) === false) {
    // Desktop / unknown — default to App Store for now.
    storeUrl = APP_STORE_URL;
  }

  const html = renderLandingPage(codeUpper, storeUrl);

  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
  // 30-day attribution cookie — readable by the mobile app post-install
  // via /api/mobile/promo/match-install (when wired).
  res.cookies.set("pp_ref", cookieVal, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  res.cookies.set("pp_code", codeUpper, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  return res;
}

/**
 * Inline HTML so the redirect feels instant. No framework, no external
 * stylesheets — just brand-tinted boilerplate + a tiny script that copies
 * the code and bounces to the store.
 */
function renderLandingPage(code: string, storeUrl: string): string {
  // JSON-escape for safe inline embedding (just in case a future code
  // schema allows quote-y characters).
  const codeJs = JSON.stringify(code);
  const storeJs = JSON.stringify(storeUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Opening PawMe…</title>
  <link rel="icon" href="/favicon.png" />
  <style>
    :root {
      --primary: #f47b5a;
      --primary-dark: #d8623f;
      --background: #faf6f2;
      --surface: #ffffff;
      --text: #2a221d;
      --text-secondary: #6f635a;
      --success: #2f9466;
      --success-soft: #e6f5ec;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter,
                   "Helvetica Neue", Arial, sans-serif;
      background: var(--background);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: var(--surface);
      border-radius: 24px;
      padding: 32px 28px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      text-align: center;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px;
    }
    .sub {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0 0 24px;
    }
    .code {
      display: inline-block;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 18px;
      letter-spacing: 0.08em;
      font-weight: 700;
      background: var(--background);
      border: 1px dashed rgba(0,0,0,0.15);
      border-radius: 12px;
      padding: 12px 16px;
      margin: 8px 0 16px;
      user-select: all;
    }
    .copied {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--success);
      background: var(--success-soft);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 20px;
      opacity: 0;
      transition: opacity 220ms ease;
    }
    .copied.show { opacity: 1; }
    .cta {
      display: inline-block;
      background: var(--primary);
      color: white;
      font-weight: 600;
      font-size: 16px;
      padding: 14px 22px;
      border-radius: 999px;
      text-decoration: none;
      border: 0;
      cursor: pointer;
      width: 100%;
      transition: background 120ms ease;
    }
    .cta:active { background: var(--primary-dark); }
    .help {
      margin-top: 18px;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .paw {
      width: 56px; height: 56px;
      margin: 0 auto 12px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="paw" src="/app-icon.png" alt="PawMe" />
    <h1>Your code is ready</h1>
    <p class="sub">Tap below to install PawMe — we'll apply your code automatically once you sign in.</p>
    <div class="code" id="code">${escapeHtml(code)}</div>
    <div class="copied" id="copied">✓ Code copied to clipboard</div>
    <a class="cta" id="cta" href="${escapeHtml(storeUrl)}">Open App Store</a>
    <p class="help">
      After install, open the app → Settings → "Have a promo code?".
      Your code will already be filled in.
    </p>
  </div>

  <script>
    (function () {
      var CODE = ${codeJs};
      var STORE = ${storeJs};

      // 1. Try to copy the code into the clipboard so the app can auto-fill
      //    it on the redeem screen. Modern path first, fallback for older
      //    Safari that requires execCommand.
      function tryCopy() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(CODE);
        }
        // Fallback: hidden textarea + execCommand
        return new Promise(function (resolve, reject) {
          try {
            var ta = document.createElement('textarea');
            ta.value = CODE;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }

      var copiedEl = document.getElementById('copied');
      var ctaEl = document.getElementById('cta');

      // Attempt clipboard write immediately. If the browser blocks it
      // without an explicit gesture (some iOS versions), the "Open App
      // Store" button handler below will retry inside the tap.
      tryCopy().then(function () {
        copiedEl.classList.add('show');
      }).catch(function () {
        /* silent — fall back to manual copy */
      });

      // The CTA button: ensure clipboard write happens inside the gesture,
      // then jump to the store. We don't preventDefault — the anchor's
      // href handles navigation if the script aborts.
      ctaEl.addEventListener('click', function () {
        tryCopy().catch(function () {});
      });
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
      ? "&lt;"
      : c === ">"
      ? "&gt;"
      : c === '"'
      ? "&quot;"
      : "&#39;",
  );
}
