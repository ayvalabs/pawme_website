import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-gate';
import { PushComposer } from './PushComposer';

export const dynamic = 'force-dynamic';

export default async function PushPage() {
  await requireAdmin();
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Re-engagement push</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            Send an Expo push to PawMe app users (iOS + Android).
          </p>
        </div>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/admin/analytics" className="text-[color:var(--color-text-secondary)] hover:underline">Analytics</Link>
          <Link href="/admin/kols" className="text-[color:var(--color-text-secondary)] hover:underline">KOLs</Link>
        </nav>
      </div>
      <PushComposer />
    </main>
  );
}
