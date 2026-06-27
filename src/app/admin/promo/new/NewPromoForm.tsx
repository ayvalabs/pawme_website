"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromoDiscountType } from "@/lib/promo-types";

type Mode = "single" | "bulk";

export function NewPromoForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: string[] } | null>(null);

  const [singleCode, setSingleCode] = useState("");
  const [prefix, setPrefix] = useState("PAWFRIEND");
  const [count, setCount] = useState(25);
  const [quantity, setQuantity] = useState<string>("");

  // Default expiry 90 days out
  const ninetyDaysOut = new Date(Date.now() + 90 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const [expiresAt, setExpiresAt] = useState(ninetyDaysOut);
  const [discountType, setDiscountType] = useState<PromoDiscountType>("trial_days");
  const [discountValue, setDiscountValue] = useState(30);
  const [entitlementId, setEntitlementId] = useState("pro_access");
  const [kolCode, setKolCode] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        expiresAt: new Date(expiresAt + "T23:59:59Z").toISOString(),
        discount: {
          type: discountType,
          value: Number(discountValue),
          entitlementId: entitlementId.trim(),
        },
        kolCode: kolCode.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (mode === "single") {
        if (!singleCode.trim()) throw new Error("Code required");
        body.code = singleCode.trim().toUpperCase();
        body.quantity = quantity.trim() === "" ? null : Number(quantity);
      } else {
        body.count = Number(count);
        body.prefix = prefix.trim().toUpperCase();
        body.quantity = Number(quantity || 1);
      }
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResult({ created: j.created ?? [] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold">Created {result.created.length} code(s)</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            Copy them below. Each one is now redeemable from the mobile app.
          </p>
        </div>
        <textarea
          readOnly
          value={result.created.join("\n")}
          className="w-full min-h-[200px] font-mono text-sm rounded-lg border border-[color:var(--color-border)] bg-white p-3"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(result.created.join("\n"))}
            className="rounded-full bg-zinc-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-800"
          >
            Copy all
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/promo")}
            className="rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-2">
        <ModeChip active={mode === "single"} onClick={() => setMode("single")}>
          Single code
        </ModeChip>
        <ModeChip active={mode === "bulk"} onClick={() => setMode("bulk")}>
          Bulk-generate
        </ModeChip>
      </div>

      {mode === "single" ? (
        <Field label="Code" hint="3–32 chars, A-Z 0-9 dash. Auto-uppercased.">
          <input
            required
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value.toUpperCase())}
            placeholder="MAYALUNA26"
            className={input}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prefix" hint="Codes look like PREFIX-A3F2">
            <input
              required
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className={input}
            />
          </Field>
          <Field label="Count" hint="Max 500 per batch">
            <input
              type="number"
              min={1}
              max={500}
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={input}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Quantity per code"
          hint={
            mode === "single"
              ? "How many users can redeem this code total. Leave empty for unlimited."
              : "Always 1 for bulk (each generated code single-use)."
          }
        >
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={mode === "single" ? "unlimited" : "1"}
            className={input}
          />
        </Field>
        <Field label="Expires">
          <input
            type="date"
            required
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={input}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Discount type">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as PromoDiscountType)}
            className={input}
          >
            <option value="trial_days">Free trial (days)</option>
            <option value="free_months">Free months</option>
            <option value="percent_off" disabled>
              % off (not yet supported)
            </option>
          </select>
        </Field>
        <Field label={discountType === "free_months" ? "Months" : "Days"}>
          <input
            type="number"
            min={1}
            required
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className={input}
          />
        </Field>
      </div>

      <Field label="Entitlement id" hint="Must match RevenueCat. Default: pro_access">
        <input
          required
          value={entitlementId}
          onChange={(e) => setEntitlementId(e.target.value)}
          className={input}
        />
      </Field>

      <Field label="KOL code (optional)" hint="Link to kols/{CODE} for attribution.">
        <input
          value={kolCode}
          onChange={(e) => setKolCode(e.target.value.toUpperCase())}
          placeholder="MAYALUNA"
          className={input}
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${input} min-h-20`}
          placeholder="e.g. Friends pilot batch 1"
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[color:var(--color-primary)] text-white px-6 py-3 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60"
        >
          {busy ? "Creating…" : mode === "single" ? "Create code" : `Generate ${count} codes`}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/promo")}
          className="rounded-full bg-zinc-200 text-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)] mb-1.5">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block mt-1 text-xs text-[color:var(--color-text-secondary)]">
          {hint}
        </span>
      )}
    </label>
  );
}

function ModeChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-[color:var(--color-primary)] text-white"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
