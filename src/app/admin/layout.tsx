import Link from "next/link";
import { isAdmin, clearAdminCookie } from "@/lib/admin-gate";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await clearAdminCookie();
  redirect("/admin/login");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <div className="min-h-screen bg-[color:var(--color-background-soft)]">
      {admin && (
        <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin/kols" className="font-black text-lg">
                PawMe Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/admin/kols"
                  className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]"
                >
                  KOLs
                </Link>
                <Link
                  href="/admin/promo"
                  className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]"
                >
                  Promo codes
                </Link>
              </nav>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
