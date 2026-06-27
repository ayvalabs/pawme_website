import { redirect } from "next/navigation";
import { setAdminCookie, isAdmin } from "@/lib/admin-gate";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") || "");
  const ok = await setAdminCookie(password);
  if (ok) redirect("/admin/kols");
  redirect("/admin/login?error=1");
}

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/kols");
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[color:var(--color-background-soft)]">
      <form
        action={login}
        className="w-full max-w-sm bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-2xl font-black tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
          Enter admin password to continue.
        </p>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
        />
        {sp.error && (
          <p className="mt-3 text-xs text-red-600">
            Incorrect password. Try again.
          </p>
        )}
        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-[color:var(--color-primary)] text-white py-3 text-sm font-semibold hover:bg-[color:var(--color-primary-dark)]"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
