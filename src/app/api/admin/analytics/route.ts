/**
 * GET /api/admin/analytics?days=28
 *
 * Admin-gated. Pulls a v1 analytics snapshot from the GA4 Data API and shapes
 * it for the /admin/analytics dashboard. Each report is run independently so a
 * single unsupported dimension/metric can't blank the whole page — failures
 * are collected into `errors[]`.
 *
 * Sections: acquisition/users, monetization, shop funnel, engagement/screens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-gate';
import { ga4RunReport, dateRange, GA4_PROPERTY_ID, Ga4Row } from '@/lib/ga4';

export const dynamic = 'force-dynamic';

// Custom + standard events we surface across the dashboard sections.
// `first_open` is GA4's per-install event — our cross-platform "installs" proxy.
const EVENT_NAMES = [
  'first_open',
  'sign_up',
  'login',
  'begin_checkout',
  'purchase',
  'view_item_list',
  'view_item',
  'select_item',
  'add_to_wishlist',
  'symptom_check',
  'photo_scan',
  'ai_chat_message',
  'training_plan_created',
];

const num = (v: string | undefined) => (v ? Number(v) : 0);

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const daysParam = Number(request.nextUrl.searchParams.get('days'));
  const days = [7, 28, 90].includes(daysParam) ? daysParam : 28;
  const range = dateRange(days);
  const errors: string[] = [];

  // Helper: run a labelled report, recording failures instead of throwing.
  const run = async (label: string, body: Record<string, unknown>): Promise<Ga4Row[]> => {
    try {
      return await ga4RunReport(body);
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  };

  const [totalsRows, trendRows, platformRows, eventRows, screenRows, itemRows, platformEventRows] =
    await Promise.all([
      run('totals', {
        dateRanges: [range],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'totalRevenue' },
          { name: 'purchaseRevenue' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
        ],
      }),
      run('trend', {
        dateRanges: [range],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      run('byPlatform', {
        dateRanges: [range],
        dimensions: [{ name: 'platform' }],
        metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }],
      }),
      run('events', {
        dateRanges: [range],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: EVENT_NAMES },
          },
        },
        limit: 100,
      }),
      run('screens', {
        dateRanges: [range],
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 12,
      }),
      run('topItems', {
        dateRanges: [range],
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemsViewed' }],
        orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
        limit: 10,
      }),
      // Cross-platform breakdown: event counts split by platform (iOS/Android).
      run('platformEvents', {
        dateRanges: [range],
        dimensions: [{ name: 'platform' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: ['first_open', 'login', 'sign_up', 'purchase', 'begin_checkout'] },
          },
        },
        limit: 100,
      }),
    ]);

  const t = totalsRows[0]?.mets ?? [];
  const totals = {
    activeUsers: num(t[0]),
    newUsers: num(t[1]),
    sessions: num(t[2]),
    totalRevenue: num(t[3]),
    purchaseRevenue: num(t[4]),
    avgSessionDuration: num(t[5]),
    engagementRate: num(t[6]),
  };

  const trend = trendRows.map((r) => ({
    date: r.dims[0], // YYYYMMDD
    activeUsers: num(r.mets[0]),
    newUsers: num(r.mets[1]),
    sessions: num(r.mets[2]),
  }));

  const byPlatform = platformRows.map((r) => ({
    platform: r.dims[0] || 'unknown',
    activeUsers: num(r.mets[0]),
    newUsers: num(r.mets[1]),
  }));

  const events: Record<string, number> = {};
  for (const r of eventRows) events[r.dims[0]] = num(r.mets[0]);

  const screens = screenRows
    .map((r) => ({ name: r.dims[0] || '(not set)', views: num(r.mets[0]) }))
    .filter((s) => s.views > 0);

  const topItems = itemRows
    .map((r) => ({ name: r.dims[0] || '(not set)', views: num(r.mets[0]) }))
    .filter((i) => i.name !== '(not set)' && i.views > 0);

  // Cross-platform funnel: installs (first_open) → logins → purchases, per platform.
  // GA4 platform values are "iOS" / "Android" / "web"; normalise to ios/android.
  const METRIC_KEYS = ['first_open', 'login', 'sign_up', 'purchase', 'begin_checkout'] as const;
  const crossPlatform: Record<string, { ios: number; android: number; total: number }> =
    Object.fromEntries(METRIC_KEYS.map((k) => [k, { ios: 0, android: 0, total: 0 }]));
  for (const r of platformEventRows) {
    const platform = (r.dims[0] || '').toLowerCase(); // ios | android | web
    const event = r.dims[1];
    const count = num(r.mets[0]);
    if (!crossPlatform[event]) continue;
    if (platform === 'ios') crossPlatform[event].ios += count;
    else if (platform === 'android') crossPlatform[event].android += count;
    crossPlatform[event].total += count;
  }

  return NextResponse.json({
    propertyId: GA4_PROPERTY_ID,
    range: { days, ...range },
    totals,
    trend,
    byPlatform,
    events,
    crossPlatform,
    screens,
    topItems,
    errors,
  });
}
