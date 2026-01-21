
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

async function renderAndSend(templateId: keyof typeof defaultTemplates, to: string, variables: Record<string, any>) {
  console.log(`[EMAIL] Rendering and sending template "${templateId}" to ${to}`);
  
  if (!process.env.RESEND_API_KEY) {
    console.error(`[EMAIL] FATAL: RESEND_API_KEY is not set.`);
    throw new Error('Server is not configured to send emails. [Missing API Key]');
  }

  const template = await getTemplate(templateId);

  if (!template) {
    console.error(`[EMAIL] FATAL: Email template "${templateId}" is not defined in defaultTemplates.`);
    throw new Error(`Email template "${templateId}" is missing.`);
  }

  let subject = template.subject;
  let bodyHtml = template.html;

  const allVariables = {
    ...variables,
    emailTitle: subject,
    unsubscribeLink: `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(to)}`,
  };

  for (const key in allVariables) {
    const value = String(allVariables[key] ?? '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  }
  
  const finalHtml = bodyHtml;
  
  try {
    console.log(`[EMAIL] Sending email via Resend... (To: ${to}, Subject: ${subject})`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: bodyHtml,
    });

    if (error) {
      console.error(`[EMAIL] RESEND_API_ERROR for template '${templateId}':`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to send email. Provider returned error: ${error.message}`);
    }
    
    console.log(`[EMAIL] SUCCESS! Email sent. ID:`, data?.id);
    return data;
  } catch (error: any) {
    console.error(`[EMAIL] CATCH_BLOCK_ERROR sending template '${templateId}':`, error);
    throw error;
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink, emailTitle: "Welcome to PawMe!" });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code });
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

