import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/auth/tiktok/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('TikTok OAuth error:', error);
    return NextResponse.redirect(`/dashboard/socials?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect('/dashboard/socials?error=no_code_or_state');
  }

  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    return NextResponse.redirect('/dashboard/socials?error=missing_credentials');
  }

  try {
    const pkceRef = adminDb.collection('admin-settings').doc('tiktok-pkce');
    const pkceDoc = await pkceRef.get();

    if (!pkceDoc.exists) {
      console.error('PKCE data not found');
      return NextResponse.redirect('/dashboard/socials?error=pkce_not_found');
    }

    const pkceData = pkceDoc.data();
    
    if (pkceData?.state !== state) {
      console.error('State mismatch');
      return NextResponse.redirect('/dashboard/socials?error=state_mismatch');
    }

    if (pkceData?.expiresAt && Date.now() > pkceData.expiresAt) {
      console.error('PKCE data expired');
      return NextResponse.redirect('/dashboard/socials?error=pkce_expired');
    }

    const codeVerifier = pkceData?.codeVerifier;
    if (!codeVerifier) {
      console.error('Code verifier not found');
      return NextResponse.redirect('/dashboard/socials?error=no_code_verifier');
    }

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
        code_verifier: codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('TikTok token exchange failed:', tokens);
      return NextResponse.redirect('/dashboard/socials?error=token_exchange_failed');
    }

    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();
    const displayName = userData.data?.user?.display_name;

    const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
    await tiktokAuthRef.set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      openId: userData.data?.user?.open_id || null,
      displayName: displayName || null,
      updatedAt: new Date().toISOString(),
    });

    await pkceRef.delete();

    return new NextResponse(
      `<html><body><script>window.close();</script><p>Authentication successful! You can close this window.</p></body></html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    return NextResponse.redirect('/dashboard/socials?error=callback_failed');
  }
}
