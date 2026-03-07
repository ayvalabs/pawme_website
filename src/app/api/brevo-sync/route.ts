import { NextRequest, NextResponse } from 'next/server';
import { syncContactToBrevo } from '@/lib/brevo';

export async function POST(request: NextRequest) {
  try {
    const { email, name, isVip, signupDate, source } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await syncContactToBrevo({
      email,
      name,
      isVip: isVip || false,
      signupDate,
      source,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[brevo-sync] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
