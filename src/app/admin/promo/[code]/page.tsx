import { requireAdmin } from "@/lib/admin-gate";
import { PromoDetail } from "./PromoDetail";

export const dynamic = "force-dynamic";

export default async function PromoDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdmin();
  const { code } = await params;
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <PromoDetail code={code.toUpperCase()} />
    </main>
  );
}
