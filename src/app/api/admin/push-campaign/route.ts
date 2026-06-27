/**
 * /api/admin/push-campaign
 *   GET  → recipient counts per segment (dry-run, no send)
 *   POST → { segment, title, body, dryRun? } send an Expo push to a segment
 *
 * Admin-gated. Sends via the Expo Push API (handles iOS + Android), targeting
 * the `pushToken` (ExponentPushToken[...]) field. Segments target real PawMe
 * app users (excludes the robot waitlist + test accounts):
 *   - all_app  : every real app user with a push token
 *   - no_trial : real app users who signed up but never started a trial
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-gate';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const isTestEmail = (e: string) => !e || /@ayvalabs\.com$|pawme\+|\+test|example\.|test@|@test/i.test(e);
const APP_KEYS = ['platform', 'profileComplete', 'trialStartedAt', 'aiDisclaimerAccepted', 'firstName'];

interface Recipient { token: string; platform: string; hasTrial: boolean }

async function collect(): Promise<Recipient[]> {
  const snap = await adminDb.collection('users').get();
  const out: Recipient[] = [];
  snap.forEach((doc) => {
    const f = doc.data() as Record<string, any>;
    const token = f.pushToken as string | undefined;
    if (!token || !token.startsWith('ExponentPushToken')) return;
    if (isTestEmail(f.email || '')) return;
    if (!APP_KEYS.some((k) => k in f)) return; // app users only
    out.push({ token, platform: f.platform || 'unknown', hasTrial: 'trialStartedAt' in f });
  });
  return out;
}

function filterSegment(all: Recipient[], segment: string): Recipient[] {
  if (segment === 'no_trial') return all.filter((r) => !r.hasTrial);
  return all; // all_app
}

async function sendExpo(tokens: string[], title: string, body: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  let ok = 0, failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map((to) => ({
      to, title, body, sound: 'default', priority: 'high', channelId: 'default', data: { type: 're_engage' },
    }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers, body: JSON.stringify(chunk),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { failed += chunk.length; errors.push(`HTTP ${res.status}: ${JSON.stringify(j).slice(0, 200)}`); continue; }
    for (const t of j.data || []) { if (t.status === 'ok') ok++; else { failed++; if (t.message) errors.push(t.message); } }
  }
  return { ok, failed, errors: [...new Set(errors)].slice(0, 5) };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const all = await collect();
  return NextResponse.json({
    segments: {
      all_app: all.length,
      no_trial: all.filter((r) => !r.hasTrial).length,
    },
    byPlatform: {
      ios: all.filter((r) => r.platform === 'ios').length,
      android: all.filter((r) => r.platform === 'android').length,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const segment = body?.segment === 'no_trial' ? 'no_trial' : 'all_app';
  const title = String(body?.title || '').trim();
  const text = String(body?.body || '').trim();
  const dryRun = body?.dryRun !== false; // default to dry-run for safety

  const recipients = filterSegment(await collect(), segment);
  if (dryRun) {
    return NextResponse.json({ dryRun: true, segment, recipients: recipients.length });
  }
  if (!title || !text) {
    return NextResponse.json({ error: 'title and body required to send' }, { status: 400 });
  }
  const result = await sendExpo(recipients.map((r) => r.token), title, text);
  return NextResponse.json({ sent: true, segment, recipients: recipients.length, ...result });
}
