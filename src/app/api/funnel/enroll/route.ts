import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Enroll a user in the lead-to-VIP email funnel
export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, message: 'userId and email are required' },
        { status: 400 }
      );
    }

    // Check if user is already VIP
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Don't enroll if already VIP
    if (userData.isVip) {
      return NextResponse.json({
        success: false,
        message: 'User is already VIP',
        enrolled: false,
      });
    }

    // Don't enroll if not subscribed to marketing
    if (!userData.marketingOptIn) {
      return NextResponse.json({
        success: false,
        message: 'User has not opted in to marketing emails',
        enrolled: false,
      });
    }

    // Check if already enrolled
    const existingEnrollment = await adminDb
      .collection('emailFunnelUsers')
      .where('userId', '==', userId)
      .where('funnelType', '==', 'lead-to-vip')
      .where('funnelStatus', 'in', ['active', 'paused'])
      .limit(1)
      .get();

    if (!existingEnrollment.empty) {
      return NextResponse.json({
        success: true,
        message: 'User already enrolled in funnel',
        enrolled: false,
        existingEnrollmentId: existingEnrollment.docs[0].id,
      });
    }

    // Create funnel enrollment
    const now = FieldValue.serverTimestamp();
    const funnelUserData = {
      userId,
      email,
      name: name || userData.name || email.split('@')[0],
      funnelStatus: 'active',
      funnelType: 'lead-to-vip',
      startedAt: now,
      currentEmailIndex: 0,
      nextEmailDue: now, // Send first email immediately
      isSubscribed: true,
      isVip: false,
      tags: ['lead_new'],
      
      totalEmailsSent: 0,
      totalOpens: 0,
      totalClicks: 0,
      
      pollResponses: {},
      quizResponses: {},
      
      createdAt: now,
      updatedAt: now,
    };

    const funnelUserRef = await adminDb.collection('emailFunnelUsers').add(funnelUserData);

    // Update user document with funnel status
    await adminDb.collection('users').doc(userId).update({
      emailFunnelStatus: {
        currentFunnel: 'lead-to-vip',
        status: 'active',
        startedAt: now,
      },
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: 'User enrolled in funnel',
      enrolled: true,
      funnelUserId: funnelUserRef.id,
    });
  } catch (error: any) {
    console.error('Funnel enrollment error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
