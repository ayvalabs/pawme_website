
'use server';

import { Resend } from 'resend';
import { doc, getDoc } from 'firebase/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { defaultTemplates, EmailTemplate } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:9008';
}

async function getTemplate(templateId: string): Promise<{ subject: string; html: string; } | null> {
  try {
    console.log(`🔵 [EMAIL_ACTION] Attempting to load template '${templateId}' from Firestore.`);
    const db = getAdminFirestore();
    const templateRef = doc(db, 'emailTemplates', templateId);
    const docSnap = await getDoc(templateRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as EmailTemplate;
      console.log(`✅ [EMAIL_ACTION] Successfully loaded template '${templateId}' from Firestore.`);
      return { subject: data.subject, html: data.html };
    }
    console.log(`🟡 [EMAIL_ACTION] Template '${templateId}' not found in Firestore. Falling back to local default.`);
  } catch (error: any) {
    console.warn(`⚠️ [EMAIL_ACTION] Could not connect to Firestore to get template '${templateId}'. This is likely due to missing admin credentials. Falling back to local default. Error: ${error.message}`);
  }

  // Fallback to local templates
  if (defaultTemplates[templateId]) {
    const template = defaultTemplates[templateId];
    return { subject: template.subject, html: template.html };
  }

  return null;
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  console.log(`🔵 [EMAIL_ACTION] Starting renderAndSend for template: ${templateId}, to: ${to}`);

  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set.`);
    throw new Error('Server is missing API key for email service.');
  }

  const template = await getTemplate(templateId);

  if (!template) {
    console.error(`❌ [EMAIL_ACTION] FATAL: Email template "${templateId}" is missing from both Firestore and local fallbacks.`);
    throw new Error(`Email template "${templateId}" is missing.`);
  }

  let subject = template.subject;
  let bodyHtml = template.html
    .replace(/{{header}}/g, defaultTemplates.header.html)
    .replace(/{{footer}}/g, defaultTemplates.footer.html);

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

  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email via Resend... To: ${to}, Subject: ${subject}`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: bodyHtml,
    });

    if (error) {
      console.error(`❌ [EMAIL_ACTION] Resend API error for '${templateId}':`, JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log(`✅ [EMAIL_ACTION] SUCCESS! Email sent. ID:`, data?.id);
    return data;
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION] Catch-block error sending '${templateId}':`, error);
    throw error;
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code });
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  await renderAndSend('referralSuccess', to, { referrerName, newReferralCount, newPoints: newPoints.toLocaleString() });
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    const header = defaultTemplates.header.html.replace(/{{emailTitle}}/g, subject);

    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        const unsubscribeUrl = `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(user.email)}`;
        const footer = defaultTemplates.footer.html.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);
        const finalHtml = `${header}${body}${footer}`;

        try {
            await resend.emails.send({
                from: fromEmail,
                to: user.email,
                subject,
                html: finalHtml,
            });
        } catch (error) {
            console.error(`Failed to send broadcast to ${user.email}:`, error);
        }
    }
}

export async function sendShippingNotificationEmail({ to, userName, rewardTitle, trackingCode }: { to: string, userName: string, rewardTitle: string, trackingCode: string }) {
    await renderAndSend('shippingNotification', to, { userName, rewardTitle, trackingCode });
}
