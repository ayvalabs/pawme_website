import Link from "next/link";
import { requireAdmin } from "@/lib/admin-gate";
import { PromoList } from "./PromoList";

export const dynamic = "force-dynamic";

export default async function PromoPage() {
  await requireAdmin();
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Promo codes</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            Custom codes redeemed inside the app. Grant Pro for any duration —
            independent of App Store or Play Store quotas.
          </p>
        </div>
        <Link
          href="/admin/promo/new"
          className="rounded-full bg-[color:var(--color-primary)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
        >
          + Create codes
        </Link>
      </div>
      <PromoList />
    </main>
  );
}
