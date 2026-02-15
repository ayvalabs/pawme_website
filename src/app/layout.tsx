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
        {/* PawMe Tracking Helper */}
        <Script id="pawme-tracking" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function trackPawMeLead(firstName, lastName, email) {
  window.dataLayer.push({
    event: 'generate_lead',
    event_id: generateEventId(),
    user_data: { email: email || '', first_name: firstName || '', last_name: lastName || '', phone: '' }
  });
  console.log('PawMe Tracking: Lead event fired');
}
function trackPawMeCheckout(email, firstName, lastName) {
  window.dataLayer.push({
    event: 'begin_checkout',
    event_id: generateEventId(),
    ecommerce: { value: 1.00, currency: 'USD' },
    user_data: { email: email || '', first_name: firstName || '', last_name: lastName || '', phone: '' }
  });
  console.log('PawMe Tracking: Checkout event fired');
}
function trackPawMePurchase(email, firstName, lastName, stripeSessionId) {
  window.dataLayer.push({
    event: 'purchase',
    event_id: generateEventId(),
    ecommerce: { value: 1.00, currency: 'USD', transaction_id: stripeSessionId || 'stripe_' + Date.now() },
    user_data: { email: email || '', first_name: firstName || '', last_name: lastName || '', phone: '' }
  });
  console.log('PawMe Tracking: Purchase event fired');
}`}
        </Script>
        {/* End PawMe Tracking Helper */}
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
