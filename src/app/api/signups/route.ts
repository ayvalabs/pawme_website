import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const usersRef = adminDb.collection('users');
    const querySnapshot = await usersRef.orderBy('createdAt', 'desc').get();
    
    const signups = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        points: data.points || 0,
        referralCount: data.referralCount || 0,
        referredBy: data.referredBy || null,
        createdAt: data.createdAt,
        isVip: data.isVip || false,
      };
    });

    const totalSnapshot = await usersRef.count().get();
    const totalSignups = totalSnapshot.data().count;

    return NextResponse.json({
      signups,
      totalSignups,
    });
  } catch (error) {
    console.error('Error fetching signups:', error);
    return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 });
  }
}
