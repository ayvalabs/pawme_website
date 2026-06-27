import { requireAdmin } from "@/lib/admin-gate";
import { NewKolForm } from "./NewKolForm";

export const dynamic = "force-dynamic";

export default async function NewKolPage() {
  await requireAdmin();
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-black tracking-tight">Add KOL</h1>
      <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
        Code becomes the Firestore doc ID, the ASC promo-batch label, the Play
        vanity code, and the slug at <code>pawme.ayvalabs.com/r/CODE</code>. Use
        uppercase letters/numbers only, no spaces.
      </p>
      <div className="mt-8">
        <NewKolForm />
      </div>
    </main>
  );
}
