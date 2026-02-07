import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCodeEmail } from '@/app/actions/email';
import { isDisposableEmail } from '@/lib/disposable-domains';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Name and email are required.' }, { status: 400 });
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json({ success: false, message: 'Disposable email addresses are not allowed.' }, { status: 400 });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await sendVerificationCodeEmail({ to: email, name, code });

    return NextResponse.json({ success: true, message: 'Verification code sent.', code, expiresAt });
  } catch (error: any) {
    console.error('[API] send-verification error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to send verification code.' }, { status: 500 });
  }
}
