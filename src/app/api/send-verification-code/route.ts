import { NextRequest, NextResponse } from 'next/server';
import { sendSignUpVerificationCode } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { success: false, message: 'Email and name are required.' },
        { status: 400 }
      );
    }

    const result = await sendSignUpVerificationCode({ email, name });
    
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
