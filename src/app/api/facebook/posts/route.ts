import { NextResponse } from 'next/server';
import { getFacebookPosts } from '@/lib/social-media-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    const posts = await getFacebookPosts(limit);
    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Facebook posts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Facebook posts' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 300;
