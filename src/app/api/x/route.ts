import { NextResponse } from 'next/server';

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_USERNAME = 'pawme_ai';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  console.log('X API route called');
  console.log('Bearer Token:', X_BEARER_TOKEN ? 'Present' : 'Missing');
  console.log('Endpoint:', endpoint);

  if (!X_BEARER_TOKEN) {
    console.error('X Bearer Token not configured');
    return NextResponse.json({ error: 'X Bearer Token not configured' }, { status: 500 });
  }

  try {
    if (endpoint === 'stats') {
      console.log('Fetching X user stats for:', X_USERNAME);
      
      const response = await fetch(
        `https://api.x.com/2/users/by/username/${X_USERNAME}?user.fields=public_metrics,profile_image_url,description`,
        {
          headers: {
            Authorization: `Bearer ${X_BEARER_TOKEN}`,
          },
        }
      );

      const data = await response.json();
      console.log('X API response:', data);

      if (data.errors) {
        console.error('X API errors:', data.errors);
        return NextResponse.json({ error: data.errors[0]?.message || 'Failed to fetch X data' }, { status: 400 });
      }

      return NextResponse.json(data);
    }

    if (endpoint === 'tweets') {
      console.log('Fetching recent tweets for:', X_USERNAME);

      // First get user ID
      const userResponse = await fetch(
        `https://api.x.com/2/users/by/username/${X_USERNAME}`,
        {
          headers: {
            Authorization: `Bearer ${X_BEARER_TOKEN}`,
          },
        }
      );

      const userData = await userResponse.json();
      const userId = userData.data?.id;

      if (!userId) {
        console.error('Failed to get user ID');
        return NextResponse.json({ error: 'Failed to get user ID' }, { status: 400 });
      }

      // Get user's tweets
      const tweetsResponse = await fetch(
        `https://api.x.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,text,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
        {
          headers: {
            Authorization: `Bearer ${X_BEARER_TOKEN}`,
          },
        }
      );

      const tweetsData = await tweetsResponse.json();
      console.log('X tweets response:', tweetsData);

      if (tweetsData.errors) {
        console.error('X API errors:', tweetsData.errors);
        return NextResponse.json({ error: tweetsData.errors[0]?.message || 'Failed to fetch tweets' }, { status: 400 });
      }

      // Map media to tweets
      if (tweetsData.data && tweetsData.includes?.media) {
        tweetsData.data = tweetsData.data.map((tweet: any) => {
          if (tweet.attachments?.media_keys) {
            tweet.media = tweet.attachments.media_keys.map((key: string) =>
              tweetsData.includes.media.find((m: any) => m.media_key === key)
            ).filter(Boolean);
          }
          return tweet;
        });
      }

      return NextResponse.json(tweetsData);
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error: any) {
    console.error('X API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch X data' }, { status: 500 });
  }
}
