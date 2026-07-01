import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || '');
  return _resend;
}

export async function POST(request: NextRequest) {
  try {
    const { recipients, subject, htmlContent } = await request.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { success: false, message: 'Subject and content are required' },
        { status: 400 }
      );
    }

    // Send emails individually with personalization
    const results = await Promise.allSettled(
      recipients.map(async (recipient: { email: string; name: string }) => {
        // Replace {{name}} placeholder with actual name
        const personalizedContent = htmlContent.replace(/\{\{name\}\}/g, recipient.name);

        return getResend().emails.send({
          from: 'PawMe <noreply@ayvalabs.com>',
          to: recipient.email,
          subject: subject,
          html: personalizedContent,
          tags: [
            { name: 'category', value: 'bulk-email' },
          ],
        });
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: recipients.length,
    });
  } catch (error: any) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
