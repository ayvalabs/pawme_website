/**
 * POST /api/mobile/contact-us
 *
 * Body:  { message: string, subject?: string }
 * Auth:  Firebase ID token (Bearer, set by the mobile app).
 *
 * Forwards the user's free-form in-app message to ashok@ayvalabs.com via
 * Resend. `reply_to` is set to the signed-in user's Firebase Auth email so
 * a Reply from Ashok's inbox lands straight back in the user's mailbox.
 *
 * Returns:
 *   200 { success: true, requestId }
 *   400 { success: false, message, requestId }   — empty / oversize body
 *   401 { success: false, message, requestId }   — missing / invalid bearer
 *   500 { success: false, message, requestId }   — Resend / server error
 *
 * No retry inside the route — the client surfaces failures and lets the
 * user resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { logApi, runApi } from '@/lib/pawme-logging';

const ENDPOINT = 'mobile/contact-us';

const TO_EMAIL = 'ashok@ayvalabs.com';
const FROM_EMAIL = 'PawPilot Support <pawme@ayvalabs.com>';
const MAX_LEN = 5000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<{ success: true }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }) => {
      let uid: string;
      try {
        ({ uid } = await requireMobileUser(request));
      } catch (e: any) {
        // requireMobileUser throws plain Errors with no statusCode, which
        // runApi defaults to 500. Auth failures should be 401 so the mobile
        // client can prompt the user to sign back in.
        const err: Error & { statusCode?: number } = new Error(
          e?.message || 'Sign in to send us a message.',
        );
        err.statusCode = 401;
        throw err;
      }
      logInfo({ uid });

      const body = await request.json().catch(() => ({} as any));
      const message = String(body?.message ?? '').trim();
      const subjectInput = String(body?.subject ?? '').trim();

      if (!message) {
        const err: Error & { statusCode?: number } = new Error(
          'Please type a message before sending.',
        );
        err.statusCode = 400;
        throw err;
      }
      if (message.length > MAX_LEN) {
        const err: Error & { statusCode?: number } = new Error(
          `Message is too long (max ${MAX_LEN} characters).`,
        );
        err.statusCode = 400;
        throw err;
      }

      // Resolve a friendly From name + reply-to from Firebase Auth + the
      // user's Firestore profile. Failures here are non-fatal — we still
      // send the email with whatever we have.
      const [authUser, profileSnap] = await Promise.all([
        adminAuth.getUser(uid).catch(() => null),
        adminDb.collection('users').doc(uid).get().catch(() => null),
      ]);
      const profileData = (profileSnap?.data() ?? {}) as Record<string, any>;
      const userEmail =
        authUser?.email ||
        String(profileData?.email ?? '') ||
        'unknown@pawpilot.app';
      const firstName = String(profileData?.firstName ?? '').trim();
      const lastName = String(profileData?.lastName ?? '').trim();
      const displayName =
        `${firstName} ${lastName}`.trim() ||
        authUser?.displayName ||
        'PawPilot user';
      const phone = String(profileData?.phone ?? '').trim();

      const subject =
        subjectInput && subjectInput.length <= 160
          ? `[PawPilot] ${subjectInput}`
          : `[PawPilot] Message from ${displayName}`;

      const html = [
        '<div style="font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; max-width: 560px;">',
        `<h2 style="margin: 0 0 8px;">New PawPilot in-app message</h2>`,
        `<p style="color: #666; margin: 0 0 16px;">From <strong>${escapeHtml(displayName)}</strong> &lt;${escapeHtml(userEmail)}&gt;${phone ? ` &middot; ${escapeHtml(phone)}` : ''}</p>`,
        `<div style="background: #f7f7f8; border-radius: 12px; padding: 16px; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</div>`,
        `<p style="color: #999; font-size: 12px; margin-top: 16px;">UID: ${escapeHtml(uid)}</p>`,
        '</div>',
      ].join('');

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.error('[contact-us] RESEND_API_KEY is not configured');
        const err: Error & { statusCode?: number } = new Error(
          'Email service not configured. Please try later.',
        );
        err.statusCode = 500;
        throw err;
      }

      const resend = new Resend(apiKey);
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        reply_to: userEmail,
        subject,
        html,
        text: `From ${displayName} <${userEmail}>${phone ? ` (${phone})` : ''}\n\n${message}\n\nUID: ${uid}`,
      });

      if (sendError) {
        logApi('error', {
          requestId: rid,
          endpoint: ENDPOINT,
          event: 'resend-error',
          err: String(sendError),
        });
        const err: Error & { statusCode?: number } = new Error(
          'Could not send right now. Please try again.',
        );
        err.statusCode = 502;
        throw err;
      }

      logApi('info', {
        requestId: rid,
        endpoint: ENDPOINT,
        event: 'sent',
        uid,
      });

      return { success: true };
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      {
        success: false,
        message: (error as Error)?.message ?? 'Could not send message',
        requestId,
      },
      { status, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { success: result?.success ?? false, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
