import { adminDb } from '@/lib/firebase-admin';
import { PostFeed } from './PostFeed';
import type { ScheduledPost } from '@/types/scheduled-post';

export const revalidate = 60; // ISR: regenerate every 60 seconds

async function getAllPosts(): Promise<ScheduledPost[]> {
  try {
    const snapshot = await adminDb
      .collection('scheduled-posts')
      .orderBy('scheduledAt', 'asc')
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          threadTexts: data.threadTexts || [],
          mediaUrls: data.mediaUrls || [],
          mediaFilePaths: data.mediaFilePaths || [],
          mediaTypes: data.mediaTypes || [],
          threadMediaMap: data.threadMediaMap
            ? (typeof data.threadMediaMap === 'string' ? JSON.parse(data.threadMediaMap) : data.threadMediaMap)
            : undefined,
          videoThumbnailUrls: data.videoThumbnailUrls || [],
          videoThumbnailFiles: data.videoThumbnailFiles || [],
          scheduledAt: data.scheduledAt,
          status: data.status,
          platforms: data.platforms,
          category: data.category,
          hashtags: data.hashtags || [],
          mentions: data.mentions || [],
          ctaUrl: data.ctaUrl,
          campaignWeek: data.campaignWeek,
          campaignDay: data.campaignDay,
          xPostId: data.xPostId,
          threadPostIds: data.threadPostIds,
          telegramMessageId: data.telegramMessageId,
          errorMessage: data.errorMessage,
          publishedAt: data.publishedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as ScheduledPost;
      })
      .filter((p) => p.status !== 'draft'); // hide drafts from public view
  } catch (error: any) {
    // orderBy index not ready — fallback: fetch all and sort in memory
    if (error?.code === 9 || error?.message?.includes('FAILED_PRECONDITION')) {
      console.warn('[/content] Index not ready, using in-memory sort');
      try {
        const snapshot = await adminDb.collection('scheduled-posts').get();
        return snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text,
              threadTexts: data.threadTexts || [],
              mediaUrls: data.mediaUrls || [],
              mediaFilePaths: data.mediaFilePaths || [],
              mediaTypes: data.mediaTypes || [],
              threadMediaMap: data.threadMediaMap
                ? (typeof data.threadMediaMap === 'string' ? JSON.parse(data.threadMediaMap) : data.threadMediaMap)
                : undefined,
              videoThumbnailUrls: data.videoThumbnailUrls || [],
              videoThumbnailFiles: data.videoThumbnailFiles || [],
              scheduledAt: data.scheduledAt,
              status: data.status,
              platforms: data.platforms,
              category: data.category,
              hashtags: data.hashtags || [],
              mentions: data.mentions || [],
              ctaUrl: data.ctaUrl,
              campaignWeek: data.campaignWeek,
              campaignDay: data.campaignDay,
              xPostId: data.xPostId,
              threadPostIds: data.threadPostIds,
              telegramMessageId: data.telegramMessageId,
              errorMessage: data.errorMessage,
              publishedAt: data.publishedAt,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } as ScheduledPost;
          })
          .filter((p) => p.status !== 'draft')
          .sort((a, b) => {
            if (!a.scheduledAt) return 1;
            if (!b.scheduledAt) return -1;
            return a.scheduledAt.localeCompare(b.scheduledAt);
          });
      } catch (fallbackError) {
        console.error('[/content] Fallback query failed:', fallbackError);
        return [];
      }
    }
    console.error('[/content] Failed to fetch posts:', error);
    return [];
  }
}

/** Public content feed — ISR pre-rendered, shows all scheduled/published posts */
export default async function PublicContentPage() {
  const posts = await getAllPosts();

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Feed</h1>
        <p className="text-gray-500 mt-1 text-sm">Upcoming posts scheduled for X</p>
      </div>
      <PostFeed posts={posts} />
    </div>
  );
}
