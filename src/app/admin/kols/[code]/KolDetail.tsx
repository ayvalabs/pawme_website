"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Kol, KolStats } from "@/lib/kol-types";
import { blankStats, calcCpp } from "@/lib/kol-types";
import { useRouter } from "next/navigation";

export function KolDetail({ code }: { code: string }) {
  const router = useRouter();
  const [kol, setKol] = useState<Kol | null>(null);
  const [stats, setStats] = useState<KolStats>(blankStats());
  const [editStats, setEditStats] = useState<KolStats>(blankStats());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "refresh" | "save" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const db = getDb();
        const kolSnap = await getDoc(doc(db, "kols", code));
        if (!kolSnap.exists()) {
          if (!cancel) setError("KOL not found");
          return;
        }
        const k = kolSnap.data() as Kol;
        const sSnap = await getDoc(doc(db, "kols", code, "stats", "latest"));
        const s = (sSnap.data() as KolStats) ?? blankStats();
        if (cancel) return;
        setKol(k);
        setStats(s);
        setEditStats(s);
      } catch (e: unknown) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [code]);

  async function refreshFromApis() {
    setBusy("refresh");
    setError(null);
    try {
      const res = await fetch(`/api/admin/kols/${code}/refresh`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // Merge fetched fields onto existing stats; keep manually-edited values.
      const merged: KolStats = { ...stats, ...json.stats, refreshedAt: new Date().toISOString() };
      await setDoc(doc(getDb(), "kols", code, "stats", "latest"), merged);
      setStats(merged);
      setEditStats(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveManualStats() {
    setBusy("save");
    setError(null);
    try {
      const merged: KolStats = { ...editStats, refreshedAt: new Date().toISOString() };
      await setDoc(doc(getDb(), "kols", code, "stats", "latest"), merged);
      setStats(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deleteKol() {
    if (!confirm(`Delete KOL ${code}? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      await deleteDoc(doc(getDb(), "kols", code, "stats", "latest"));
      await deleteDoc(doc(getDb(), "kols", code));
      router.push("/admin/kols");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  if (loading)
    return (
      <p className="text-sm text-[color:var(--color-text-secondary)]">
        Loading…
      </p>
    );
  if (!kol)
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error || "KOL not found."}
      </div>
    );

  const cpp = calcCpp(kol, stats);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/kols"
          className="text-xs text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]"
        >
          ← All KOLs
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{kol.name}</h1>
            <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
              @{kol.handle} · {kol.platform} · {kol.audienceSize.toLocaleString()}{" "}
              followers · {kol.tier}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg">{kol.code}</div>
            <a
              href={`/r/${kol.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--color-primary)] hover:underline"
            >
              ayvalabs.com/r/{kol.code}
            </a>
          </div>
        </div>
      </div>

      {/* Highlight CPP */}
      <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-dark)] text-white p-6 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">
            Cost per paying user
          </div>
          <div className="mt-1 text-5xl font-black tabular-nums">
            ${cpp.toFixed(0)}
          </div>
          <div className="mt-1 text-xs opacity-80">
            Target: &lt; $20 · Stipend: ${kol.stipendUsd}
          </div>
        </div>
        <button
          onClick={refreshFromApis}
          disabled={busy !== null}
          className="rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold backdrop-blur disabled:opacity-50"
        >
          {busy === "refresh" ? "Fetching…" : "↻ Refresh stats"}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Clicks" value={stats.referralClicks} />
        <Stat
          label="Redemptions"
          value={stats.appleCodesRedeemed + stats.playRedemptions}
          sub={`iOS ${stats.appleCodesRedeemed} · Play ${stats.playRedemptions}`}
        />
        <Stat label="Trials" value={stats.trialStarts} />
        <Stat label="Paid" value={stats.paidConversions} />
        <Stat label="Active" value={stats.activeSubscribers} />
        <Stat
          label="Revenue"
          value={`$${stats.grossRevenueUsd.toFixed(0)}`}
        />
        <Stat label="Apple issued" value={stats.appleCodesIssued} />
        <Stat
          label="Refreshed"
          value={new Date(stats.refreshedAt).toLocaleDateString()}
        />
      </div>

      {/* Manual edit (stats not yet wired to APIs) */}
      <details className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Manually edit stats (for fields the auto-refresh doesn't yet cover)
        </summary>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumField
            label="Apple codes issued"
            value={editStats.appleCodesIssued}
            onChange={(v) =>
              setEditStats({ ...editStats, appleCodesIssued: v })
            }
          />
          <NumField
            label="Apple redeemed"
            value={editStats.appleCodesRedeemed}
            onChange={(v) =>
              setEditStats({ ...editStats, appleCodesRedeemed: v })
            }
          />
          <NumField
            label="Play redemptions"
            value={editStats.playRedemptions}
            onChange={(v) => setEditStats({ ...editStats, playRedemptions: v })}
          />
          <NumField
            label="Referral clicks"
            value={editStats.referralClicks}
            onChange={(v) => setEditStats({ ...editStats, referralClicks: v })}
          />
          <NumField
            label="Trial starts"
            value={editStats.trialStarts}
            onChange={(v) => setEditStats({ ...editStats, trialStarts: v })}
          />
          <NumField
            label="Paid conversions"
            value={editStats.paidConversions}
            onChange={(v) =>
              setEditStats({ ...editStats, paidConversions: v })
            }
          />
          <NumField
            label="Active subscribers"
            value={editStats.activeSubscribers}
            onChange={(v) =>
              setEditStats({ ...editStats, activeSubscribers: v })
            }
          />
          <NumField
            label="Gross revenue USD"
            value={editStats.grossRevenueUsd}
            onChange={(v) => setEditStats({ ...editStats, grossRevenueUsd: v })}
          />
        </div>
        <button
          onClick={saveManualStats}
          disabled={busy !== null}
          className="mt-5 rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {busy === "save" ? "Saving…" : "Save manual stats"}
        </button>
      </details>

      {/* Meta */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
            Contact
          </div>
          <div className="mt-0.5">{kol.contact}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
            Status
          </div>
          <div className="mt-0.5 capitalize">{kol.status}</div>
        </div>
        {kol.outreachedAt && (
          <div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
              Outreached
            </div>
            <div className="mt-0.5">
              {new Date(kol.outreachedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        {kol.postedAt && (
          <div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
              Posted
            </div>
            <div className="mt-0.5">
              {new Date(kol.postedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        {kol.notes && (
          <div className="col-span-2">
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
              Notes
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">{kol.notes}</div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="pt-4 border-t border-[color:var(--color-border)]">
        <button
          onClick={deleteKol}
          disabled={busy !== null}
          className="text-xs text-red-600 hover:underline"
        >
          Delete this KOL
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs text-[color:var(--color-text-secondary)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)] mb-1.5">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
      />
    </label>
  );
}
