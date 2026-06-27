"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Kol, KolTier, KolPlatform } from "@/lib/kol-types";
import { blankStats } from "@/lib/kol-types";

export function NewKolForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Kol, "createdAt">>({
    code: "",
    name: "",
    handle: "",
    platform: "instagram",
    audienceSize: 0,
    tier: "nano",
    stipendUsd: 0,
    contact: "",
    notes: "",
    status: "outreach",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!code) {
      setError("Code is required.");
      return;
    }
    setBusy(true);
    try {
      const db = getDb();
      const ref = doc(db, "kols", code);
      const exists = await getDoc(ref);
      if (exists.exists()) {
        setError(`Code "${code}" already exists.`);
        setBusy(false);
        return;
      }
      const data: Kol = {
        ...form,
        code,
        audienceSize: Number(form.audienceSize) || 0,
        stipendUsd: Number(form.stipendUsd) || 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, data);
      // seed an empty stats doc so reads later don't 404
      await setDoc(doc(db, "kols", code, "stats", "latest"), blankStats());
      router.push(`/admin/kols/${code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Code (e.g. MAYALUNA26)" hint="Uppercase, no spaces.">
        <input
          required
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          className={input}
          placeholder="MAYALUNA26"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Creator name">
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={input}
            placeholder="Maya Chen"
          />
        </Field>
        <Field label="Handle (no @)">
          <input
            required
            value={form.handle}
            onChange={(e) => set("handle", e.target.value)}
            className={input}
            placeholder="mayaandluna"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Platform">
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value as KolPlatform)}
            className={input}
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="x">X / Twitter</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Audience size">
          <input
            type="number"
            value={form.audienceSize}
            onChange={(e) => set("audienceSize", Number(e.target.value))}
            className={input}
            placeholder="5000"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tier">
          <select
            value={form.tier}
            onChange={(e) => set("tier", e.target.value as KolTier)}
            className={input}
          >
            <option value="nano">Nano (1K–10K)</option>
            <option value="micro">Micro (10K–100K)</option>
            <option value="mid">Mid (100K–500K)</option>
            <option value="macro">Macro (500K+)</option>
          </select>
        </Field>
        <Field label="Stipend (USD)">
          <input
            type="number"
            value={form.stipendUsd}
            onChange={(e) => set("stipendUsd", Number(e.target.value))}
            className={input}
            placeholder="50"
          />
        </Field>
      </div>

      <Field label="Contact (email / PayPal)">
        <input
          required
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
          className={input}
          placeholder="maya@example.com"
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={`${input} min-h-24`}
          placeholder="Any context: how we found them, content style, etc."
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value as Kol["status"])}
          className={input}
        >
          <option value="outreach">Outreach sent</option>
          <option value="pending">Pending (agreed, awaiting post)</option>
          <option value="live">Live (post is up)</option>
          <option value="complete">Complete</option>
          <option value="paused">Paused</option>
        </select>
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
          {busy ? "Saving…" : "Save KOL"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/kols")}
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
