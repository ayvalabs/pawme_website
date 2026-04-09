import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pillar = searchParams.get('pillar');

    let query = adminDb.collection('media-library').where('status', '==', 'available');

    if (pillar && pillar !== 'all') {
      query = query.where('usableFor', 'array-contains', pillar);
    }

    const snapshot = await query.get();

    const media = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Failed to fetch media library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media library' },
      { status: 500 }
    );
  }
}
