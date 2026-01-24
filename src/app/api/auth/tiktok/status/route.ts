import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
    const doc = await tiktokAuthRef.get();

    if (!doc.exists) {
      return NextResponse.json({ connected: false });
    }

    const data = doc.data();
    const isExpired = data?.expiresAt ? Date.now() > data.expiresAt : true;

    return NextResponse.json({
      connected: true,
      displayName: data?.displayName || null,
      openId: data?.openId || null,
      isExpired,
    });
  } catch (error) {
    console.error('Error checking TikTok auth status:', error);
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
  }
}
