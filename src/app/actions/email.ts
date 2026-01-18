
'use server';

import { Resend } from 'resend';
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

function getTemplate(templateId: string): { subject: string; html: string } | null {
  console.log(`🔵 [EMAIL_ACTION] Loading template '${templateId}' from defaults.`);
  
  if (defaultTemplates[templateId]) {
    const template = defaultTemplates[templateId];
    return { subject: template.subject, html: template.html };
  }
  
  console.error(`❌ [EMAIL_ACTION] FATAL: No template found for '${templateId}' in defaults.`);
  return null;
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  console.log(`🔵 [EMAIL_ACTION] Starting renderAndSend for template: ${templateId}, to: ${to}`);
  
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set.`);
    throw new Error('Server is missing API key for email service.');
  }

  const template = getTemplate(templateId);
  
  if (!template) {
    console.error(`❌ [EMAIL_ACTION] FATAL: Email template "${templateId}" is missing.`);
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
  
  // The header and footer are now part of each template's HTML content.
  const finalHtml = bodyHtml
    .replace(/{{emailTitle}}/g, subject)
    .replace(/{{unsubscribeLink}}/g, `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(to)}`);

  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email via Resend... To: ${to}, Subject: ${subject}`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: finalHtml,
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
    const headerTemplate = getTemplate('header');
    const footerTemplate = getTemplate('footer');
    
    if (!headerTemplate || !footerTemplate) {
        throw new Error("Header or footer template is missing.");
    }
    
    const headerHtml = headerTemplate.html.replace(/{{emailTitle}}/g, subject);

    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        const unsubscribeUrl = `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(user.email)}`;
        const footerHtml = footerTemplate.html.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);
        const finalHtml = `${headerHtml}${body}${footerHtml}`;

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
