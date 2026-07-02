
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Reduce peak build memory (helps avoid Vercel OOM/SIGKILL during build).
  experimental: {
    webpackMemoryOptimizations: true,
  },
  // Keep heavy native/server-only deps out of the webpack bundle AND the
  // build-trace step — stops the Vercel OOM (SIGKILL) + the long "Collecting
  // build traces" hang. (Additive only; does NOT remove any /api routes, so
  // the current production app that still calls www keeps working.)
  serverExternalPackages: [
    'firebase-admin',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'protobufjs',
    'google-gax',
    '@google-cloud/firestore',
    'google-auth-library',
    'farmhash-modern',
    'stripe',
    'sharp',
  ],
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
      // Mobile API routes for shop / promo / invite were previously proxied
      // to pawpilot.ayvalabs.com while pawme_website didn't host them.
      // Removed on 2026-06-27 — the v2 mobile-api-port branch now hosts
      // these routes locally (src/app/api/mobile/{shop,promo,invite}/...),
      // and the PawMe app (v2.0) hits pawme.ayvalabs.com directly.
    ];
  },
};

export default nextConfig;
