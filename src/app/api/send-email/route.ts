
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderTemplate } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.NODE_ENV === 'production' 
  ? 'PawMe <pawme@ayvalabs.com>' 
  : 'PawMe <onboarding@resend.dev>';


export async function POST(request: NextRequest) {
  console.log('📧 Email API route called');
  try {
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { to, subject, html, templateId, variables } = body;

    if (!to) {
      console.error('❌ Missing recipient email');
      return NextResponse.json(
        { error: 'Missing recipient email' },
        { status: 400 }
      );
    }

    let emailSubject = subject;
    let emailHtml = html;

    // If templateId is provided, render the template
    if (templateId) {
      console.log('Rendering template:', templateId);
      console.log('Template variables:', variables);
      const rendered = renderTemplate(templateId, variables || {});
      emailSubject = rendered.subject;
      emailHtml = rendered.html;
      console.log('Template rendered successfully');
      console.log('Subject:', emailSubject);
    }

    if (!emailSubject || !emailHtml) {
      console.error('❌ Missing subject or html content');
      return NextResponse.json(
        { error: 'Missing subject or html content' },
        { status: 400 }
      );
    }

    console.log('Sending email via Resend...');
    console.log('To:', to);
    console.log('Subject:', emailSubject);
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email sent successfully!');
    console.log('Resend response data:', data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
