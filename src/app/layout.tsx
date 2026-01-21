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
            toastOptions={{
              style: {
                width: '100%',
                maxWidth: '100vw',
                margin: 0,
                borderRadius: 0,
              },
              className: 'w-full',
              classNames: {
                error: 'bg-destructive text-destructive-foreground border-destructive',
                success: 'bg-green-600 text-white border-green-600',
                warning: 'bg-yellow-600 text-white border-yellow-600',
                info: 'bg-blue-600 text-white border-blue-600',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
