import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const GOOGLE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`/socials?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect('/socials?error=no_code');
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect('/socials?error=missing_credentials');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect('/socials?error=token_exchange_failed');
    }

    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const channelData = await channelResponse.json();
    const channelId = channelData.items?.[0]?.id;
    const channelTitle = channelData.items?.[0]?.snippet?.title;

    const youtubeAuthRef = adminDb.collection('admin-settings').doc('youtube-auth');
    await youtubeAuthRef.set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      channelId: channelId || null,
      channelTitle: channelTitle || null,
      updatedAt: new Date().toISOString(),
    });

    return new NextResponse(
      `<html><body><script>window.close();</script><p>Authentication successful! You can close this window.</p></body></html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('/socials?error=callback_failed');
  }
}
