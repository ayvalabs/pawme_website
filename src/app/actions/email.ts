
'use server';

import { Resend } from 'resend';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';
const adminDb = getAdminFirestore();

async function getTemplate(templateId: string) {
  try {
    const templateRef = doc(adminDb, 'emailTemplates', templateId);
    const templateSnap = await getDoc(templateRef);

    if (templateSnap.exists()) {
      return templateSnap.data() as { subject: string, html: string };
    } else {
      console.warn(`Email template '${templateId}' not found in Firestore, using default.`);
      return defaultTemplates[templateId];
    }
  } catch (error) {
    console.error(`Error fetching email template '${templateId}' from Firestore, using default fallback.`, error);
    return defaultTemplates[templateId];
  }
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set. Email '${templateId}' to '${to}' cannot be sent.`);
    throw new Error('Server is missing API key for email service.');
  }

  const template = await getTemplate(templateId);
  if (!template) {
    console.error(`❌ [EMAIL_ACTION] Email template "${templateId}" is missing.`);
    throw new Error(`Email template "${templateId}" is missing.`);
  }

  let subject = template.subject;
  let html = template.html;

  for (const key in variables) {
    const value = variables[key];
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, String(value));
    html = html.replace(regex, String(value));
  }
  
  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email '${templateId}' to: ${to}`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`❌ [EMAIL_ACTION] Resend API returned an error for template '${templateId}':`, JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log(`✅ [EMAIL_ACTION] Email '${templateId}' sent successfully via Resend. Email ID:`, data?.id);
    return data;
  } catch (error) {
    console.error(`❌ [EMAIL_ACTION] A catch-block error occurred while sending email '${templateId}':`, error);
    throw new Error(`Failed to send email '${templateId}' due to a server error.`);
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code });
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  await renderAndSend('referralSuccess', to, { referrerName, newReferralCount, newPoints: newPoints.toLocaleString() });
}

export async function sendCustomPasswordResetEmail({ email }: { email: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const adminAuth = getAdminAuth();
    const user = await adminAuth.getUserByEmail(email);
    const link = await adminAuth.generatePasswordResetLink(email);
    
    await renderAndSend('passwordReset', email, { 
      userName: user.displayName || user.email,
      link 
    });
    
    return { success: true, message: 'Password reset email sent!' };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Don't reveal that the user doesn't exist for security reasons.
      console.log(`Password reset requested for non-existent user: ${email}`);
      return { success: true, message: 'If an account with this email exists, a password reset link has been sent.' };
    }
    console.error('Error sending password reset email:', error);
    return { success: false, message: 'Could not send password reset email.' };
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
    await renderAndSend('shippingNotification', to, { userName, rewardTitle, trackingCode });
}
