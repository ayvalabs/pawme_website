
'use server';

import { Resend } from 'resend';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
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
  try {
    const adminDb = getAdminFirestore();
    const templateRef = doc(adminDb, 'emailTemplates', templateId);
    const templateSnap = await getDoc(templateRef);

    if (templateSnap.exists()) {
      console.log(`✅ [EMAIL_ACTION] Fetched template '${templateId}' from Firestore.`);
      return templateSnap.data() as { subject: string, html: string };
    } else {
      console.warn(`⚠️ [EMAIL_ACTION] Email template '${templateId}' not found in Firestore, falling back to file.`);
      return await getTemplateFromFile(templateId);
    }
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION] Error fetching email template '${templateId}' from Firestore. This is likely a permissions issue. Falling back to file system.`, error);
    return await getTemplateFromFile(templateId);
  }
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set. Email '${templateId}' to '${to}' cannot be sent.`);
    throw new Error('Server is missing API key for email service.');
  }

  const [template, settings] = await (async () => {
      try {
        const adminDb = getAdminFirestore();
        const [template, settingsSnap] = await Promise.all([
          getTemplate(templateId),
          getDoc(doc(adminDb, 'app-settings', 'rewards'))
        ]);
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
        return [template, settingsData];
      } catch (e) {
        console.warn('⚠️ [EMAIL_ACTION] Could not fetch app-settings or templates from Firestore, using file-based fallbacks. This is likely a Firebase Admin auth issue.');
        const [template] = await Promise.all([ getTemplateFromFile(templateId) ]);
        return [template, {}];
      }
    })();


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
    throw error;
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code, emailTitle: "Verify Your Email" });
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  await renderAndSend('referralSuccess', to, { referrerName, newReferralCount, newPoints: newPoints.toLocaleString() });
}

export async function sendCustomPasswordResetEmail({ email }: { email: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const adminAuth = (await import('@/lib/firebase-admin')).getAdminAuth();
    const user = await adminAuth.getUserByEmail(email);
    const link = await adminAuth.generatePasswordResetLink(email);
    
    await renderAndSend('passwordReset', email, { 
      userName: user.displayName || user.email,
      link 
    });
    
    return { success: true, message: 'Password reset email sent!' };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`Password reset requested for non-existent user: ${email}`);
      return { success: true, message: 'If an account with this email exists, a password reset link has been sent.' };
    }
    console.error('Error sending password reset email:', error);
    return { success: false, message: 'Could not send password reset email.' };
  }
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    const appUrl = getAppUrl();
    let settings = {};
    try {
      const adminDb = getAdminFirestore();
      const settingsSnap = await getDoc(doc(adminDb, 'app-settings', 'rewards'));
      settings = settingsSnap.exists() ? settingsSnap.data() : {};
    } catch(e) {
      console.warn("⚠️ [EMAIL_ACTION] Could not load branding from Firestore for broadcast. Using file fallbacks.");
    }

    const headerHtmlTemplate = settings.emailHeader || defaultTemplates['header']?.html || '';
    const footerHtmlTemplate = settings.emailFooter || defaultTemplates['footer']?.html || '';

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
