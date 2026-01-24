import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

async function getAccessToken() {
  const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
  const doc = await tiktokAuthRef.get();

  if (!doc.exists) {
    throw new Error('TikTok not connected');
  }

  const data = doc.data();
  if (!data?.accessToken) {
    throw new Error('No access token found');
  }

  return data.accessToken;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  try {
    const accessToken = await getAccessToken();

    if (endpoint === 'stats') {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (endpoint === 'videos') {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_count: 20,
          }),
        }
      );
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error: any) {
    console.error('TikTok API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch TikTok data' }, { status: 500 });
  }
}
