import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/context/AuthContext';
import { Toaster } from '@/app/components/ui/sonner';
import { FaviconHandler } from './components/favicon-handler';

export const metadata: Metadata = {
  title: 'PawMe - AI Companion Robot for Pets | Coming Soon on Kickstarter',
  description: 'PawMe is an AI-powered companion robot that keeps your pet happy, healthy, and entertained. Join the waitlist for our March 2026 Kickstarter launch!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body">
        <AuthProvider>
          <FaviconHandler />
          {children}
          <Toaster 
            position="bottom-center"
            expand={true}
            richColors={false}
            toastOptions={{
              unstyled: false,
              classNames: {
                toast: 'w-full max-w-full rounded-none border-0 shadow-lg',
                title: 'text-sm font-semibold',
                description: 'text-sm opacity-90',
                error: '!bg-red-600 !text-white !border-red-600',
                success: '!bg-green-600 !text-white !border-green-600',
                warning: '!bg-yellow-600 !text-white !border-yellow-600',
                info: '!bg-blue-600 !text-white !border-blue-600',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
