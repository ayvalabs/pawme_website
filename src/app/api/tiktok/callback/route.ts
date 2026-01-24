import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('TikTok OAuth callback received');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('Client Key:', TIKTOK_CLIENT_KEY ? 'Present' : 'Missing');
  console.log('Client Secret:', TIKTOK_CLIENT_SECRET ? 'Present' : 'Missing');
  console.log('Redirect URI:', REDIRECT_URI);

  const baseUrl = new URL(request.url).origin;

  if (error) {
    console.error('TikTok OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/socials?error=${error}`);
  }

  if (!code) {
    console.error('No code received');
    return NextResponse.redirect(`${baseUrl}/socials?error=no_code`);
  }

  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    console.error('Missing TikTok credentials');
    return NextResponse.redirect(`${baseUrl}/socials?error=missing_credentials`);
  }

  try {
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    console.log('TikTok token response:', tokens);

    if (!tokens.access_token) {
      console.error('TikTok token exchange failed:', tokens);
      return NextResponse.redirect(`${baseUrl}/socials?error=token_exchange_failed`);
    }

    console.log('TikTok access token received successfully');

    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('TikTok user data:', userData);
    
    const displayName = userData.data?.user?.display_name;
    console.log('TikTok display name:', displayName);

    const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
    await tiktokAuthRef.set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      openId: userData.data?.user?.open_id || null,
      displayName: displayName || null,
      updatedAt: new Date().toISOString(),
    });

    console.log('TikTok auth saved to Firestore successfully');

    return new NextResponse(
      `<html><body><script>window.close();</script><p>Authentication successful! You can close this window.</p></body></html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/socials?error=callback_failed`);
  }
}
