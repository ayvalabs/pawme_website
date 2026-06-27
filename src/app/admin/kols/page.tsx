import Link from "next/link";
import { requireAdmin } from "@/lib/admin-gate";
import { KolList } from "./KolList";

export const dynamic = "force-dynamic";

export default async function KolsPage() {
  await requireAdmin();

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">KOL Tracker</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            One row per creator. Stats refresh from RevenueCat on demand.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/analytics"
            className="text-sm font-semibold text-[color:var(--color-text-secondary)] hover:underline"
          >
            Analytics
          </Link>
          <Link
            href="/admin/promo"
            className="text-sm font-semibold text-[color:var(--color-text-secondary)] hover:underline"
          >
            Promo codes
          </Link>
          <Link
            href="/admin/kols/new"
            className="rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
          >
            + Add KOL
          </Link>
        </div>
      </div>

      <KolList />
    </main>
  );
}
