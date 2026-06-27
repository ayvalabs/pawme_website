/**
 * /api/admin/promo
 *   GET  → list all codes (most-recent first)
 *   POST → create a single code, or bulk-create N codes
 *
 * Cookie-gated by the same admin-password mechanism used by /admin/kols.
 *
 * Bulk-create body:
 *   {
 *     count: 25,
 *     prefix: 'PAWFRIEND',        // generated codes look like PAWFRIEND-A3F2
 *     quantity: 1,                // each generated code is single-use
 *     expiresAt: ISO,
 *     discount: { type, value, entitlementId, productId? },
 *     kolCode?: string,
 *     notes?: string,
 *   }
 *
 * Single-create body:
 *   {
 *     code: 'PAWFRIEND-26',
 *     quantity: 25,               // null = unlimited
 *     expiresAt: ISO,
 *     discount: { ... },
 *     kolCode?: string,
 *     notes?: string,
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { runApi } from '@/lib/pawme-logging';
import { PromoCode, PromoDiscount } from '@/lib/promo-types';

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

function generateCode(prefix: string): string {
  const random = randomBytes(2).toString('hex').toUpperCase(); // 4 hex chars
  return `${prefix.toUpperCase()}-${random}`;
}

function validateDiscount(d: any): PromoDiscount {
  const type = d?.type;
  const value = Number(d?.value);
  const entitlementId = String(d?.entitlementId || '').trim();
  if (!['trial_days', 'free_months', 'percent_off'].includes(type)) {
    throw new Error('discount.type must be trial_days | free_months | percent_off');
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('discount.value must be a positive number');
  }
  if (!entitlementId) {
    throw new Error('discount.entitlementId required (e.g. "pro_access")');
  }
  // Only include productId when actually provided — Firestore rejects an
  // explicit `undefined` value (and not every code targets a specific product).
  const discount: PromoDiscount = { type, value, entitlementId };
  if (d?.productId) discount.productId = String(d.productId);
  return discount;
}

// ── GET /api/admin/promo ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { requestId, result, error } = await runApi(
    { endpoint: 'admin/promo', request },
    async () => {
      await requireAdmin();
      const snap = await adminDb
        .collection('promoCodes')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();
      return { codes: snap.docs.map((d) => d.data() as PromoCode) };
    },
  );
  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { error: (error as Error)?.message || 'error', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

// ── POST /api/admin/promo ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi(
    { endpoint: 'admin/promo', request },
    async () => {
      await requireAdmin();
      const body = await request.json().catch(() => ({}));
      const now = new Date().toISOString();

      const expiresAt = String(body?.expiresAt || '').trim();
      if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
        const err: Error & { statusCode?: number } = new Error(
          'expiresAt required (ISO date)',
        );
        err.statusCode = 400;
        throw err;
      }

      const discount = validateDiscount(body?.discount);
      const kolCode = body?.kolCode ? String(body.kolCode).toUpperCase() : undefined;
      const notes = body?.notes ? String(body.notes) : undefined;
      const createdBy = String(body?.createdBy || 'admin');

      // Bulk-create path: count > 1 + prefix
      const count = Number(body?.count || 1);
      if (count > 1) {
        const prefix = String(body?.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!prefix) {
          const err: Error & { statusCode?: number } = new Error(
            'prefix required for bulk-create',
          );
          err.statusCode = 400;
          throw err;
        }
        if (count > 500) {
          const err: Error & { statusCode?: number } = new Error('max 500 codes per batch');
          err.statusCode = 400;
          throw err;
        }
        const quantity = body?.quantity == null ? 1 : Number(body.quantity);

        // Generate unique codes and write them in batches of 100.
        const codes: string[] = [];
        let attempts = 0;
        while (codes.length < count && attempts < count * 5) {
          attempts++;
          const c = generateCode(prefix);
          if (codes.includes(c)) continue;
          // Light existence check — collisions are rare for 4 hex chars but possible.
          const exists = await adminDb.collection('promoCodes').doc(c).get();
          if (!exists.exists) codes.push(c);
        }
        if (codes.length < count) {
          const err: Error & { statusCode?: number } = new Error(
            `could only generate ${codes.length}/${count} unique codes — try a longer prefix`,
          );
          err.statusCode = 500;
          throw err;
        }

        const batch = adminDb.batch();
        for (const code of codes) {
          const doc: PromoCode = {
            code,
            quantity,
            redeemedCount: 0,
            expiresAt,
            status: 'active',
            discount,
            createdBy,
            createdAt: now,
            updatedAt: now,
            ...(kolCode ? { kolCode } : {}),
            ...(notes ? { notes } : {}),
          };
          batch.set(adminDb.collection('promoCodes').doc(code), doc);
        }
        await batch.commit();

        return { created: codes };
      }

      // Single-create path
      const code = String(body?.code || '').trim().toUpperCase();
      if (!code || !/^[A-Z0-9-]{3,32}$/.test(code)) {
        const err: Error & { statusCode?: number } = new Error(
          'code required (3-32 uppercase chars, A-Z 0-9 dash)',
        );
        err.statusCode = 400;
        throw err;
      }
      const codeRef = adminDb.collection('promoCodes').doc(code);
      const existing = await codeRef.get();
      if (existing.exists) {
        const err: Error & { statusCode?: number } = new Error(
          `code "${code}" already exists`,
        );
        err.statusCode = 409;
        throw err;
      }
      const quantity = body?.quantity == null ? null : Number(body.quantity);
      const doc: PromoCode = {
        code,
        quantity,
        redeemedCount: 0,
        expiresAt,
        status: 'active',
        discount,
        createdBy,
        createdAt: now,
        updatedAt: now,
        ...(kolCode ? { kolCode } : {}),
        ...(notes ? { notes } : {}),
      };
      await codeRef.set(doc);
      return { created: [code], code: doc };
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { error: (error as Error)?.message || 'error', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
