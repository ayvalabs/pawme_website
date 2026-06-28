import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { generateApplePassportPass, walletConfigState } from '@/lib/apple-wallet';
import { createHash } from 'crypto';

/**
 * GET /api/mobile/passport/wallet/[petId]/apple.pkpass
 *
 * Generates a signed .pkpass for the given pet and returns it for
 * iOS's native add-to-wallet sheet. Auth: Firebase ID token + pet ownership.
 *
 * Returns 503 with structured body when Apple Pass cert isn't provisioned
 * yet (lets the app show "wallet support coming soon" instead of crashing).
 */

export const runtime = 'nodejs';
const PUBLIC_PASSPORT_BASE = 'https://api.ayvalabs.com/p';

function deterministicToken(petId: string): string {
  // Same shape pawme_app's passportService.passportToken() uses — a stable
  // url-safe digest of petId so the QR target is identical across the
  // digital passport, the printed passport, and the wallet pass.
  return createHash('sha256').update(`pawme:${petId}`).digest('base64url').slice(0, 12);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> },
) {
  try {
    const { petId } = await params;
    if (!petId || !/^[A-Za-z0-9_-]{4,128}$/.test(petId)) {
      return NextResponse.json({ success: false, message: 'Invalid petId.' }, { status: 400 });
    }

    const cfg = walletConfigState();
    if (!cfg.ready) {
      return NextResponse.json(
        {
          success: false,
          message: 'Apple Wallet pass signing is being set up — try again soon.',
          reason: 'wallet_not_configured',
          missing: cfg.missing,
        },
        { status: 503 },
      );
    }

    const { uid } = await requireMobileUser(request);

    const petSnap = await adminDb.collection('pets').doc(petId).get();
    if (!petSnap.exists) {
      return NextResponse.json({ success: false, message: 'Pet not found.' }, { status: 404 });
    }
    const pet = petSnap.data() as Record<string, unknown>;
    if (pet.userId !== uid) {
      return NextResponse.json({ success: false, message: 'Pet not found.' }, { status: 404 });
    }

    const buffer = await generateApplePassportPass({
      uid,
      petId,
      petName: (pet.name as string) || 'Pet',
      breed: (pet.breed as string) || null,
      species: (pet.type as string) || null,
      ageLabel: (pet.age as string) || null,
      weightLabel: (pet.weight as string) || null,
      passportIdNo: (pet.petIdNo as string) || null,
      publicPassportUrl: `${PUBLIC_PASSPORT_BASE}/${deterministicToken(petId)}`,
      photoUrl: (pet.imageUrl as string) || null,
      careNotes: (pet.careNotes as string) || null,
      allergens: Array.isArray(pet.avoid) ? (pet.avoid as string[]) : [],
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${(pet.name as string) || 'pet'}.pkpass"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err?.statusCode ?? 500;
    console.error('[passport/wallet/apple.pkpass] failed', err);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Could not generate pass.' },
      { status },
    );
  }
}
