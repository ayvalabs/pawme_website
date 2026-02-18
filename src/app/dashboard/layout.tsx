import { Sidebar } from '@/app/components/sidebar';
import { AdminGuard } from '@/app/components/admin-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
