import { AdminGuard } from '@/app/components/admin-guard';

export default function Tweets2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  );
}
