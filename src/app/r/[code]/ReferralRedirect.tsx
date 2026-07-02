'use client';

import { useEffect, useState } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6758856073';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme';

function storeForPlatform(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return APP_STORE_URL;
  if (/Android/i.test(ua)) return PLAY_STORE_URL;
  return null; // desktop → no auto-redirect, show both buttons
}

/**
 * Invite landing: copies the code to the clipboard (so the app's redeem screen
 * can auto-fill it after install) and forwards to the right store on mobile.
 * Desktop visitors just see both store buttons.
 */
export function ReferralRedirect({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Copy the code so a new install can pre-fill it on the redeem screen.
    if (code) {
      navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {});
    }
    const store = storeForPlatform();
    if (store) {
      const t = setTimeout(() => {
        window.location.href = store;
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [code]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6F2] px-6 text-center">
      <div className="text-5xl">🐾</div>
      <h1 className="mt-4 text-3xl font-black text-zinc-900">
        Give 30 days. <span className="text-[#F0663F]">Get 30 days.</span>
      </h1>
      <p className="mt-2 max-w-sm text-zinc-600">
        Try PawMe — your pet&apos;s AI health companion. Your invite code is ready.
      </p>

      {code ? (
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-white px-6 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Your code</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-widest text-zinc-900">{code}</div>
          <div className="mt-1 text-xs text-zinc-500">{copied ? '✓ Copied — paste it on the Redeem screen' : 'Copy this and enter it on the Redeem screen'}</div>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-zinc-500">Taking you to your app store…</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a href={APP_STORE_URL} className="rounded-full bg-[#F0663F] px-6 py-3 font-semibold text-white">Download on iPhone</a>
        <a href={PLAY_STORE_URL} className="rounded-full border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-800">Get it on Android</a>
      </div>
    </main>
  );
}
