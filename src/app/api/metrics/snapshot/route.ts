import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

export async function POST() {
  console.log('Creating daily metrics snapshot...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Check if snapshot already exists for today
    const snapshotRef = adminDb.collection('daily-metrics').doc(dateKey);
    const existingSnapshot = await snapshotRef.get();

    if (existingSnapshot.exists) {
      console.log('Snapshot already exists for today:', dateKey);
      return NextResponse.json({ 
        message: 'Snapshot already exists for today',
        date: dateKey,
        updated: false
      });
    }

    const metrics: any = {
      date: dateKey,
      timestamp: new Date().toISOString(),
    };

    // Fetch YouTube metrics
    if (YOUTUBE_API_KEY && YOUTUBE_CHANNEL_ID) {
      try {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
        );
        const youtubeData = await youtubeResponse.json();
        
        if (youtubeData.items?.[0]?.statistics) {
          metrics.youtube = {
            subscribers: parseInt(youtubeData.items[0].statistics.subscriberCount || '0'),
            views: parseInt(youtubeData.items[0].statistics.viewCount || '0'),
            videos: parseInt(youtubeData.items[0].statistics.videoCount || '0'),
          };
          console.log('YouTube metrics captured:', metrics.youtube);
        }
      } catch (error) {
        console.error('Error fetching YouTube metrics:', error);
      }
    }

    // Fetch X (Twitter) metrics
    if (X_BEARER_TOKEN) {
      try {
        const xResponse = await fetch(
          'https://api.x.com/2/users/by/username/pawme_ai?user.fields=public_metrics',
          {
            headers: {
              Authorization: `Bearer ${X_BEARER_TOKEN}`,
            },
          }
        );
        const xData = await xResponse.json();
        
        if (xData.data?.public_metrics) {
          metrics.x = {
            followers: xData.data.public_metrics.followers_count || 0,
            following: xData.data.public_metrics.following_count || 0,
            tweets: xData.data.public_metrics.tweet_count || 0,
            likes: xData.data.public_metrics.like_count || 0,
          };
          console.log('X metrics captured:', metrics.x);
        }
      } catch (error) {
        console.error('Error fetching X metrics:', error);
      }
    }

    // Fetch TikTok metrics (if connected)
    try {
      const tiktokAuthRef = adminDb.collection('admin-settings').doc('tiktok-auth');
      const tiktokAuth = await tiktokAuthRef.get();
      
      if (tiktokAuth.exists) {
        const authData = tiktokAuth.data();
        const isExpired = authData?.expiresAt ? Date.now() > authData.expiresAt : true;
        
        if (!isExpired && authData?.accessToken) {
          const tiktokResponse = await fetch(
            'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count',
            {
              headers: {
                Authorization: `Bearer ${authData.accessToken}`,
              },
            }
          );
          const tiktokData = await tiktokResponse.json();
          
          if (tiktokData.data?.user) {
            metrics.tiktok = {
              followers: tiktokData.data.user.follower_count || 0,
              following: tiktokData.data.user.following_count || 0,
              likes: tiktokData.data.user.likes_count || 0,
              videos: tiktokData.data.user.video_count || 0,
            };
            console.log('TikTok metrics captured:', metrics.tiktok);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching TikTok metrics:', error);
    }

    // Fetch website signups count
    try {
      const usersRef = adminDb.collection('users');
      const totalSnapshot = await usersRef.count().get();
      metrics.website = {
        totalSignups: totalSnapshot.data().count,
      };
      console.log('Website metrics captured:', metrics.website);
    } catch (error) {
      console.error('Error fetching website metrics:', error);
    }

    // Save snapshot
    await snapshotRef.set(metrics);
    console.log('Daily snapshot saved successfully:', dateKey);

    return NextResponse.json({
      message: 'Daily snapshot created successfully',
      date: dateKey,
      metrics,
      updated: true
    });

  } catch (error: any) {
    console.error('Error creating daily snapshot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const days = 30; // Last 30 days
    const metricsRef = adminDb.collection('daily-metrics');
    
    const snapshot = await metricsRef
      .orderBy('date', 'desc')
      .limit(days)
      .get();

    const metrics = snapshot.docs.map(doc => doc.data());

    return NextResponse.json({
      metrics: metrics.reverse(), // Oldest to newest for charting
      count: metrics.length
    });

  } catch (error: any) {
    console.error('Error fetching daily metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
