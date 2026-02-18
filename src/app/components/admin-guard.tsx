'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user?.email) {
      router.replace('/');
      return;
    }

    const checkAdmin = async () => {
      try {
        const { isAdmin: checkIsAdmin } = await import('@/app/actions/admin');
        const result = await checkIsAdmin(user.email!);
        if (!result) {
          router.replace('/leaderboard');
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        router.replace('/leaderboard');
      }
    };

    checkAdmin();
  }, [user, loading, router]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
