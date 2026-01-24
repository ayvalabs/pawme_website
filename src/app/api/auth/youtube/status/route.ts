import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const youtubeAuthRef = adminDb.collection('admin-settings').doc('youtube-auth');
    const doc = await youtubeAuthRef.get();

    if (!doc.exists) {
      return NextResponse.json({ connected: false });
    }

    const data = doc.data();
    const isExpired = data?.expiresAt ? Date.now() > data.expiresAt : true;

    return NextResponse.json({
      connected: true,
      channelTitle: data?.channelTitle || null,
      channelId: data?.channelId || null,
      isExpired,
    });
  } catch (error) {
    console.error('Error checking YouTube auth status:', error);
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
  }
}
