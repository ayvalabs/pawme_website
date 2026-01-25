import { NextResponse } from 'next/server';
import { getFacebookPageStats } from '@/lib/social-media-api';

export async function GET() {
  try {
    const stats = await getFacebookPageStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Facebook stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Facebook stats' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 300;
