import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import { sendAPNsNotification, validateAPNsConfig } from '@/lib/apns';

/**
 * POST /api/pet/:petId/found
 *
 * Public — invoked by a finder who scanned a QR collar tag. No auth required.
 * Throttled to mitigate spam: max 5 reports per pet per hour from same IP.
 *
 * On success: writes lostPetReports/{reportId}, fires push + email to owner.
 */

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.SENDER_EMAIL || 'PawMe <noreply@ayvalabs.com>';
const THROTTLE_WINDOW_MS = 60 * 60 * 1000;
const THROTTLE_LIMIT = 5;

function str(v: unknown, max = 200): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

function hashIp(ip: string): string {
  // not cryptographic — just enough to bucket per-source without storing raw IP.
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0;
  return `ip_${(h >>> 0).toString(36)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> },
) {
  try {
    const { petId } = await params;
    if (!petId || !/^[A-Za-z0-9_-]{4,128}$/.test(petId)) {
      return NextResponse.json({ success: false, message: 'Invalid petId.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const finderName = str(body?.finderName, 80);
    const finderPhone = str(body?.finderContact?.phone, 32);
    const finderEmail = str(body?.finderContact?.email, 200);
    const message = str(body?.message, 1000);
    const location = (body?.location && typeof body.location === 'object')
      ? {
          lat: typeof body.location.lat === 'number' ? body.location.lat : null,
          lng: typeof body.location.lng === 'number' ? body.location.lng : null,
        }
      : null;

    if (!finderPhone && !finderEmail) {
      return NextResponse.json(
        { success: false, message: 'Provide a phone or email so the owner can reach you.' },
        { status: 400 },
      );
    }

    const petSnap = await adminDb.collection('pets').doc(petId).get();
    if (!petSnap.exists) {
      return NextResponse.json({ success: false, message: 'Pet not found.' }, { status: 404 });
    }
    const pet = petSnap.data() as Record<string, unknown>;
    const ownerUid = pet.userId as string | undefined;
    if (!ownerUid) {
      return NextResponse.json({ success: false, message: 'Pet has no owner on file.' }, { status: 404 });
    }

    // Throttle by IP — best-effort, Firestore counter doc.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const ipKey = hashIp(ip);
    const throttleRef = adminDb.collection('foundReportThrottle').doc(`${petId}_${ipKey}`);
    const now = Date.now();
    const throttleSnap = await throttleRef.get();
    const t = throttleSnap.exists ? (throttleSnap.data() as { count: number; windowStart: number }) : null;
    if (t && now - t.windowStart < THROTTLE_WINDOW_MS && t.count >= THROTTLE_LIMIT) {
      return NextResponse.json(
        { success: false, message: 'Too many reports recently — please try again later.' },
        { status: 429 },
      );
    }
    await throttleRef.set(
      t && now - t.windowStart < THROTTLE_WINDOW_MS
        ? { count: t.count + 1, windowStart: t.windowStart }
        : { count: 1, windowStart: now },
    );

    // Persist report.
    const reportRef = adminDb.collection('lostPetReports').doc();
    const reportId = reportRef.id;
    await reportRef.set({
      reportId,
      petId,
      ownerUid,
      finderName: finderName ?? null,
      finderPhone: finderPhone ?? null,
      finderEmail: finderEmail ?? null,
      message: message ?? null,
      location,
      ipKey,
      createdAt: new Date().toISOString(),
    });

    // Notify owner: push + email. Best-effort — don't fail the request if these break.
    const petName = (pet.name as string) || 'your pet';
    const pushTitle = `${petName} may have been found!`;
    const pushBody = finderName
      ? `${finderName} reported finding your pet. Tap to see contact details.`
      : 'Someone reported finding your pet. Tap to see contact details.';

    if (validateAPNsConfig().valid) {
      try {
        const tokenSnap = await adminDb.collection('pushTokens')
          .where('userId', '==', ownerUid).limit(10).get();
        const tokens = tokenSnap.docs.map((d) => (d.data() as { token?: string }).token).filter(Boolean) as string[];
        for (const token of tokens) {
          await sendAPNsNotification({
            deviceToken: token,
            title: pushTitle,
            body: pushBody,
            data: { screen: 'PetProfile', petId, reportId },
            badge: 1,
          }).catch((e) => console.warn('[found] push to one token failed:', (e as Error).message));
        }
      } catch (e) {
        console.warn('[found] push fan-out failed:', (e as Error).message);
      }
    }

    try {
      const ownerSnap = await adminDb.collection('users').doc(ownerUid).get();
      const ownerEmail = (ownerSnap.data() as { email?: string } | undefined)?.email;
      if (ownerEmail && process.env.RESEND_API_KEY) {
        const lines = [
          `Someone reported finding ${petName}.`,
          '',
          finderName ? `From: ${finderName}` : null,
          finderPhone ? `Phone: ${finderPhone}` : null,
          finderEmail ? `Email: ${finderEmail}` : null,
          location?.lat != null && location?.lng != null
            ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}`
            : null,
          message ? `\nMessage:\n${message}` : null,
          '',
          '— PawMe',
        ].filter(Boolean).join('\n');
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `🐾 ${petName} may have been found`,
          text: lines,
        }).catch((e) => console.warn('[found] email failed:', (e as Error).message));
      }
    } catch (e) {
      console.warn('[found] email lookup failed:', (e as Error).message);
    }

    return NextResponse.json({ success: true, ownerNotified: true });
  } catch (e) {
    console.error('[pet/found] failed', e);
    return NextResponse.json({ success: false, message: 'Could not submit report.' }, { status: 500 });
  }
}
