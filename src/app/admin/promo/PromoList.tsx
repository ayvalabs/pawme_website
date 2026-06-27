"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PromoCode } from "@/lib/promo-types";
import { describeDiscount, effectiveStatus } from "@/lib/promo-types";

export function PromoList() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/promo", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setCodes(j.codes ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <p className="text-sm text-[color:var(--color-text-secondary)]">
        Loading codes…
      </p>
    );
  if (error)
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  if (!codes.length)
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center">
        <p className="text-base font-semibold">No codes yet</p>
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
          Create your first batch.
        </p>
        <Link
          href="/admin/promo/new"
          className="inline-block mt-5 rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
        >
          + Create codes
        </Link>
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--color-background-soft)] text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          <tr>
            <th className="text-left px-4 py-3">Code</th>
            <th className="text-left px-4 py-3">Discount</th>
            <th className="text-right px-4 py-3">Used / Total</th>
            <th className="text-left px-4 py-3">Expires</th>
            <th className="text-left px-4 py-3">KOL</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            const status = effectiveStatus(c);
            return (
              <tr
                key={c.code}
                className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-background-soft)]/50"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/admin/promo/${c.code}`}
                    className="text-[color:var(--color-primary)] hover:underline"
                  >
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-3">{describeDiscount(c.discount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c.redeemedCount} / {c.quantity ?? "∞"}
                </td>
                <td className="px-4 py-3">
                  {new Date(c.expiresAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {c.kolCode ? (
                    <Link
                      href={`/admin/kols/${c.kolCode}`}
                      className="text-[color:var(--color-primary)] hover:underline"
                    >
                      {c.kolCode}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: PromoCode["status"] }) {
  const colors: Record<PromoCode["status"], string> = {
    active: "bg-green-100 text-green-800",
    paused: "bg-amber-100 text-amber-800",
    expired: "bg-zinc-200 text-zinc-700",
    exhausted: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}
