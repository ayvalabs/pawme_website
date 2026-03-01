import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.get();
    
    return NextResponse.json({
      success: true,
      count: snapshot.size,
    });
  } catch (error: any) {
    console.error('Error fetching total signups:', error);
    return NextResponse.json(
      { success: false, error: error.message, count: 0 },
      { status: 500 }
    );
  }
}
