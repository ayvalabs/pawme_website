import type { Metadata } from 'next';
import Script from 'next/script';
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
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MGGJVX7P');`}
        </Script>
        {/* End Google Tag Manager */}
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
