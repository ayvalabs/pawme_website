import { requireAdmin } from "@/lib/admin-gate";
import { KolDetail } from "./KolDetail";

export const dynamic = "force-dynamic";

export default async function KolDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdmin();
  const { code } = await params;
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <KolDetail code={code.toUpperCase()} />
    </main>
  );
}
