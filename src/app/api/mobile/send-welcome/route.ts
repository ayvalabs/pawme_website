import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/app/actions/email';
import { requireMobileUser } from '@/lib/pawme-mobile';

// Auth: requires a Firebase ID token (Bearer). Anonymous-auth users accepted —
// the gate is to prevent unauthenticated email-send abuse (Resend bill / inbox spam).
export async function POST(request: NextRequest) {
  try {
    await requireMobileUser(request);
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Name and email are required.' }, { status: 400 });
    }

    // For mobile signups, we don't use referral codes
    await sendWelcomeEmail({ to: email, name, referralCode: '' });

    return NextResponse.json({ success: true, message: 'Welcome email sent.' });
  } catch (error: any) {
    console.error('[API] send-welcome error:', error);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return NextResponse.json({ success: false, message: error?.message || 'Failed to send welcome email.' }, { status });
  }
}
