import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get all users from Firestore
    const usersSnapshot = await adminDb.collection('users').get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: 'No users found' },
        { status: 404 }
      );
    }

    // Build CSV content
    const csvRows = [];
    
    // Header row
    csvRows.push('Name,Email,Status,Joined Date,Referral Code,Points,Referral Count');

    // Data rows
    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      const name = (user.name || '').replace(/,/g, ' '); // Remove commas from name
      const email = user.email || '';
      const status = user.isVip ? 'VIP' : 'Free';
      const joinedDate = user.createdAt ? user.createdAt.split('T')[0] : '';
      const referralCode = user.referralCode || '';
      const points = user.points || 0;
      const referralCount = user.referralCount || 0;

      csvRows.push(`${name},${email},${status},${joinedDate},${referralCode},${points},${referralCount}`);
    });

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pawme-leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('[export-leads] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export leads' },
      { status: 500 }
    );
  }
}
