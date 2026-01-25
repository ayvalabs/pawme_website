import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/auth/tiktok/callback';

function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('hex');
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('hex');
}

export async function GET() {
  console.log('TikTok connect route called');
  console.log('TIKTOK_CLIENT_KEY:', TIKTOK_CLIENT_KEY ? 'Present' : 'Missing');
  console.log('REDIRECT_URI:', REDIRECT_URI);
  
  if (!TIKTOK_CLIENT_KEY) {
    console.error('TikTok Client Key not configured');
    return NextResponse.json({ error: 'TikTok Client Key not configured' }, { status: 500 });
  }

  const scopes = [
    'user.info.basic',
    'video.list',
    'user.info.stats',
  ];

  const csrfState = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  try {
    const pkceRef = adminDb.collection('admin-settings').doc('tiktok-pkce');
    await pkceRef.set({
      state: csrfState,
      codeVerifier: codeVerifier,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000),
    });
  } catch (error) {
    console.error('Failed to store PKCE data:', error);
    return NextResponse.json({ error: 'Failed to initialize OAuth' }, { status: 500 });
  }

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.append('client_key', TIKTOK_CLIENT_KEY);
  authUrl.searchParams.append('scope', scopes.join(','));
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('state', csrfState);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  console.log('Generated auth URL with PKCE');
  return NextResponse.redirect(authUrl.toString());
}
