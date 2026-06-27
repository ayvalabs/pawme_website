"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PromoCode, PromoRedemption } from "@/lib/promo-types";
import { describeDiscount, effectiveStatus } from "@/lib/promo-types";

export function PromoDetail({ code }: { code: string }) {
  const router = useRouter();
  const [data, setData] = useState<{
    code: PromoCode;
    redemptions: PromoRedemption[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/promo/${code}`, {
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setData(j);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/promo/${code}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      await reload();
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete code ${code}? Only allowed if 0 redemptions.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/promo/${code}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      router.push("/admin/promo");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (loading)
    return (
      <p className="text-sm text-[color:var(--color-text-secondary)]">Loading…</p>
    );
  if (error || !data)
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error || "Not found"}
      </div>
    );

  const c = data.code;
  const status = effectiveStatus(c);
  const remaining = c.quantity != null ? c.quantity - c.redeemedCount : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/promo"
          className="text-xs text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]"
        >
          ← All codes
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight font-mono">
          {c.code}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
          {describeDiscount(c.discount)} · expires{" "}
          {new Date(c.expiresAt).toLocaleDateString()} · {status}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Redeemed" value={c.redeemedCount} />
        <Stat
          label="Remaining"
          value={remaining == null ? "∞" : remaining}
        />
        <Stat label="Quantity" value={c.quantity == null ? "∞" : c.quantity} />
        <Stat label="KOL" value={c.kolCode ?? "—"} />
      </div>

      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Meta label="Entitlement" value={c.discount.entitlementId} />
          <Meta label="Status" value={status} />
          <Meta
            label="Created"
            value={new Date(c.createdAt).toLocaleString()}
          />
          <Meta
            label="Updated"
            value={new Date(c.updatedAt).toLocaleString()}
          />
          {c.notes ? <Meta label="Notes" value={c.notes} fullWidth /> : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[color:var(--color-border)]">
          {status === "active" ? (
            <button
              onClick={() => patch({ status: "paused" })}
              disabled={busy}
              className="rounded-full bg-amber-100 text-amber-800 px-4 py-2 text-xs font-semibold hover:bg-amber-200"
            >
              Pause
            </button>
          ) : status === "paused" ? (
            <button
              onClick={() => patch({ status: "active" })}
              disabled={busy}
              className="rounded-full bg-green-100 text-green-800 px-4 py-2 text-xs font-semibold hover:bg-green-200"
            >
              Resume
            </button>
          ) : null}

          <button
            onClick={() => {
              const next = prompt(
                "Extend expiry to (YYYY-MM-DD):",
                new Date(c.expiresAt).toISOString().slice(0, 10),
              );
              if (next) patch({ expiresAt: `${next}T23:59:59Z` });
            }}
            disabled={busy}
            className="rounded-full bg-zinc-100 text-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-zinc-200"
          >
            Change expiry
          </button>

          <button
            onClick={() => {
              const next = prompt(
                "New quantity (leave empty for unlimited):",
                c.quantity == null ? "" : String(c.quantity),
              );
              if (next != null)
                patch({ quantity: next === "" ? null : Number(next) });
            }}
            disabled={busy}
            className="rounded-full bg-zinc-100 text-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-zinc-200"
          >
            Change quantity
          </button>

          {c.redeemedCount === 0 ? (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-full bg-red-50 text-red-700 px-4 py-2 text-xs font-semibold hover:bg-red-100"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">
          Redemptions ({data.redemptions.length})
        </h2>
        {data.redemptions.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">
            No redemptions yet.
          </p>
        ) : (
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-background-soft)] text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Granted until</th>
                  <th className="text-left px-4 py-3">Via</th>
                </tr>
              </thead>
              <tbody>
                {data.redemptions.map((r, i) => (
                  <tr
                    key={`${r.userId}-${i}`}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-4 py-3">
                      {new Date(r.redeemedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.userId}</td>
                    <td className="px-4 py-3">
                      {new Date(r.grantedUntil).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{r.via}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function Meta({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
