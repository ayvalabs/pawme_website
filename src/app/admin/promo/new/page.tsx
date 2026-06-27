import { requireAdmin } from "@/lib/admin-gate";
import { NewPromoForm } from "./NewPromoForm";

export const dynamic = "force-dynamic";

export default async function NewPromoPage() {
  await requireAdmin();
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-black tracking-tight">Create promo codes</h1>
      <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
        Generate a single named code, or bulk-create unique codes for a
        KOL/Fiverr/Friends batch.
      </p>
      <div className="mt-8">
        <NewPromoForm />
      </div>
    </main>
  );
}
