
'use server';

import { Resend } from 'resend';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';

async function getTemplate(templateId: string) {
  // Templates are now loaded from the local file, not Firestore.
  const template = defaultTemplates[templateId];
  if (template) {
    return { subject: template.subject, html: template.html };
  }

  console.warn(`Local email template '${templateId}' not found. No fallback available.`);
  return null;
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
  let bodyHtml = template.html;

  for (const key in variables) {
    const value = String(variables[key] ?? '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  }
  
  const finalHtml = bodyHtml;
  
  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email '${templateId}' to: ${to}`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: finalHtml,
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
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink, emailTitle: "Welcome to PawMe!" });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code, emailTitle: "Verify Your Email" });
}

export async function sendReferralSuccessEmail({ to, referrerName, newUserName, oldPoints, newPoints, newReferralCount }: { to: string, referrerName: string, newUserName: string, oldPoints: number, newPoints: number, newReferralCount: number }) {
  await renderAndSend('referralSuccess', to, { 
    referrerName, 
    newUserName, 
    newReferralCount, 
    newPoints: newPoints.toLocaleString(),
    unlockedRewardsHtml: '',
    emailTitle: "You've Earned Points!"
  });
}

export async function sendCustomPasswordResetEmail({ email }: { email: string }) {
  const HARDCODED_TEST_EMAIL = 'ashok.jaiswal@gmail.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const resetLink = `${appUrl}/reset-password?email=${encodeURIComponent(email)}`;
  
  console.log(`🔵 [EMAIL_ACTION] Sending password reset to hardcoded test email for user: ${email}`);
  await renderAndSend('passwordReset', HARDCODED_TEST_EMAIL, { 
    userName: email,
    link: resetLink,
    emailTitle: 'Reset Your Password' 
  });
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        try {
            await renderAndSend('productUpdate', user.email, {
              userName: user.name,
              emailTitle: subject,
              customBody: body, // Custom placeholder for this template
            });
        } catch (error) {
            console.error(`Failed to send broadcast to ${user.email}:`, error);
        }
    }
}

export async function sendShippingNotificationEmail({ to, userName, rewardTitle, trackingCode }: { to: string, userName: string, rewardTitle: string, trackingCode: string }) {
    await renderAndSend('shippingNotification', to, { userName, rewardTitle, trackingCode, emailTitle: 'Your Reward Has Shipped!' });
}

