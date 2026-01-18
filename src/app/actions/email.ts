
'use server';

import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';

function getAppUrl(): string {
  // Use the explicitly set public app URL if available
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback to Vercel's system environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Default to localhost for local development
  return 'http://localhost:9008';
}

async function getTemplateFromFile(templateId: string): Promise<{ subject: string, html: string } | null> {
    try {
        const metadata = defaultTemplates[templateId];
        if (!metadata) {
            console.warn(`⚠️ [EMAIL_ACTION] No file metadata found for template '${templateId}'`);
            return null;
        }

        const filePath = path.join(process.cwd(), 'src', 'lib', 'email-assets', `${templateId}.html`);
        const html = await fs.readFile(filePath, 'utf-8');
        console.log(`✅ [EMAIL_ACTION] Fetched template '${templateId}' from file system.`);

        return { subject: metadata.subject, html };
    } catch (fileError: any) {
        console.error(`❌ [EMAIL_ACTION] Failed to read template file for '${templateId}':`, fileError);
        return null;
    }
}

async function getTemplate(templateId: string) {
  console.log(`🔵 [EMAIL_ACTION] Fetching template '${templateId}' from file system.`);
  return await getTemplateFromFile(templateId);
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  console.log(`🔵 [EMAIL_ACTION] Starting renderAndSend for template: ${templateId}, to: ${to}`);
  console.log(`🔵 [EMAIL_ACTION] Environment check - RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
  console.log(`🔵 [EMAIL_ACTION] Environment check - FIREBASE_SERVICE_ACCOUNT_KEY exists: ${!!process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`);
  
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set. Email '${templateId}' to '${to}' cannot be sent.`);
    throw new Error('Server is missing API key for email service.');
  }

  const template = await getTemplate(templateId);
  const settings = {}; // No dynamic settings without Admin SDK


  if (!template) {
    console.error(`❌ [EMAIL_ACTION] Email template "${templateId}" is missing from both Firestore and local files.`);
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
  
  const headerHtmlTemplate = settings.emailHeader || defaultTemplates['header']?.html || '';
  const footerHtmlTemplate = settings.emailFooter || defaultTemplates['footer']?.html || '';
  
  let headerHtml = headerHtmlTemplate.replace(/{{emailTitle}}/g, subject);
  
  const appUrl = getAppUrl();
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`;
  let footerHtml = footerHtmlTemplate.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);

  const finalHtml = `${headerHtml}${bodyHtml}${footerHtml}`;
  
  try {
    console.log(`🔵 [EMAIL_ACTION] Sending email '${templateId}' to: ${to}`);
    console.log(`🔵 [EMAIL_ACTION] From address: ${fromEmail}`);
    console.log(`🔵 [EMAIL_ACTION] Subject: ${subject}`);
    console.log(`🔵 [EMAIL_ACTION] HTML length: ${finalHtml.length} characters`);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: finalHtml,
    });

    if (error) {
      console.error(`❌ [EMAIL_ACTION] Resend API returned an error for template '${templateId}':`, JSON.stringify(error, null, 2));
      console.error(`❌ [EMAIL_ACTION] Error details - name: ${error.name}, message: ${error.message}`);
      throw error;
    }
    
    console.log(`✅ [EMAIL_ACTION] Email '${templateId}' sent successfully via Resend. Email ID:`, data?.id);
    return data;
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION] A catch-block error occurred while sending email '${templateId}':`, error);
    console.error(`❌ [EMAIL_ACTION] Error stack trace:`, error?.stack);
    console.error(`❌ [EMAIL_ACTION] Error name: ${error?.name}, message: ${error?.message}`);
    throw error;
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  console.log(`🔵 [EMAIL_ACTION] sendVerificationCodeEmail called for: ${to}`);
  try {
    await renderAndSend('verificationCode', to, { userName: name, code, emailTitle: "Verify Your Email" });
    console.log(`✅ [EMAIL_ACTION] Verification email completed successfully for: ${to}`);
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION] sendVerificationCodeEmail failed for ${to}:`, error);
    console.error(`❌ [EMAIL_ACTION] Full error object:`, JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  await renderAndSend('referralSuccess', to, { referrerName, newReferralCount, newPoints: newPoints.toLocaleString() });
}

export async function sendCustomPasswordResetEmail({ email }: { email: string }): Promise<{ success: boolean; message?: string }> {
  console.log('⚠️ [EMAIL_ACTION] Custom password reset email not available without Firebase Admin SDK.');
  console.log('⚠️ [EMAIL_ACTION] Use Firebase client SDK sendPasswordResetEmail() instead.');
  return { success: false, message: 'Password reset must be handled client-side. Please use the built-in Firebase password reset.' };
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    const appUrl = getAppUrl();
    const settings = {}; // No dynamic settings without Admin SDK

    const headerHtmlTemplate = defaultTemplates['header']?.html || '';
    const footerHtmlTemplate = defaultTemplates['footer']?.html || '';

    const headerHtml = headerHtmlTemplate.replace(/{{emailTitle}}/g, subject);

    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}`;
        const footerHtml = footerHtmlTemplate.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);
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
