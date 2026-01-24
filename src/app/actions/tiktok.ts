'use server';

interface TikTokVideo {
  id: string;
  title: string;
  embed_link: string;
  cover_image_url: string;
  video_description: string;
  view_count: number;
  like_count: number;
  share_count: number;
}

interface TikTokApiResponse {
  data: {
    videos: TikTokVideo[];
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Fetch TikTok videos using TikTok Display API
 * Requires TikTok Developer credentials
 * Apply at: https://developers.tiktok.com/
 */
export async function fetchTikTokVideos(): Promise<TikTokVideo[]> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.warn('⚠️ TIKTOK_ACCESS_TOKEN not configured. Using fallback videos.');
    return getFallbackVideos();
  }

  try {
    // TikTok Display API endpoint to fetch user videos
    const response = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,embed_link,cover_image_url,video_description,view_count,like_count,share_count',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_count: 5, // Fetch top 5 videos
        }),
        next: {
          revalidate: 3600, // Cache for 1 hour
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data: TikTokApiResponse = await response.json();

    if (data.error) {
      throw new Error(`TikTok API error: ${data.error.message}`);
    }

    // Sort by view count to get most viewed
    const sortedVideos = data.data.videos.sort((a, b) => b.view_count - a.view_count);
    
    return sortedVideos.slice(0, 5);
  } catch (error) {
    console.error('❌ Failed to fetch TikTok videos:', error);
    return getFallbackVideos();
  }
}

/**
 * Fallback videos when API is not configured
 * Replace these with your actual video URLs
 */
function getFallbackVideos(): TikTokVideo[] {
  return [
    {
      id: '7234567890123456789',
      title: 'Meet PawMe - Your Pet\'s AI Companion',
      embed_link: 'https://www.tiktok.com/embed/7234567890123456789',
      cover_image_url: '/placeholder-tiktok-1.jpg',
      video_description: 'Introducing PawMe - the future of pet care! 🐾',
      view_count: 50000,
      like_count: 5000,
      share_count: 500,
    },
    {
      id: '7234567890123456790',
      title: 'How PawMe Understands Your Pet',
      embed_link: 'https://www.tiktok.com/embed/7234567890123456790',
      cover_image_url: '/placeholder-tiktok-2.jpg',
      video_description: 'See how our AI technology works! 🤖',
      view_count: 45000,
      like_count: 4500,
      share_count: 450,
    },
    {
      id: '7234567890123456791',
      title: 'Behind the Scenes at PawMe',
      embed_link: 'https://www.tiktok.com/embed/7234567890123456791',
      cover_image_url: '/placeholder-tiktok-3.jpg',
      video_description: 'A peek into our development process! 👀',
      view_count: 40000,
      like_count: 4000,
      share_count: 400,
    },
    {
      id: '7234567890123456792',
      title: 'Pet Parents Love PawMe',
      embed_link: 'https://www.tiktok.com/embed/7234567890123456792',
      cover_image_url: '/placeholder-tiktok-4.jpg',
      video_description: 'Real testimonials from our beta testers! ❤️',
      view_count: 35000,
      like_count: 3500,
      share_count: 350,
    },
    {
      id: '7234567890123456793',
      title: 'Join the PawMe Community',
      embed_link: 'https://www.tiktok.com/embed/7234567890123456793',
      cover_image_url: '/placeholder-tiktok-5.jpg',
      video_description: 'Be part of the pet tech revolution! 🚀',
      view_count: 30000,
      like_count: 3000,
      share_count: 300,
    },
  ];
}

/**
 * Get TikTok OAuth URL for authorization
 * Users need to authorize your app to access their videos
 */
export async function getTikTokAuthUrl(): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/tiktok/callback';
  
  if (!clientKey) {
    throw new Error('TIKTOK_CLIENT_KEY not configured');
  }

  const csrfState = Math.random().toString(36).substring(7);
  
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.append('client_key', clientKey);
  authUrl.searchParams.append('scope', 'user.info.basic,video.list');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', csrfState);

  return authUrl.toString();
}
