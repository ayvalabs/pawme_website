
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
    ];
  },
};

export default nextConfig;
