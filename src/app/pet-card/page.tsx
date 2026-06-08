import type { Metadata } from 'next';
import { PetCardClient } from './PetCardClient';

export const metadata: Metadata = {
  title: 'Free AI Pet Trading Card — turn your pet photo into art | PawMe',
  description:
    'Upload your dog or cat photo and get a free, shareable AI pet trading card with breed, age and a stylised portrait. No signup. Made by PawMe.',
  alternates: { canonical: '/pet-card' },
  openGraph: {
    title: 'Free AI Pet Trading Card | PawMe',
    description:
      'Turn your pet photo into a shareable AI trading card — breed, stats and a stylised portrait. Free, no signup.',
    type: 'website',
  },
};

export default function PetCardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50 px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-medium text-indigo-700">
          🐾 Free · No signup
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl">
          Make your pet&apos;s{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            trading card
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-zinc-600">
          Upload a photo. Our AI identifies the breed and paints a stylised
          portrait, then drops it onto a card you can share anywhere.
        </p>
      </div>

      <div className="mt-10">
        <PetCardClient />
      </div>

      <p className="mx-auto mt-10 max-w-md text-center text-xs text-zinc-400">
        Breed and age are AI estimates for fun — not veterinary advice. Photos
        are used only to make your card.
      </p>
    </main>
  );
}
