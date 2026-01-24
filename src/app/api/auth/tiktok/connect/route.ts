import { NextResponse } from 'next/server';

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback';

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

  const csrfState = Math.random().toString(36).substring(2);

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.append('client_key', TIKTOK_CLIENT_KEY);
  authUrl.searchParams.append('scope', scopes.join(','));
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('state', csrfState);

  return NextResponse.redirect(authUrl.toString());
}
