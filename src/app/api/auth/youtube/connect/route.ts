import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

export async function GET() {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Google Client ID not configured' }, { status: 500 });
  }

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
