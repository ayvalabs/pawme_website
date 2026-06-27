'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  propertyId: string;
  range: { days: number; startDate: string; endDate: string };
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    totalRevenue: number;
    purchaseRevenue: number;
    avgSessionDuration: number;
    engagementRate: number;
  };
  trend: { date: string; activeUsers: number; newUsers: number; sessions: number }[];
  byPlatform: { platform: string; activeUsers: number; newUsers: number }[];
  events: Record<string, number>;
  crossPlatform: Record<string, { ios: number; android: number; total: number }>;
  screens: { name: string; views: number }[];
  topItems: { name: string; views: number }[];
  errors: string[];
}

const RANGES = [7, 28, 90];

const fmt = (n: number) => n.toLocaleString('en-US');
const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${(n <= 1 ? n * 100 : n).toFixed(1)}%`;
const dur = (s: number) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}m ${sec}s` : `${sec}s`;
};
const shortDate = (yyyymmdd: string) =>
  yyyymmdd?.length === 8 ? `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}` : yyyymmdd;

interface RevenueData {
  configured: boolean;
  error?: string;
  metrics: { id: string; name: string; unit: string | null; value: number; description: string | null }[];
}

interface AppUsersData {
  total: number;
  error?: string;
  app: { real: number; test: number; ios: number; android: number; noOS: number; trials: number; paid: number } | null;
  web: { real: number; test: number; vipPaid: number };
  signupsByMonth: Record<string, number>;
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [appUsers, setAppUsers] = useState<AppUsersData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        return j as AnalyticsData;
      })
      .then((j) => !cancelled && setData(j))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days]);

  // RevenueCat metrics are independent of the GA4 date range — fetch once.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/revenue', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => !cancelled && setRevenue(j))
      .catch(() => !cancelled && setRevenue({ configured: false, error: 'fetch failed', metrics: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  // App-user counts from Firestore (the true signed-up base) — also GA4-independent.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/app-users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => !cancelled && setAppUsers(j))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const ev = data?.events ?? {};

  return (
    <div className="space-y-10">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        {RANGES.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              days === d
                ? 'bg-[color:var(--color-primary)] text-white'
                : 'bg-black/5 text-[color:var(--color-text-secondary)] hover:bg-black/10'
            }`}
          >
            {d}d
          </button>
        ))}
        {data && (
          <span className="ml-auto text-xs text-[color:var(--color-text-secondary)]">
            Property {data.propertyId} · {data.range.startDate} → {data.range.endDate}
          </span>
        )}
      </div>

      {/* True signed-up app users from Firestore — GA4-independent, available now */}
      {appUsers && <AppUsersPanel d={appUsers} />}

      {/* RevenueCat — independent of GA4, so it populates even before GA4 is enabled */}
      {revenue && <RevenuePanel revenue={revenue} />}

      {loading && <p className="text-sm text-[color:var(--color-text-secondary)]">Loading GA4…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load GA4 analytics: {error}
        </div>
      )}

      {data && !loading && (
        <>
          {data.errors?.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">Some reports were skipped:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {data.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 0. CROSS-PLATFORM: installs → logins → purchases (iOS vs Android) */}
          <Section title="Installs · Logins · Purchases — iOS vs Android">
            <CrossPlatformTable cp={data.crossPlatform} />
          </Section>

          {/* 1. ACQUISITION & USERS */}
          <Section title="Acquisition & users">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label="Active users" value={fmt(data.totals.activeUsers)} />
              <Stat label="New users" value={fmt(data.totals.newUsers)} />
              <Stat label="Sign-ups" value={fmt(ev.sign_up || 0)} />
              <Stat label="Sessions" value={fmt(data.totals.sessions)} />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ChartLabel>New users per day</ChartLabel>
                <BarChart
                  bars={data.trend.map((d) => ({ label: shortDate(d.date), value: d.newUsers }))}
                />
              </div>
              <div>
                <ChartLabel>By platform (active)</ChartLabel>
                <BarList
                  rows={data.byPlatform
                    .map((p) => ({ name: p.platform, value: p.activeUsers }))
                    .sort((a, b) => b.value - a.value)}
                />
              </div>
            </div>
          </Section>

          {/* 2. MONETIZATION */}
          <Section title="Monetization">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label="Revenue" value={money(data.totals.totalRevenue)} sub="GA4 totalRevenue" />
              <Stat label="Checkouts started" value={fmt(ev.begin_checkout || 0)} />
              <Stat label="Purchases" value={fmt(ev.purchase || 0)} />
              <Stat
                label="Checkout → purchase"
                value={
                  ev.begin_checkout
                    ? pct((ev.purchase || 0) / ev.begin_checkout)
                    : '—'
                }
              />
            </div>
            <ChartLabel>Purchase funnel</ChartLabel>
            <Funnel
              steps={[
                { name: 'Checkout started', value: ev.begin_checkout || 0 },
                { name: 'Purchase', value: ev.purchase || 0 },
              ]}
            />
          </Section>

          {/* 3. SHOP FUNNEL */}
          <Section title="Shop funnel">
            <ChartLabel>Browse → intent</ChartLabel>
            <Funnel
              steps={[
                { name: 'Viewed list', value: ev.view_item_list || 0 },
                { name: 'Viewed item', value: ev.view_item || 0 },
                { name: 'Selected item', value: ev.select_item || 0 },
                { name: 'Added to wishlist', value: ev.add_to_wishlist || 0 },
              ]}
            />
            {data.topItems.length > 0 && (
              <div className="mt-6">
                <ChartLabel>Top products</ChartLabel>
                <BarList rows={data.topItems.map((i) => ({ name: i.name, value: i.views }))} />
              </div>
            )}
          </Section>

          {/* 4. ENGAGEMENT & SCREENS */}
          <Section title="Engagement & screens">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label="Engagement rate" value={pct(data.totals.engagementRate)} />
              <Stat label="Avg session" value={dur(data.totals.avgSessionDuration)} />
              <Stat label="Logins" value={fmt(ev.login || 0)} />
              <Stat label="AI chats" value={fmt(ev.ai_chat_message || 0)} />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ChartLabel>Top screens</ChartLabel>
                <BarList rows={data.screens.map((s) => ({ name: s.name, value: s.views }))} />
              </div>
              <div>
                <ChartLabel>Key feature events</ChartLabel>
                <BarList
                  rows={[
                    { name: 'Symptom check', value: ev.symptom_check || 0 },
                    { name: 'Photo scan', value: ev.photo_scan || 0 },
                    { name: 'AI chat message', value: ev.ai_chat_message || 0 },
                    { name: 'Training plan', value: ev.training_plan_created || 0 },
                  ].sort((a, b) => b.value - a.value)}
                />
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

/* ── presentational bits ──────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/60 p-6">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ChartLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)] mb-2">
      {children}
    </p>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[color:var(--color-text-secondary)]">{sub}</p>}
    </div>
  );
}

function AppUsersPanel({ d }: { d: AppUsersData }) {
  if (d.error || !d.app) {
    return (
      <Section title="PawMe app users">
        <p className="text-sm text-[color:var(--color-text-secondary)]">Could not load: {d.error || 'no data'}</p>
      </Section>
    );
  }
  const a = d.app;
  return (
    <Section title="PawMe app users — signed up (from Firestore)">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Stat label="Real app users" value={fmt(a.real)} sub={a.test ? `+${a.test} test` : undefined} />
        <Stat label="Trials started" value={fmt(a.trials)} />
        <Stat label="Paid subscribers" value={fmt(a.paid)} />
        <Stat
          label="Signup rate"
          value={a.real ? `${Math.round((a.trials / a.real) * 100)}%` : '—'}
          sub="trial / signup"
        />
      </div>
      <ChartLabel>By platform</ChartLabel>
      <BarList
        rows={[
          { name: 'iOS', value: a.ios },
          { name: 'Android', value: a.android },
          { name: 'OS not recorded', value: a.noOS },
        ]}
      />
      <p className="mt-4 text-[11px] text-[color:var(--color-text-secondary)]">
        Real signed-up PawMe accounts only — excludes the PawMe robot waitlist
        ({fmt(d.web.real)} real, {fmt(d.web.vipPaid)} paid VIP) and {fmt(a.test + d.web.test)} test
        accounts that share this Firebase project. Independent of GA4.
      </p>
    </Section>
  );
}

function RevenuePanel({ revenue }: { revenue: RevenueData }) {
  const fmtMetric = (m: RevenueData['metrics'][number]) => {
    if (m.unit === 'currency') return money(m.value);
    if (m.unit === 'percentage') return `${m.value.toFixed(1)}%`;
    return fmt(m.value);
  };
  return (
    <Section title="Revenue & subscriptions — RevenueCat">
      {!revenue.configured ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          RevenueCat not configured ({revenue.error}).
        </p>
      ) : revenue.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          RevenueCat: {revenue.error}
        </div>
      ) : revenue.metrics.length === 0 ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">No metrics returned yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {revenue.metrics.map((m) => (
            <Stat key={m.id} label={m.name} value={fmtMetric(m)} sub={m.description || undefined} />
          ))}
        </div>
      )}
    </Section>
  );
}

function CrossPlatformTable({
  cp,
}: {
  cp: Record<string, { ios: number; android: number; total: number }>;
}) {
  const rows: { key: string; label: string }[] = [
    { key: 'first_open', label: 'Installs' },
    { key: 'sign_up', label: 'Sign-ups' },
    { key: 'login', label: 'Logins' },
    { key: 'begin_checkout', label: 'Checkouts started' },
    { key: 'purchase', label: 'Purchases' },
  ];
  const g = (k: string) => cp?.[k] || { ios: 0, android: 0, total: 0 };
  const installs = g('first_open');
  const purchases = g('purchase');
  const convRate = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');
  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)] border-b border-black/10">
            <th className="py-2">Metric</th>
            <th className="py-2 text-right"> iOS</th>
            <th className="py-2 text-right">Android</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => {
            const r = g(key);
            return (
              <tr key={key} className="border-b border-black/5">
                <td className="py-2.5 font-medium">{label}</td>
                <td className="py-2.5 text-right tabular-nums">{fmt(r.ios)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmt(r.android)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{fmt(r.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat label="Install → purchase (iOS)" value={convRate(purchases.ios, installs.ios)} />
        <Stat label="Install → purchase (Android)" value={convRate(purchases.android, installs.android)} />
        <Stat label="Install → purchase (overall)" value={convRate(purchases.total, installs.total)} />
      </div>
      <p className="mt-3 text-[11px] text-[color:var(--color-text-secondary)]">
        Installs = GA4 first_open events. Numbers may differ slightly from App Store / Play
        console figures (those count store downloads; first_open counts first app launch).
      </p>
    </>
  );
}

function BarList({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">No data.</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={`${r.name}-${i}`} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs" title={r.name}>
            {r.name}
          </span>
          <div className="relative h-5 flex-1 rounded bg-black/5">
            <div
              className="absolute inset-y-0 left-0 rounded bg-[color:var(--color-primary)]"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums">
            {fmt(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">No data.</p>;
  return (
    <div className="flex h-32 items-end gap-0.5">
      {bars.map((b, i) => (
        <div key={i} className="group relative flex-1" title={`${b.label}: ${fmt(b.value)}`}>
          <div
            className="w-full rounded-t bg-[color:var(--color-primary)] transition group-hover:opacity-80"
            style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 2 : 0 }}
          />
        </div>
      ))}
    </div>
  );
}

function Funnel({ steps }: { steps: { name: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const stepRate = prev ? (s.value / prev) * 100 : 0;
        return (
          <div key={s.name} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-sm">{s.name}</span>
            <div className="relative h-7 flex-1 rounded bg-black/5">
              <div
                className="absolute inset-y-0 left-0 rounded bg-[color:var(--color-primary)]"
                style={{ width: `${(s.value / top) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
              {fmt(s.value)}
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-[color:var(--color-text-secondary)]">
              {i === 0 ? '' : `${stepRate.toFixed(0)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
