
'use server';

import { Resend } from 'resend';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';

async function getAppUrl(): Promise<string> {
  // Try to get URL from Next.js headers (works at runtime)
  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // headers() not available in this context, fall through to fallback
  }
  
  // Fallback to environment variable or production URL
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.ayvalabs.com';
}

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

  const appUrl = await getAppUrl();
  
  // Convert all variables to strings
  const stringifiedVariables: Record<string, string> = {};
  for (const key in variables) {
    stringifiedVariables[key] = String(variables[key] ?? '');
  }
  
  const allVariables: Record<string, string> = {
    ...stringifiedVariables,
    emailTitle: subject,
    unsubscribeLink: `${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`,
  };

  for (const key in allVariables) {
    const value = String(allVariables[key] ?? '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  }
  
  const header = defaultTemplates.header.html;
  const footer = defaultTemplates.footer.html;
  const finalHtml = header + bodyHtml + footer;
  
  try {
    console.log(`[EMAIL] Sending email via Resend... (To: ${to}, Subject: ${subject})`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: finalHtml,
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
  const appUrl = await getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink, appUrl, emailTitle: "Welcome to PawMe!" });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code });
}

export async function sendAccountDeletionCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  console.log(`🔵 [EMAIL] Sending account deletion code to: ${to}`);
  await renderAndSend('accountDeletion', to, { userName: name, code });
}

export async function sendReferralSuccessEmail({ to, referrerName, newUserName, oldPoints, newPoints, newReferralCount }: { to: string, referrerName: string, newUserName: string, oldPoints: number, newPoints: number, newReferralCount: number }) {
  const appUrl = await getAppUrl();
  await renderAndSend('referralSuccess', to, { 
    referrerName, 
    newUserName, 
    newReferralCount, 
    newPoints: newPoints.toLocaleString(),
    unlockedRewardsHtml: '',
    appUrl,
    emailTitle: "You've Earned Points!"
  });
}

export async function sendCustomPasswordResetEmail({ email, resetLink }: { email: string, resetLink: string }) {
  console.log(`🔵 [EMAIL_ACTION] Sending password reset to: ${email}`);
  console.log(`🔵 [EMAIL_ACTION] Reset link: ${resetLink}`);
  await renderAndSend('passwordReset', email, { 
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

export async function sendVipDepositReceiptEmail({ to, name, amount }: { to: string, name: string, amount: string }) {
  const appUrl = await getAppUrl();
  console.log(`🔵 [EMAIL_ACTION] Sending VIP deposit receipt to: ${to}`);
  await renderAndSend('vipDepositReceipt', to, { 
    userName: name,
    amount,
    appUrl,
    emailTitle: 'VIP Deposit Receipt - Welcome to PawMe!' 
  });
}

export async function sendPasswordResetCodeEmail({ to, code }: { to: string, code: string }) {
  console.log(`🔵 [EMAIL_ACTION] Sending password reset code to: ${to}`);
  await renderAndSend('passwordResetCode', to, { 
    code,
    emailTitle: 'Reset Your Password' 
  });
}
