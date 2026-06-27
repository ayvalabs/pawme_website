/**
 * /api/admin/promo/[code]
 *   GET    → detail + redemption list (recent first)
 *   PATCH  → update status / quantity / expiry / notes
 *   DELETE → hard-delete (only if redeemedCount === 0)
 *
 * Cookie-gated like the other admin routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { runApi } from '@/lib/pawme-logging';
import { PromoCode, PromoRedemption, PromoStatus } from '@/lib/promo-types';

function isAdmin(cookieValue?: string): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !cookieValue) return false;
  const expected = createHmac('sha256', secret).update('pm_admin_v1').digest('hex');
  return cookieValue === expected;
}

async function requireAdmin() {
  const jar = await cookies();
  if (!isAdmin(jar.get('pm_admin')?.value)) {
    const err: Error & { statusCode?: number } = new Error('unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const { requestId, result, error } = await runApi(
    { endpoint: `admin/promo/${upper}`, request },
    async () => {
      await requireAdmin();
      const snap = await adminDb.collection('promoCodes').doc(upper).get();
      if (!snap.exists) {
        const err: Error & { statusCode?: number } = new Error('not_found');
        err.statusCode = 404;
        throw err;
      }
      // Equality on `code` only (no composite orderBy) so this needs no
      // composite Firestore index. Redemptions per code are small, so we sort
      // newest-first in memory (ISO timestamps sort lexically = chronologically).
      const redemptionsSnap = await adminDb
        .collection('promoRedemptions')
        .where('code', '==', upper)
        .limit(200)
        .get();
      const redemptions = redemptionsSnap.docs
        .map((d) => d.data() as PromoRedemption)
        .sort((a, b) => (a.redeemedAt < b.redeemedAt ? 1 : -1));
      return {
        code: snap.data() as PromoCode,
        redemptions,
      };
    },
  );
  if (error) return errorResponse(error, requestId);
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const { requestId, result, error } = await runApi(
    { endpoint: `admin/promo/${upper}`, request },
    async () => {
      await requireAdmin();
      const body = await request.json().catch(() => ({}));
      const ref = adminDb.collection('promoCodes').doc(upper);
      const snap = await ref.get();
      if (!snap.exists) {
        const err: Error & { statusCode?: number } = new Error('not_found');
        err.statusCode = 404;
        throw err;
      }
      const current = snap.data() as PromoCode;

      const patch: Partial<PromoCode> = { updatedAt: new Date().toISOString() };

      if (body?.status != null) {
        const s = String(body.status) as PromoStatus;
        if (!['active', 'paused', 'expired', 'exhausted'].includes(s)) {
          const err: Error & { statusCode?: number } = new Error('invalid status');
          err.statusCode = 400;
          throw err;
        }
        patch.status = s;
      }
      if (body?.quantity !== undefined) {
        if (body.quantity === null) patch.quantity = null;
        else {
          const q = Number(body.quantity);
          if (!Number.isFinite(q) || q < 0) {
            const err: Error & { statusCode?: number } = new Error('invalid quantity');
            err.statusCode = 400;
            throw err;
          }
          if (q < current.redeemedCount) {
            const err: Error & { statusCode?: number } = new Error(
              `quantity cannot be below redeemedCount (${current.redeemedCount})`,
            );
            err.statusCode = 400;
            throw err;
          }
          patch.quantity = q;
        }
      }
      if (body?.expiresAt) {
        const t = new Date(String(body.expiresAt));
        if (Number.isNaN(t.getTime())) {
          const err: Error & { statusCode?: number } = new Error('invalid expiresAt');
          err.statusCode = 400;
          throw err;
        }
        patch.expiresAt = t.toISOString();
      }
      if (body?.notes !== undefined) patch.notes = String(body.notes || '');

      await ref.update(patch);
      const updated = (await ref.get()).data() as PromoCode;
      return { code: updated };
    },
  );
  if (error) return errorResponse(error, requestId);
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const { requestId, result, error } = await runApi(
    { endpoint: `admin/promo/${upper}`, request },
    async () => {
      await requireAdmin();
      const ref = adminDb.collection('promoCodes').doc(upper);
      const snap = await ref.get();
      if (!snap.exists) {
        const err: Error & { statusCode?: number } = new Error('not_found');
        err.statusCode = 404;
        throw err;
      }
      const c = snap.data() as PromoCode;
      if (c.redeemedCount > 0) {
        const err: Error & { statusCode?: number } = new Error(
          `cannot delete — ${c.redeemedCount} redemptions exist. Pause instead.`,
        );
        err.statusCode = 409;
        throw err;
      }
      await ref.delete();
      return { deleted: upper };
    },
  );
  if (error) return errorResponse(error, requestId);
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

function errorResponse(error: unknown, requestId: string) {
  const status =
    typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
  return NextResponse.json(
    { error: (error as Error)?.message || 'error', requestId },
    { status, headers: { 'x-request-id': requestId } },
  );
}
