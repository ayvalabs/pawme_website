import { adminDb } from '@/lib/firebase-admin';
import { TweetManager } from './TweetManager';
import type { ScheduledPost } from '@/types/scheduled-post';

export const revalidate = 10;

// These are the categories from the Kickstarter campaign seed
const KICKSTARTER_CATEGORIES = [
  'origin_story', 'build_journey', 'engagement_poll', 'product_vision',
  'behind_scenes', 'scaling_journey', 'technical_breakdown', 'technical_challenges',
  'manufacturing', 'market_analysis', 'feature_showcase', 'product_demo',
  'ai_feature', 'health_benefits', 'market_positioning', 'competitive_analysis',
  'ai_technology', 'feature_demo', 'technology_vision', 'design_story',
  'design_evolution', 'data_insights', 'product_intro', 'waitlist_push',
  'kickstarter_announcement', 'hero_video', 'testimonials', 'quality_assurance',
  'founder_story', 'pricing_reveal', 'faq_launch', 'quality_control',
  'market_revolution', 'full_demo', 'countdown_7days', 'waitlist_final',
  'final_teaser', 'launch_day', 'launch_momentum', 'feature_recap',
  'journey_complete',
];

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): ScheduledPost {
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
    status: data.status || 'draft',
    platforms: data.platforms,
    category: data.category,
    pillar: data.pillar,
    hashtags: data.hashtags || [],
    mentions: data.mentions || [],
    ctaUrl: data.ctaUrl,
    campaignWeek: data.campaignWeek,
    campaignDay: data.campaignDay,
    riskScore: data.riskScore,
    duplicateScore: data.duplicateScore,
    approvalStatus: data.approvalStatus,
    sourceLabel: data.sourceLabel,
    sourceUrl: data.sourceUrl,
    mediaLibraryIds: data.mediaLibraryIds || [],
    xPostId: data.xPostId,
    threadPostIds: data.threadPostIds,
    telegramMessageId: data.telegramMessageId,
    errorMessage: data.errorMessage,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    imagePrompt: data.imagePrompt,
  } as ScheduledPost;
}

async function getKickstarterTweets(): Promise<ScheduledPost[]> {
  try {
    // Firestore 'in' supports max 30, so query in chunks
    const allDocs: ScheduledPost[] = [];
    for (let i = 0; i < KICKSTARTER_CATEGORIES.length; i += 30) {
      const chunk = KICKSTARTER_CATEGORIES.slice(i, i + 30);
      const snapshot = await adminDb
        .collection('scheduled-posts')
        .where('category', 'in', chunk)
        .get();
      allDocs.push(...snapshot.docs.map(mapDoc));
    }
    return allDocs.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  } catch (error: any) {
    // Fallback: fetch all and filter client-side
    const snapshot = await adminDb.collection('scheduled-posts').get();
    return snapshot.docs
      .map(mapDoc)
      .filter((t) => KICKSTARTER_CATEGORIES.includes(t.category))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
}

export default async function Tweets2Page() {
  const tweets = await getKickstarterTweets();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Kickstarter Campaign — Tweet Manager
          </h1>
          <p className="text-gray-600 mt-2">
            50 tweets · April 9 → June 7, 2026 · @pawme_ai · Leading up to Kickstarter launch
          </p>
        </div>
        <TweetManager initialTweets={tweets} />
      </div>
    </div>
  );
}
