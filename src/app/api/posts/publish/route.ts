import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { postTweet, uploadMediaToX } from '@/lib/x-publisher';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVideo,
  formatForTelegram,
} from '@/lib/telegram-publisher';

const COLLECTION = 'scheduled-posts';

/**
 * POST /api/posts/publish
 * Cron endpoint — runs every 15 minutes via Vercel Cron
 * Finds all posts with status='scheduled' and scheduledAt <= now, then publishes them
 */
export async function POST(request: Request) {
  console.log('📤 Post publisher cron running...');

  // Auth check (same pattern as metrics/snapshot)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  try {
    // Find all due posts
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .orderBy('scheduledAt', 'asc')
      .limit(5) // Process max 5 per cron run to avoid timeouts
      .get();

    if (snapshot.empty) {
      console.log('No posts due for publishing');
      return NextResponse.json({ message: 'No posts due', published: 0 });
    }

    console.log(`Found ${snapshot.size} posts to publish`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const doc of snapshot.docs) {
      const post = { id: doc.id, ...doc.data() } as any;
      if (post.threadMediaMap && typeof post.threadMediaMap === 'string') {
        post.threadMediaMap = JSON.parse(post.threadMediaMap);
      }
      console.log(`Publishing post ${post.id}: "${post.text.substring(0, 50)}..."`);

      try {
        let xPostId: string | undefined;
        let telegramMessageId: number | undefined;
        let threadPostIds: string[] = [];

        // Publish to X (Twitter)
        if (post.platforms === 'x' || post.platforms === 'both') {
          try {
            // Upload media first if present
            const mediaIds: string[] = [];
            if (post.mediaUrls?.length > 0) {
              for (let i = 0; i < post.mediaUrls.length; i++) {
                const mediaUrl = post.mediaUrls[i];
                const mediaType = post.mediaTypes?.[i] || 'image';

                // Download media from Firebase Storage URL
                const mediaResponse = await fetch(mediaUrl);
                if (!mediaResponse.ok) {
                  console.warn(`Failed to download media: ${mediaUrl}`);
                  continue;
                }
                const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());

                const mimeType =
                  mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
                const mediaId = await uploadMediaToX(
                  mediaBuffer,
                  mimeType as any
                );
                mediaIds.push(mediaId);
              }
            }

            // Build tweet text with hashtags and mentions
            let tweetText = post.text;
            if (post.hashtags?.length > 0) {
              tweetText += '\n\n' + post.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
            }
            if (post.ctaUrl) {
              tweetText += '\n\n' + post.ctaUrl;
            }

            // Distribute media across thread tweets using threadMediaMap
            // threadMediaMap[0] = main tweet media indices, threadMediaMap[1] = first reply, etc.
            const hasThreadMediaMap = post.threadMediaMap?.length > 0;

            // Get media IDs for the main tweet
            let mainMediaIds = mediaIds; // default: all media on main tweet
            if (hasThreadMediaMap && post.threadMediaMap[0]) {
              mainMediaIds = (post.threadMediaMap[0] as number[])
                .map((idx: number) => mediaIds[idx])
                .filter((id: string | undefined): id is string => !!id);
            }

            const tweet = await postTweet(tweetText, mainMediaIds);
            xPostId = tweet.id;
            console.log(`✅ Posted to X: ${xPostId}`);

            // Post thread replies if this is a thread
            if (post.threadTexts?.length > 0) {
              let lastTweetId = xPostId;
              for (let t = 0; t < post.threadTexts.length; t++) {
                try {
                  // Small delay between thread tweets to avoid rate limits
                  if (t > 0) await new Promise(r => setTimeout(r, 1000));

                  // Get media IDs for this thread reply using threadMediaMap
                  let threadMediaIds: string[] = [];
                  const tweetPos = t + 1; // position 0 is main tweet
                  if (hasThreadMediaMap && post.threadMediaMap[tweetPos]) {
                    threadMediaIds = (post.threadMediaMap[tweetPos] as number[])
                      .map((idx: number) => mediaIds[idx])
                      .filter((id: string | undefined): id is string => !!id);
                  }

                  const threadTweet = await postTweet(post.threadTexts[t], threadMediaIds, lastTweetId);
                  threadPostIds.push(threadTweet.id);
                  lastTweetId = threadTweet.id;
                  console.log(`  🧵 Thread ${t + 2}/${post.threadTexts.length + 1}: ${threadTweet.id}${threadMediaIds.length > 0 ? ` (${threadMediaIds.length} media)` : ''}`);
                } catch (threadErr: any) {
                  console.error(`  ❌ Thread tweet ${t + 2} failed:`, threadErr.message);
                  // Continue with remaining thread tweets
                }
              }
            }
          } catch (xError: any) {
            console.error(`❌ X posting failed for ${post.id}:`, xError.message);
            // Continue to Telegram even if X fails
            if (post.platforms === 'x') throw xError;
          }
        }

        // Publish to Telegram
        if (post.platforms === 'telegram' || post.platforms === 'both') {
          try {
            // For Telegram, combine main text + thread into one message
            let telegramText = post.text;
            if (post.threadTexts?.length > 0) {
              telegramText += '\n\n' + post.threadTexts.map((t: string, i: number) => `${i + 2}/ ${t}`).join('\n\n');
            }
            if (post.hashtags?.length > 0) {
              telegramText += '\n\n' + post.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
            }
            if (post.ctaUrl) {
              telegramText += '\n\n' + post.ctaUrl;
            }

            // Add X post link if we just posted there
            if (xPostId) {
              telegramText += `\n\n🐦 <a href="https://x.com/pawme_ai/status/${xPostId}">View on X</a>`;
            }

            const formattedText = formatForTelegram(telegramText);

            if (post.mediaUrls?.length > 0) {
              const firstMediaType = post.mediaTypes?.[0] || 'image';
              const firstMediaUrl = post.mediaUrls[0];

              if (firstMediaType === 'video') {
                const msgId = await sendTelegramVideo(firstMediaUrl, formattedText);
                telegramMessageId = msgId || undefined;
              } else {
                const msgId = await sendTelegramPhoto(firstMediaUrl, formattedText);
                telegramMessageId = msgId || undefined;
              }
            } else {
              const msgId = await sendTelegramMessage(formattedText);
              telegramMessageId = msgId || undefined;
            }
            console.log(`✅ Posted to Telegram: ${telegramMessageId}`);
          } catch (tgError: any) {
            console.error(`❌ Telegram posting failed for ${post.id}:`, tgError.message);
            if (post.platforms === 'telegram') throw tgError;
          }
        }

        // Update post as published
        const updateData: Record<string, any> = {
          status: 'published',
          xPostId: xPostId || null,
          telegramMessageId: telegramMessageId || null,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (threadPostIds && threadPostIds.length > 0) {
          updateData.threadPostIds = threadPostIds;
        }
        await doc.ref.update(updateData);

        results.push({ id: post.id, success: true });
      } catch (publishError: any) {
        console.error(`Failed to publish post ${post.id}:`, publishError.message);

        // Mark as failed
        await doc.ref.update({
          status: 'failed',
          errorMessage: publishError.message,
          updatedAt: new Date().toISOString(),
        });

        results.push({
          id: post.id,
          success: false,
          error: publishError.message,
        });
      }
    }

    const published = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Published ${published}, failed ${failed}`,
      published,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('Publisher cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Publisher failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/publish
 * Manual trigger — publish a specific post by ID (for the dashboard "Publish Now" button)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('id');

  if (!postId) {
    return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
  }

  // Forward to POST handler logic by fetching self with proper auth
  // For manual triggers, we reuse the publish logic directly
  const docRef = adminDb.collection(COLLECTION).doc(postId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const post = doc.data();
  if (post?.status === 'published') {
    return NextResponse.json({ error: 'Post already published' }, { status: 400 });
  }

  // Set scheduledAt to now so the cron picks it up immediately
  await docRef.update({
    scheduledAt: new Date().toISOString(),
    status: 'scheduled',
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    message: 'Post queued for immediate publishing',
    id: postId,
  });
}
