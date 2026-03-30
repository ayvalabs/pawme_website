import { NextResponse } from 'next/server';

/**
 * GET /api/cron/daily
 * Single daily cron job for Vercel Hobby plan (once per day at 9 AM UTC).
 * Calls both metrics snapshot and post publisher sequentially.
 */
export async function GET(request: Request) {
  // Auth check — allow Vercel Cron or requests with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🕘 Daily cron starting...');
  const results: Record<string, any> = {};

  // 1. Metrics snapshot
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const metricsRes = await fetch(`${baseUrl}/api/metrics/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });
    results.metrics = await metricsRes.json();
    console.log('📊 Metrics snapshot:', results.metrics.message || 'done');
  } catch (error: any) {
    console.error('Metrics snapshot failed:', error.message);
    results.metrics = { error: error.message };
  }

  // 2. Publish due posts
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const publishRes = await fetch(`${baseUrl}/api/posts/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });
    results.publish = await publishRes.json();
    console.log('📤 Post publisher:', results.publish.message || 'done');
  } catch (error: any) {
    console.error('Post publisher failed:', error.message);
    results.publish = { error: error.message };
  }

  console.log('✅ Daily cron complete');

  return NextResponse.json({
    message: 'Daily cron complete',
    timestamp: new Date().toISOString(),
    results,
  });
}
