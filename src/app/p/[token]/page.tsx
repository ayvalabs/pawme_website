import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const APP_STORE_URL = 'https://apps.apple.com/app/id6758856073';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme';
const COLLECTION = 'passports';

// Universal do-not-feed toxins shown alongside the pet's own allergies, so a
// sitter/vet viewing the shared passport sees the essentials at a glance.
const UNIVERSAL_TOXINS = ['Chocolate', 'Grapes & raisins', 'Onion & garlic', 'Xylitol', 'Macadamia nuts', 'Alcohol', 'Caffeine'];

type Passport = {
  petName?: string;
  breed?: string;
  species?: string;
  ageLabel?: string | null;
  weightLabel?: string | null;
  gender?: string | null;
  colorLabel?: string | null;
  photoUrl?: string | null;
  petIdNo?: string | null;
  traits?: string[];
  avoid?: string[];
};

async function getPassport(token: string): Promise<Passport | null> {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return null;
  try {
    const snap = await adminDb.collection(COLLECTION).doc(token).get();
    if (!snap.exists) return null;
    // Best-effort view counter; never block the render on it.
    void adminDb
      .collection(COLLECTION)
      .doc(token)
      .set({ views: ((snap.data()?.views as number) ?? 0) + 1 }, { merge: true })
      .catch(() => {});
    return snap.data() as Passport;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const p = await getPassport(token);
  const name = p?.petName || 'this pet';
  const title = p ? `${name}'s Pet Passport | PawMe` : 'Pet Passport | PawMe';
  const description = p
    ? `${name}${p.breed ? ` · ${p.breed}` : ''} — vaccines, allergies & a shareable ID, made free with PawMe.`
    : 'Make your pet a free digital passport with PawMe.';
  return {
    title,
    description,
    openGraph: { title, description, type: 'profile', images: p?.photoUrl ? [{ url: p.photoUrl }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function Stat({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

export default async function PassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getPassport(token);

  if (!p) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6F2] px-6 text-center">
        <div className="text-5xl">🐾</div>
        <h1 className="mt-4 text-2xl font-black text-zinc-900">Passport not found</h1>
        <p className="mt-2 max-w-sm text-zinc-600">This passport link has expired or doesn&apos;t exist. Make your own free pet passport with PawMe.</p>
        <a href={APP_STORE_URL} className="mt-6 rounded-full bg-[#F0663F] px-6 py-3 font-semibold text-white">Get PawMe</a>
      </main>
    );
  }

  const dangers = [...new Set([...(p.avoid ?? []), ...UNIVERSAL_TOXINS])].slice(0, 12);

  return (
    <main className="min-h-screen bg-[#FAF6F2] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-md">
        {/* Passport card */}
        <div className="overflow-hidden rounded-3xl bg-[#16233A] p-6 shadow-xl">
          <div className="flex gap-4">
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoUrl} alt={p.petName ?? 'Pet'} className="h-40 w-32 rounded-xl border-2 border-amber-300 object-cover" />
            ) : (
              <div className="flex h-40 w-32 items-center justify-center rounded-xl border-2 border-amber-300 bg-white/10 text-4xl">🐾</div>
            )}
            <div className="flex-1 space-y-2.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Passport No.</div>
                <div className="text-sm font-semibold text-white">{p.petIdNo || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Name / Nom</div>
                <div className="font-serif text-3xl font-bold text-white">{p.petName}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Breed / Race</div>
                <div className="text-base font-semibold text-white">{p.breed || 'Unknown'} ✓</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <Stat label="Species" value={p.species ? p.species[0].toUpperCase() + p.species.slice(1) : null} />
            <Stat label="Sex" value={p.gender} />
            <Stat label="Weight" value={p.weightLabel} />
            <Stat label="Age" value={p.ageLabel} />
          </div>

          {p.traits && p.traits.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {p.traits.map((tr) => (
                <span key={tr} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">{tr}</span>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#E2553D]">⚠️ Do not feed</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {dangers.map((d) => (
                <span key={d} className="rounded-full border border-[#E2553D]/60 bg-[#E2553D]/15 px-2.5 py-1 text-[11px] font-medium text-white">{d}</span>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">Made with PawMe · pawme</p>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <h2 className="text-lg font-black text-zinc-900">Make your pet&apos;s free passport</h2>
          <p className="mt-1 text-sm text-zinc-600">Vaccines, allergies & a shareable ID — no signup needed.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a href={APP_STORE_URL} className="rounded-full bg-[#F0663F] px-6 py-3 font-semibold text-white">Download on iPhone</a>
            <a href={PLAY_STORE_URL} className="rounded-full border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-800">Get it on Android</a>
          </div>
        </div>
      </div>
    </main>
  );
}
