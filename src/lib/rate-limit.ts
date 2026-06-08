import { adminDb } from '@/lib/firebase-admin';
import type { NextRequest } from 'next/server';

/**
 * Simple per-IP, per-day rate limiter backed by Firestore. Used to protect the
 * public (unauthenticated) pet-card endpoints from abuse — the image-generation
 * call is the expensive one, so gate it harder than analysis.
 *
 * Counters live in `rate-limits/{bucket}_{ip}_{yyyy-mm-dd}` and auto-expire by
 * date (old docs simply stop being read; clean up with a TTL policy if desired).
 */

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Atomically increments the counter for (bucket, ip, today) and reports whether
 * the request is within `limit`. Fails OPEN (allows the request) if Firestore is
 * unavailable — we never want infra issues to take the free tool offline.
 */
export async function checkRateLimit(
  bucket: string,
  ip: string,
  limit: number,
): Promise<RateLimitResult> {
  const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
  const id = `${bucket}_${ip.replace(/[^a-zA-Z0-9.:_-]/g, '-')}_${day}`;
  const ref = adminDb.collection('rate-limits').doc(id);

  try {
    const count = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.exists ? (snap.data()?.count as number) : 0) || 0;
      const next = current + 1;
      tx.set(
        ref,
        { count: next, bucket, ip, day, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      return next;
    });
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch {
    // Fail open — better to serve the tool than to hard-fail on a counter write.
    return { allowed: true, remaining: limit, limit };
  }
}
