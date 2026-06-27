/**
 * GET /api/admin/revenue
 *
 * Admin-gated. Pulls RevenueCat's project Overview metrics (active subscriptions,
 * active trials, MRR, revenue, new customers, etc.) via the v2 API. This is the
 * authoritative money/subscription source and works independently of GA4 — so
 * the revenue panel populates even before the GA4 Analytics Data API is enabled.
 *
 * Uses the same creds as the KOL refresh route: RC_SECRET_API_KEY_V2 + RC_PROJECT_ID.
 */

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-gate';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // A SECRET key (sk_...) is required — the public SDK keys (appl_/goog_) can't
  // read metrics. Accept either env name we use across the app.
  const key = process.env.RC_SECRET_API_KEY_V2 || process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        configured: false,
        error: 'No RevenueCat SECRET key set. Add RC_SECRET_API_KEY_V2 = your sk_... key (NOT the appl_/goog_ public SDK keys).',
        metrics: [],
      },
      { status: 200 },
    );
  }
  if (key.startsWith('appl_') || key.startsWith('goog_')) {
    return NextResponse.json(
      {
        configured: false,
        error: 'That looks like a public SDK key (appl_/goog_). The metrics API needs a SECRET key (sk_...) from RevenueCat → Project Settings → API Keys → Secret API Keys.',
        metrics: [],
      },
      { status: 200 },
    );
  }

  try {
    // Auto-discover the project id from the key if RC_PROJECT_ID isn't set.
    let project = process.env.RC_PROJECT_ID;
    if (!project) {
      const pr = await fetch('https://api.revenuecat.com/v2/projects', {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      });
      const pj = await pr.json().catch(() => ({}));
      if (!pr.ok) {
        return NextResponse.json(
          { configured: true, error: `RevenueCat ${pr.status}: ${pj?.message || 'could not list projects'}`, metrics: [] },
          { status: 200 },
        );
      }
      project = pj?.items?.[0]?.id;
      if (!project) {
        return NextResponse.json(
          { configured: true, error: 'No RevenueCat project found for this key.', metrics: [] },
          { status: 200 },
        );
      }
    }

    const res = await fetch(
      `https://api.revenuecat.com/v2/projects/${project}/metrics/overview`,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } },
    );
    const text = await res.text();
    let json: any;
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, error: json?.message || `RevenueCat ${res.status}`, metrics: [] },
        { status: 200 },
      );
    }
    // RC returns { metrics: [{ id, name, description, unit, value, last_updated_at, period }] }
    const metrics = (json.metrics || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description ?? null,
      unit: m.unit ?? null, // e.g. "currency", "decimal", "percentage"
      period: m.period ?? null,
      value: typeof m.value === 'number' ? m.value : Number(m.value ?? 0),
      lastUpdated: m.last_updated_at ?? null,
    }));
    return NextResponse.json({ configured: true, metrics });
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: e instanceof Error ? e.message : String(e), metrics: [] },
      { status: 200 },
    );
  }
}
