
'use server';

import { Resend } from 'resend';
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  
  let subjectTemplate = '';
  let htmlTemplate = '';

  try {
    const templateRef = doc(db, 'emailTemplates', 'welcome');
    const templateSnap = await getDoc(templateRef);

    if (templateSnap.exists()) {
      const templateData = templateSnap.data();
      subjectTemplate = templateData.subject;
      htmlTemplate = templateData.html;
    } else {
      console.warn("Welcome email template not found in Firestore, using default.");
      const defaultTemplate = defaultTemplates.welcome;
      subjectTemplate = defaultTemplate.subject;
      htmlTemplate = defaultTemplate.html;
    }
  } catch (error) {
    console.error("Error fetching email template from Firestore, using default fallback.", error);
    const defaultTemplate = defaultTemplates.welcome;
    subjectTemplate = defaultTemplate.subject;
    htmlTemplate = defaultTemplate.html;
  }

  const subject = subjectTemplate.replace(/{{userName}}/g, name);
  
  const html = htmlTemplate
    .replace(/{{userName}}/g, name)
    .replace(/{{referralLink}}/g, referralLink)
    .replace(/{{referralCode}}/g, referralCode);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  console.log('🔵 [EMAIL_ACTION] Preparing to send verification code email via Resend.');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set. Email cannot be sent.');
    throw new Error('Server is missing API key for email service.');
  }
  console.log('✅ [EMAIL_ACTION] RESEND_API_KEY is present.');

  const template = defaultTemplates.verificationCode;
  if (!template) {
    console.error("❌ [EMAIL_ACTION] Verification code email template not found.");
    throw new Error('Email template "verificationCode" is missing.');
  }
  console.log('✅ [EMAIL_ACTION] Email template found.');

  const subject = template.subject.replace(/{{userName}}/g, name);
  const html = template.html
    .replace(/{{userName}}/g, name)
    .replace(/{{code}}/g, code);
  
  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email to: ${to} with subject: "${subject}"`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ [EMAIL_ACTION] Resend API returned an error:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('✅ [EMAIL_ACTION] Email sent successfully via Resend. Email ID:', data?.id);

  } catch (error) {
    console.error('❌ [EMAIL_ACTION] A catch-block error occurred while sending verification email:', error);
    throw new Error('Failed to send verification email due to a server error.');
  }
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  let subjectTemplate = '';
  let htmlTemplate = '';

  try {
    const templateRef = doc(db, 'emailTemplates', 'referralSuccess');
    const templateSnap = await getDoc(templateRef);

    if (templateSnap.exists()) {
      const templateData = templateSnap.data();
      subjectTemplate = templateData.subject;
      htmlTemplate = templateData.html;
    } else {
      const defaultTemplate = defaultTemplates.referralSuccess;
      subjectTemplate = defaultTemplate.subject;
      htmlTemplate = defaultTemplate.html;
    }
  } catch (error) {
    console.error("Error fetching referral success template, using default.", error);
    const defaultTemplate = defaultTemplates.referralSuccess;
    subjectTemplate = defaultTemplate.subject;
    htmlTemplate = defaultTemplate.html;
  }
  
  const subject = subjectTemplate;
  const html = htmlTemplate
    .replace(/{{referrerName}}/g, referrerName)
    .replace(/{{newReferralCount}}/g, newReferralCount.toString())
    .replace(/{{newPoints}}/g, newPoints.toLocaleString());
  
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to send referral success email:', error);
  }
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        try {
            await resend.emails.send({
                from: fromEmail,
                to: user.email,
                subject,
                html: body,
            });
        } catch (error) {
            console.error(`Failed to send broadcast to ${user.email}:`, error);
        }
    }
}

export async function sendShippingNotificationEmail({ to, userName, rewardTitle, trackingCode }: { to: string, userName: string, rewardTitle: string, trackingCode: string }) {
    const subject = `🎁 Your PawMe Reward has Shipped!`;
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: #7678EE;">🚀 It's on its way, ${userName}!</h2>
      <p>Great news! Your reward, <strong>${rewardTitle}</strong>, has been shipped.</p>
      <p>You can track your package using the following tracking code:</p>
      <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed #7678EE; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px;">
        ${trackingCode}
      </p>
      <p>Thank you for being an essential part of the PawMe community. We appreciate your support!</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team</strong></p>
    </div>
    `;

    try {
        await resend.emails.send({
            from: fromEmail,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error(`Failed to send shipping notification to ${to}:`, error);
        throw new Error('Failed to send shipping notification');
    }
}
