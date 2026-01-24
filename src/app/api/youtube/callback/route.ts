import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const GOOGLE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('YouTube OAuth callback received');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('Client ID:', GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
  console.log('Client Secret:', GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
  console.log('Redirect URI:', REDIRECT_URI);

  const baseUrl = new URL(request.url).origin;

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/socials?error=${error}`);
  }

  if (!code) {
    console.error('No code received');
    return NextResponse.redirect(`${baseUrl}/socials?error=no_code`);
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing credentials');
    return NextResponse.redirect(`${baseUrl}/socials?error=missing_credentials`);
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

    console.log('Token response:', tokens);

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(`${baseUrl}/socials?error=token_exchange_failed`);
    }

    console.log('Access token received successfully');

    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const channelData = await channelResponse.json();
    console.log('Channel data:', channelData);
    
    const channelId = channelData.items?.[0]?.id;
    const channelTitle = channelData.items?.[0]?.snippet?.title;
    
    console.log('Channel ID:', channelId);
    console.log('Channel Title:', channelTitle);

    const youtubeAuthRef = adminDb.collection('admin-settings').doc('youtube-auth');
    await youtubeAuthRef.set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      channelId: channelId || null,
      channelTitle: channelTitle || null,
      updatedAt: new Date().toISOString(),
    });

    console.log('YouTube auth saved to Firestore successfully');

    return new NextResponse(
      `<html><body><script>window.close();</script><p>Authentication successful! You can close this window.</p></body></html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/socials?error=callback_failed`);
  }
}
