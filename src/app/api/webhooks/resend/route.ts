import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// API webhooks must be dynamic — never statically generated
export const dynamic = 'force-dynamic';

// Resend webhook events for email tracking
// https://resend.com/docs/dashboard/webhooks/event-types

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Store all email events in Firestore
    const emailEventsRef = collection(db, 'emailEvents');
    
    const eventData = {
      type,
      email: data.to?.[0] || data.to || null,
      emailId: data.email_id || null,
      subject: data.subject || null,
      timestamp: serverTimestamp(),
      data: data,
    };

    // Track specific event types
    switch (type) {
      case 'email.sent':
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'sent',
        });
        break;

      case 'email.delivered':
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'delivered',
        });
        break;

      case 'email.opened':
        // Track email opens
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'opened',
          openedAt: new Date(data.created_at).toISOString(),
        });
        break;

      case 'email.clicked':
        // Track link clicks
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'clicked',
          clickedLink: data.click?.link || null,
          clickedAt: new Date(data.created_at).toISOString(),
        });
        break;

      case 'email.bounced':
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'bounced',
          bounceType: data.bounce?.type || null,
        });
        break;

      case 'email.complained':
        await addDoc(emailEventsRef, {
          ...eventData,
          event: 'complained',
        });
        break;

      default:
        // Store other events
        await addDoc(emailEventsRef, eventData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resend webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
