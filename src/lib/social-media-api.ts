import type {
  FacebookPageStats,
  FacebookPost,
  InstagramStats,
  InstagramPost,
} from '@/types/social-media';

const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID!;
const IG_ACCOUNT_ID = process.env.NEXT_PUBLIC_IG_BUSINESS_ACCOUNT_ID!;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN!;
const API_VERSION = process.env.GRAPH_API_VERSION || 'v24.0';

const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export async function getFacebookPageStats(): Promise<FacebookPageStats> {
  const fields = 'name,fan_count,engagement,talking_about_count';
  const url = `${BASE_URL}/${FB_PAGE_ID}?fields=${fields}&access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API Error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function getFacebookPosts(limit = 25): Promise<FacebookPost[]> {
  const fields = 'id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares';
  const url = `${BASE_URL}/${FB_PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getInstagramStats(): Promise<InstagramStats> {
  const fields = 'id,username,followers_count,follows_count,media_count';
  const url = `${BASE_URL}/${IG_ACCOUNT_ID}?fields=${fields}&access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Instagram API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function getInstagramPosts(limit = 25): Promise<InstagramPost[]> {
  const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
  const url = `${BASE_URL}/${IG_ACCOUNT_ID}/media?fields=${fields}&limit=${limit}&access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Instagram API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getAllSocialMediaData() {
  try {
    const [fbStats, fbPosts, igStats, igPosts] = await Promise.all([
      getFacebookPageStats(),
      getFacebookPosts(),
      getInstagramStats(),
      getInstagramPosts(),
    ]);

    return {
      facebook: {
        stats: fbStats,
        posts: fbPosts,
      },
      instagram: {
        stats: igStats,
        posts: igPosts,
      },
    };
  } catch (error) {
    console.error('Error fetching social media data:', error);
    throw error;
  }
}
