import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-gate';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await requireAdmin();

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            Live app metrics from Firebase Analytics (GA4).
          </p>
        </div>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/admin/push" className="text-[color:var(--color-text-secondary)] hover:underline">
            Push
          </Link>
          <Link href="/admin/kols" className="text-[color:var(--color-text-secondary)] hover:underline">
            KOLs
          </Link>
          <Link href="/admin/promo" className="text-[color:var(--color-text-secondary)] hover:underline">
            Promo codes
          </Link>
        </nav>
      </div>

      <AnalyticsDashboard />
    </main>
  );
}
