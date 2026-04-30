import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetLink } from '@/app/actions/password-reset';
import { logApi, runApi } from '@/lib/pawme-logging';

/**
 * POST /api/mobile/reset-password
 *
 * Body: { email: string }
 *
 * Wraps the same server action used by the web app
 * (`actions/password-reset.ts`) so the mobile app gets the SAME branded
 * Resend-delivered email instead of Firebase's default email which goes to
 * spam. Always returns 200 with `{ success: true }` for non-existent emails
 * (security best practice — don't leak whether an account exists).
 *
 * No Bearer token required — this endpoint is invoked from the unauthed
 * Welcome / Sign-in screen.
 */

const ENDPOINT = 'mobile/reset-password';

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<{ success: boolean; message: string }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }) => {
      const body = await request.json().catch(() => ({}));
      const email = String(body?.email ?? '').trim().toLowerCase();

      if (!email) {
        const err: Error & { statusCode?: number } = new Error('email is required');
        err.statusCode = 400;
        throw err;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const err: Error & { statusCode?: number } = new Error('invalid email format');
        err.statusCode = 400;
        throw err;
      }

      logInfo({ emailDomain: email.split('@')[1] || '?' });

      const out = await generatePasswordResetLink({ email });

      logApi('info', {
        requestId: rid,
        endpoint: ENDPOINT,
        event: 'reset-link-result',
        success: out.success,
      });

      return out;
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { success: false, message: (error as Error)?.message ?? 'Reset failed', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
  return NextResponse.json(
    { success: result?.success ?? false, message: result?.message ?? '', requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
