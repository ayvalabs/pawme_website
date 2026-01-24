import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const youtubeAuthRef = adminDb.collection('admin-settings').doc('youtube-auth');
    await youtubeAuthRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting YouTube:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
