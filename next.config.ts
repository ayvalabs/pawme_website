
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  allowedDevOrigins: ['http://192.168.68.100:3000'],
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://pawme-bc0a0.firebaseapp.com/__/auth/:path*',
      },
      // PawPilot Shop proxy: the released mobile app calls www.ayvalabs.com
      // (this site), but the first-party shop endpoints live on the PawPilot
      // site. Forward /api/mobile/shop/* to pawpilot.ayvalabs.com so the live
      // app's Shop tab works without an app rebuild. This site has no
      // /api/mobile/shop route of its own, so nothing is shadowed.
      {
        source: '/api/mobile/shop/:path*',
        destination: 'https://pawpilot.ayvalabs.com/api/mobile/shop/:path*',
      },
      // PawPilot promo / invite proxy: same reason as the shop above. The
      // released app redeems coupon/influencer codes and generates invite
      // codes against www.ayvalabs.com, but the promo system (promoCodes
      // Firestore + RevenueCat grant) only exists on the PawPilot site.
      // Forward both so coupon redemption + invites work on the live app
      // without a rebuild. This site has no promo/invite routes to shadow.
      {
        source: '/api/mobile/promo/:path*',
        destination: 'https://pawpilot.ayvalabs.com/api/mobile/promo/:path*',
      },
      {
        source: '/api/mobile/invite/:path*',
        destination: 'https://pawpilot.ayvalabs.com/api/mobile/invite/:path*',
      },
    ];
  },
};

export default nextConfig;
