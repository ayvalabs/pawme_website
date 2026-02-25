
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
    ];
  },
};

export default nextConfig;
