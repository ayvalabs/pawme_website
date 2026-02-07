import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/app/actions/email';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Name and email are required.' }, { status: 400 });
    }

    // For mobile signups, we don't use referral codes
    await sendWelcomeEmail({ to: email, name, referralCode: '' });

    return NextResponse.json({ success: true, message: 'Welcome email sent.' });
  } catch (error: any) {
    console.error('[API] send-welcome error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to send welcome email.' }, { status: 500 });
  }
}
