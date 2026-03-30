import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { ScheduledPost, CreatePostInput } from '@/types/scheduled-post';

const COLLECTION = 'scheduled-posts';

/**
 * GET /api/posts - List all scheduled posts with optional filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft, scheduled, published, failed
    const category = searchParams.get('category');
    const week = searchParams.get('week');
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

    if (status) {
      query = query.where('status', '==', status);
    }
    if (category) {
      query = query.where('category', '==', category);
    }
    if (week) {
      query = query.where('campaignWeek', '==', parseInt(week));
    }

    query = query.orderBy('scheduledAt', 'asc');

    const snapshot = await query.limit(limit).get();
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        threadTexts: data.threadTexts || [],
        mediaUrls: data.mediaUrls || [],
        mediaFilePaths: data.mediaFilePaths || [],
        mediaTypes: data.mediaTypes || [],
        threadMediaMap: data.threadMediaMap,
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
      };
    }) as ScheduledPost[];

    // Get counts by status
    const allDocs = await adminDb.collection(COLLECTION).get();
    const counts = {
      total: allDocs.size,
      draft: 0,
      scheduled: 0,
      published: 0,
      failed: 0,
    };
    allDocs.docs.forEach(doc => {
      const s = doc.data().status as keyof typeof counts;
      if (s in counts) counts[s]++;
    });

    return NextResponse.json({ posts, counts });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts - Create a new scheduled post
 */
export async function POST(request: Request) {
  try {
    const body: CreatePostInput = await request.json();

    if (!body.text?.trim()) {
      return NextResponse.json(
        { error: 'Post text is required' },
        { status: 400 }
      );
    }

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled date/time is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const post: Omit<ScheduledPost, 'id'> = {
      text: body.text.trim(),
      threadTexts: body.threadTexts || [],
      mediaUrls: body.mediaUrls || [],
      mediaFilePaths: body.mediaFilePaths || [],
      mediaTypes: body.mediaTypes || [],
      threadMediaMap: body.threadMediaMap,
      videoThumbnailUrls: body.videoThumbnailUrls || [],
      videoThumbnailFiles: body.videoThumbnailFiles || [],
      scheduledAt: body.scheduledAt,
      status: 'scheduled',
      platforms: body.platforms || 'both',
      category: body.category || 'general',
      hashtags: body.hashtags || [],
      mentions: body.mentions || [],
      ctaUrl: body.ctaUrl,
      campaignWeek: body.campaignWeek || 1,
      campaignDay: body.campaignDay || 1,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(post);

    return NextResponse.json({
      id: docRef.id,
      ...post,
      message: 'Post created successfully',
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/posts - Update an existing post
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Don't allow editing published posts
    const currentData = doc.data();
    if (currentData?.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot edit a published post' },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date().toISOString();
    await docRef.update(updates);

    return NextResponse.json({
      id,
      ...currentData,
      ...updates,
      message: 'Post updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts - Delete a post (or batch delete)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({
      message: 'Post deleted successfully',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
