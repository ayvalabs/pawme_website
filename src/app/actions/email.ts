
'use server';

import { Resend } from 'resend';
import { defaultTemplates } from '@/lib/email-templates';

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

async function renderAndSend(templateId: keyof typeof defaultTemplates, to: string, variables: Record<string, any>) {
  console.log(`[EMAIL] Rendering and sending template "${templateId}" to ${to}`);
  
  if (!process.env.RESEND_API_KEY) {
    console.error(`[EMAIL] FATAL: RESEND_API_KEY is not set.`);
    throw new Error('Server is not configured to send emails. [Missing API Key]');
  }

  const template = defaultTemplates[templateId];

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
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code });
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  await renderAndSend('referralSuccess', to, { referrerName, newReferralCount, newPoints: newPoints.toLocaleString() });
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    const fullBodyHtml = `${defaultTemplates.header.html}${bodyTemplate}${defaultTemplates.footer.html}`.replace(/{{emailTitle}}/g, subject);

    for (const user of users) {
        const personalizedBody = fullBodyHtml
          .replace(/{{userName}}/g, user.name)
          .replace(/{{unsubscribeLink}}/g, `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(user.email)}`);

        try {
            await resend.emails.send({
                from: fromEmail,
                to: user.email,
                subject,
                html: personalizedBody,
            });
        } catch (error) {
            console.error(`Failed to send broadcast to ${user.email}:`, error);
        }
    }
}

export async function sendShippingNotificationEmail({ to, userName, rewardTitle, trackingCode }: { to: string, userName: string, rewardTitle: string, trackingCode: string }) {
    await renderAndSend('shippingNotification', to, { userName, rewardTitle, trackingCode });
}
