import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { TwitterApi } from 'twitter-api-v2';

export async function POST(request: NextRequest) {
  try {
    const { tweetId } = await request.json();

    if (!tweetId) {
      return NextResponse.json(
        { error: 'Missing tweetId' },
        { status: 400 }
      );
    }

    // Fetch tweet from Firestore
    const tweetDoc = await adminDb.collection('scheduled-posts').doc(tweetId).get();
    
    if (!tweetDoc.exists) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    const tweet = tweetDoc.data();

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    const rwClient = client.readWrite;

    // Upload media if present
    const mediaIds: string[] = [];
    if (tweet.mediaUrls && tweet.mediaUrls.length > 0) {
      for (const url of tweet.mediaUrls) {
        try {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const mediaId = await rwClient.v1.uploadMedia(Buffer.from(buffer), {
            mimeType: response.headers.get('content-type') || 'image/jpeg',
          });
          mediaIds.push(mediaId);
        } catch (error) {
          console.error('Failed to upload media:', error);
        }
      }
    }

    // Post main tweet
    const mainTweet = await rwClient.v2.tweet({
      text: tweet.text,
      media: mediaIds.length > 0 ? { media_ids: mediaIds } : undefined,
    });

    const xPostId = mainTweet.data.id;
    const threadPostIds: string[] = [];

    // Post thread tweets if present
    if (tweet.threadTexts && tweet.threadTexts.length > 0) {
      let lastTweetId = xPostId;
      
      for (const threadText of tweet.threadTexts) {
        const threadTweet = await rwClient.v2.tweet({
          text: threadText,
          reply: { in_reply_to_tweet_id: lastTweetId },
        });
        threadPostIds.push(threadTweet.data.id);
        lastTweetId = threadTweet.data.id;
      }
    }

    // Update Firestore
    await adminDb.collection('scheduled-posts').doc(tweetId).update({
      status: 'published',
      xPostId,
      threadPostIds: threadPostIds.length > 0 ? threadPostIds : null,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      xPostId,
      threadPostIds,
    });
  } catch (error) {
    console.error('Failed to post tweet:', error);
    return NextResponse.json(
      { error: 'Failed to post tweet', details: String(error) },
      { status: 500 }
    );
  }
}
