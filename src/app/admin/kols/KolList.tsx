"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Kol, KolStats } from "@/lib/kol-types";
import { blankStats, calcCpp } from "@/lib/kol-types";

type Row = { kol: Kol; stats: KolStats };

export function KolList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const db = getDb();
        const q = query(collection(db, "kols"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const out: Row[] = [];
        for (const d of snap.docs) {
          const kol = d.data() as Kol;
          const sSnap = await getDoc(doc(db, "kols", d.id, "stats", "latest"));
          out.push({ kol, stats: (sSnap.data() as KolStats) ?? blankStats() });
        }
        if (!cancel) setRows(out);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancel) setError(msg);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (loading)
    return (
      <p className="text-sm text-[color:var(--color-text-secondary)]">
        Loading KOLs…
      </p>
    );
  if (error)
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        Firestore error: {error}. Double-check NEXT_PUBLIC_FIREBASE_* env vars.
      </div>
    );
  if (!rows.length)
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center">
        <p className="text-base font-semibold">No KOLs yet</p>
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
          Add your first creator to start tracking.
        </p>
        <Link
          href="/admin/kols/new"
          className="inline-block mt-5 rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
        >
          + Add KOL
        </Link>
      </div>
    );

  // Totals row for at-a-glance reading.
  const totals = rows.reduce(
    (a, { stats }) => ({
      redemptions: a.redemptions + stats.appleCodesRedeemed + stats.playRedemptions,
      clicks: a.clicks + stats.referralClicks,
      trials: a.trials + stats.trialStarts,
      paid: a.paid + stats.paidConversions,
      active: a.active + stats.activeSubscribers,
      revenue: a.revenue + stats.grossRevenueUsd,
    }),
    { redemptions: 0, clicks: 0, trials: 0, paid: 0, active: 0, revenue: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile label="KOLs" value={rows.length.toString()} />
        <Tile label="Clicks" value={totals.clicks.toString()} />
        <Tile label="Redemptions" value={totals.redemptions.toString()} />
        <Tile label="Trials" value={totals.trials.toString()} />
        <Tile label="Paid" value={totals.paid.toString()} />
        <Tile label="Revenue" value={`$${totals.revenue.toFixed(0)}`} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--color-background-soft)] text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Creator</th>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-right px-4 py-3">Clicks</th>
              <th className="text-right px-4 py-3">Reds.</th>
              <th className="text-right px-4 py-3">Trials</th>
              <th className="text-right px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3">CPP</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ kol, stats }) => (
              <tr
                key={kol.code}
                className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-background-soft)]/50"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/admin/kols/${kol.code}`}
                    className="text-[color:var(--color-primary)] hover:underline"
                  >
                    {kol.code}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{kol.name}</div>
                  <div className="text-xs text-[color:var(--color-text-secondary)]">
                    @{kol.handle} · {kol.platform}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{kol.tier}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {stats.referralClicks}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {stats.appleCodesRedeemed + stats.playRedemptions}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {stats.trialStarts}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {stats.paidConversions}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  ${calcCpp(kol, stats).toFixed(0)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={kol.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Kol["status"] }) {
  const colors: Record<Kol["status"], string> = {
    outreach: "bg-zinc-100 text-zinc-700",
    pending: "bg-amber-100 text-amber-800",
    live: "bg-green-100 text-green-800",
    complete: "bg-blue-100 text-blue-800",
    paused: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}
