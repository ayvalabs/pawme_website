/**
 * GET /api/admin/app-users
 *
 * Admin-gated. The pawme-bc0a0 `users` collection is shared across products:
 * the PawMe app AND the PawMe robot VIP waitlist (openpawrobot.com /
 * pawmebot.com), plus internal test accounts. This route classifies them so
 * the dashboard can show the TRUE PawMe signed-up userbase, independent of
 * GA4 (which only sees analytics-enabled installs).
 *
 * Classification (by document schema, since there's no source field):
 *   - app  : has firstName / profileComplete / trialStartedAt / aiDisclaimerAccepted / platform
 *   - web  : has isVip / referralCode / points / rewards / vipPaidAt (robot waitlist)
 *   - test : email is @ayvalabs.com / pawme+… / test-ish
 */

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-gate';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const APP_KEYS = ['platform', 'profileComplete', 'trialStartedAt', 'aiDisclaimerAccepted', 'firstName'];
const WEB_KEYS = ['isVip', 'referralCode', 'points', 'rewards', 'vipPaidAt'];
const isTestEmail = (e: string) => !e || /@ayvalabs\.com$|pawme\+|\+test|example\.|test@|@test/i.test(e);

function monthOf(createdAt: unknown): string | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'string') return createdAt.slice(0, 7);
  const ts = createdAt as { toDate?: () => Date };
  if (ts && typeof ts.toDate === 'function') return ts.toDate().toISOString().slice(0, 7);
  return null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const snap = await adminDb.collection('users').get();
    const app = { real: 0, test: 0, ios: 0, android: 0, noOS: 0, trials: 0, paid: 0 };
    const web = { real: 0, test: 0, vipPaid: 0 };
    let other = 0;
    const signupsByMonth: Record<string, number> = {};

    snap.forEach((doc) => {
      const f = doc.data() as Record<string, unknown>;
      const email = (f.email as string) || '';
      const test = isTestEmail(email);
      const appish = APP_KEYS.some((k) => k in f);
      const webish = WEB_KEYS.some((k) => k in f);

      if (appish) {
        if (test) app.test++; else app.real++;
        const p = f.platform;
        if (p === 'ios') app.ios++; else if (p === 'android') app.android++; else app.noOS++;
        if ('trialStartedAt' in f) app.trials++;
        if ('subscription' in f) app.paid++;
        if (!test) {
          const m = monthOf(f.createdAt);
          if (m) signupsByMonth[m] = (signupsByMonth[m] || 0) + 1;
        }
      } else if (webish) {
        if (test) web.test++; else web.real++;
        if ('vipPaidAt' in f) web.vipPaid++;
      } else {
        other++;
      }
    });

    return NextResponse.json({
      total: snap.size,
      app,
      web,
      other,
      signupsByMonth,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), app: null },
      { status: 200 },
    );
  }
}
