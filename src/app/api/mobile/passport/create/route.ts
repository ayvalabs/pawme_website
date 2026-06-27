import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { optionalMobileUser } from '@/lib/pawme-mobile';

/**
 * POST /api/mobile/passport/create
 *
 * Mints (or reuses) a PUBLIC share token for a pet's passport and stores the
 * passport snapshot in Firestore keyed by a RANDOM token (never the raw petId).
 * Returns the public URL embedded in the QR + share link.
 *
 * Privacy (PRD §7): owner PII (name) is stored ONLY when `showOwner` is true
 * and a name is provided. Default = pet-only, and the public page never exposes
 * PII unless `showOwner` was explicitly set.
 *
 * Auth is optional (passports can be created pre-signup); when present we record
 * userId for ownership/reuse.
 */

export const runtime = 'nodejs';

const PUBLIC_BASE = 'https://pawpilot.ayvalabs.com';
const COLLECTION = 'passports';

function str(v: unknown, max = 120): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

function makeToken(): string {
  // url-safe, ~12 chars, unguessable.
  return randomBytes(9).toString('base64url');
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await optionalMobileUser(request);
    const body = await request.json().catch(() => ({}));

    const petId = str(body?.petId, 64);
    const petName = str(body?.petName, 60);
    if (!petId || !petName) {
      return NextResponse.json({ success: false, message: 'petId and petName are required.' }, { status: 400 });
    }

    const showOwner = body?.showOwner === true;
    const traits = Array.isArray(body?.traits)
      ? body.traits.filter((t: unknown) => typeof t === 'string').slice(0, 3).map((t: string) => t.slice(0, 40))
      : [];
    const avoid = Array.isArray(body?.avoid)
      ? body.avoid.filter((a: unknown) => typeof a === 'string').slice(0, 20).map((a: string) => a.slice(0, 40))
      : [];

    // Sitter-handoff care snapshot (PRD §6.6). Vet/emergency contact are PII —
    // the app already strips them unless showContact, but we re-enforce here.
    let care: Record<string, unknown> | null = null;
    if (body?.care && typeof body.care === 'object') {
      const cc = body.care as Record<string, unknown>;
      const showContact = cc.showContact === true;
      care = {
        foodBrand: str(cc.foodBrand, 120) ?? null,
        portions: str(cc.portions, 120) ?? null,
        feedingSchedule: str(cc.feedingSchedule, 120) ?? null,
        grooming: str(cc.grooming, 300) ?? null,
        medications: str(cc.medications, 400) ?? null,
        behavior: str(cc.behavior, 400) ?? null,
        routine: str(cc.routine, 400) ?? null,
        vet: showContact ? (str(cc.vet, 160) ?? null) : null,
        emergencyContact: showContact ? (str(cc.emergencyContact, 160) ?? null) : null,
        showContact,
      };
    }

    // Snapshot stored on the passport doc. PII only when opted in.
    const snapshot: Record<string, unknown> = {
      petId,
      userId: uid ?? null,
      petName,
      breed: str(body?.breed, 80) ?? 'Unknown',
      species: str(body?.species, 24) ?? 'pet',
      ageLabel: str(body?.ageLabel, 32) ?? null,
      weightLabel: str(body?.weightLabel, 32) ?? null,
      gender: str(body?.gender, 16) ?? null,
      colorLabel: str(body?.colorLabel, 48) ?? null,
      birthday: str(body?.birthday, 24) ?? null,
      photoUrl: str(body?.photoUrl, 600) ?? null,
      petIdNo: str(body?.petIdNo, 24) ?? null,
      issueDate: str(body?.issueDate, 32) ?? null,
      motto: str(body?.motto, 120) ?? null,
      traits,
      avoid,
      care,
      theme: str(body?.theme, 24) ?? 'classic',
      showOwner,
      ownerName: showOwner ? (str(body?.ownerName, 80) ?? null) : null,
      updatedAt: new Date().toISOString(),
    };

    const col = adminDb.collection(COLLECTION);

    // The client supplies a stable, deterministic token (a one-way hash of the
    // petId) so the QR renders instantly and the URL never changes. We store
    // the snapshot under it. Fall back to a random token for any legacy caller.
    const clientToken = typeof body?.token === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(body.token) ? body.token : null;
    const token = clientToken ?? makeToken();
    const existing = await col.doc(token).get().catch(() => null);

    await col.doc(token).set(
      existing?.exists ? snapshot : { ...snapshot, token, views: 0, createdAt: new Date().toISOString() },
      { merge: true },
    );

    return NextResponse.json({ success: true, token, url: `${PUBLIC_BASE}/p/${token}` });
  } catch (e) {
    console.error('[passport/create] failed', e);
    return NextResponse.json({ success: false, message: 'Could not create passport.' }, { status: 200 });
  }
}
