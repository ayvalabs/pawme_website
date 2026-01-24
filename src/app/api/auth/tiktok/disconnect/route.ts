import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
    await tiktokAuthRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting TikTok:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
