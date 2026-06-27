'use client';

import { useEffect, useState } from 'react';

interface Counts {
  segments: { all_app: number; no_trial: number };
  byPlatform: { ios: number; android: number };
}

const PRESETS: Record<string, { title: string; body: string }> = {
  all_app: {
    title: 'Your pet misses you 🐾',
    body: "Check in on today's care tips and ask the AI vet anything.",
  },
  no_trial: {
    title: 'Try PawMe Pro — free',
    body: 'Unlock unlimited AI vet chats, symptom checks and training plans. Start your free trial.',
  },
};

export function PushComposer() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [segment, setSegment] = useState<'all_app' | 'no_trial'>('no_trial');
  const [title, setTitle] = useState(PRESETS.no_trial.title);
  const [body, setBody] = useState(PRESETS.no_trial.body);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/push-campaign', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

  function pickSegment(s: 'all_app' | 'no_trial') {
    setSegment(s);
    setTitle(PRESETS[s].title);
    setBody(PRESETS[s].body);
  }

  const recipients = counts ? counts.segments[segment] : null;

  async function send() {
    if (!confirm(`Send this push to ${recipients ?? '?'} users (${segment})? This cannot be undone.`)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/push-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, title, body, dryRun: false }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setResult(`✅ Sent. delivered=${j.ok} failed=${j.failed}${j.errors?.length ? ` · ${j.errors.join('; ')}` : ''}`);
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {(['no_trial', 'all_app'] as const).map((s) => (
          <button
            key={s}
            onClick={() => pickSegment(s)}
            className={`rounded-xl border p-4 text-left ${segment === s ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5' : 'border-black/10 bg-white'}`}
          >
            <div className="font-semibold text-sm">{s === 'no_trial' ? 'Signed up, no trial yet' : 'All app users'}</div>
            <div className="mt-1 text-2xl font-black tabular-nums">{counts ? counts.segments[s] : '…'}</div>
            <div className="text-[11px] text-[color:var(--color-text-secondary)]">with push tokens</div>
          </button>
        ))}
      </div>
      {counts && (
        <p className="text-xs text-[color:var(--color-text-secondary)]">
          Reachable app users with push tokens — iOS {counts.byPlatform.ios} · Android {counts.byPlatform.android}.
        </p>
      )}

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)] mb-1.5">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} maxLength={60} />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)] mb-1.5">Body</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${input} min-h-20`} maxLength={160} />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={send}
          disabled={busy || !title || !body || !recipients}
          className="rounded-full bg-[color:var(--color-primary)] text-white px-6 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Sending…' : `Send to ${recipients ?? '…'} users`}
        </button>
        {result && <span className="text-sm">{result}</span>}
      </div>
      <p className="text-[11px] text-[color:var(--color-text-secondary)]">
        Targets real PawMe app users only (excludes the robot waitlist + test accounts). Sent via Expo Push (iOS + Android).
      </p>
    </div>
  );
}
