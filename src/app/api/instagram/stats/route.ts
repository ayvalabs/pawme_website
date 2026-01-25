import { NextResponse } from 'next/server';
import { getInstagramStats } from '@/lib/social-media-api';

export async function GET() {
  try {
    const stats = await getInstagramStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Instagram stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Instagram stats' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 300;
