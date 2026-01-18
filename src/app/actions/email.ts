
'use server';

import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';
const BUILD_VERSION = 'v1.0.2-debug-paths';

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

// Convert camelCase template ID to kebab-case filename
function templateIdToFilename(templateId: string): string {
  // Convert camelCase to kebab-case: verificationCode -> verification-code
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function getTemplateFromFile(templateId: string): Promise<{ subject: string, html: string } | null> {
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] ========== LOADING TEMPLATE: '${templateId}' ==========`);
    
    const filename = templateIdToFilename(templateId);
    console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Template ID '${templateId}' → filename '${filename}.html'`);

    const cwd = process.cwd();
    // In Vercel, the 'public' folder is at the root of the deployment directory.
    const filePath = path.join(cwd, 'public', 'email-templates', `${filename}.html`);

    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Attempting to read file at path: ${filePath}`);

    try {
        const html = await fs.readFile(filePath, 'utf-8');
        console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Successfully read file: ${html.length} characters`);
        
        const metadata = defaultTemplates[templateId];
        if (!metadata) {
            console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] No metadata found for template '${templateId}' after reading file. This should not happen.`);
            return null;
        }

        console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] ========== TEMPLATE LOADED SUCCESSFULLY ==========`);
        return { subject: metadata.subject, html };

    } catch (fileError: any) {
        console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] ========== TEMPLATE FILE READ FAILED ==========`);
        console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error reading file at path: ${filePath}`);
        console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error code:`, fileError.code);
        console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error message:`, fileError.message);
        
        // Add more debugging for Vercel environment
        if (process.env.VERCEL) {
            console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Vercel environment detected. Checking directory contents...`);
            try {
                const rootDir = await fs.readdir(cwd);
                console.log(`📁 [${BUILD_VERSION}] Root dir contents:`, rootDir.slice(0, 20));
                
                const publicDir = await fs.readdir(path.join(cwd, 'public'));
                console.log(`📁 [${BUILD_VERSION}] Public dir contents:`, publicDir);

                if (publicDir.includes('email-templates')) {
                    const templatesDir = await fs.readdir(path.join(cwd, 'public', 'email-templates'));
                    console.log(`📁 [${BUILD_VERSION}] /public/email-templates contents:`, templatesDir);
                } else {
                    console.log(`⚠️ [${BUILD_VERSION}] The 'public/email-templates' directory does NOT exist.`);
                }
            } catch (dirError: any) {
                console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error reading directories for debugging:`, dirError.message);
            }
        }
        
        return null;
    }
}

async function getTemplate(templateId: string) {
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Fetching template '${templateId}' from file system.`);
  return await getTemplateFromFile(templateId);
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Starting renderAndSend for template: ${templateId}, to: ${to}`);
  
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] FATAL: RESEND_API_KEY is not set. Email '${templateId}' to '${to}' cannot be sent.`);
    throw new Error('Server is missing API key for email service.');
  }

  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 1: Loading template '${templateId}'...`);
  const template = await getTemplate(templateId);
  
  if (!template) {
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] FATAL: Email template "${templateId}" is missing.`);
    throw new Error(`Email template "${templateId}" is missing.`);
  }
  console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Step 1 complete: Template loaded successfully`);

  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 2: Processing template variables...`);
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Variables provided:`, Object.keys(variables));
  
  let subject = template.subject;
  let bodyHtml = template.html;

  for (const key in variables) {
    const value = String(variables[key] ?? '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  }
  console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Step 2 complete: Variables replaced in subject and body`);
  
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 3: Loading header and footer templates...`);
  const headerTemplate = await getTemplateFromFile('header');
  const footerTemplate = await getTemplateFromFile('footer');
  
  if (!headerTemplate) console.warn(`⚠️ [EMAIL_ACTION - ${BUILD_VERSION}] Header template not found, using empty header`);
  if (!footerTemplate) console.warn(`⚠️ [EMAIL_ACTION - ${BUILD_VERSION}] Footer template not found, using empty header`);
  
  const headerHtmlTemplate = headerTemplate?.html || '';
  const footerHtmlTemplate = footerTemplate?.html || '';
  console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Step 3 complete: Header (${headerHtmlTemplate.length} chars) and footer (${footerHtmlTemplate.length} chars) loaded`);
  
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 4: Assembling final email HTML...`);
  let headerHtml = headerHtmlTemplate.replace(/{{emailTitle}}/g, subject);
  
  const appUrl = getAppUrl();
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] App URL: ${appUrl}`);
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`;
  let footerHtml = footerHtmlTemplate.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);

  const finalHtml = `${headerHtml}${bodyHtml}${footerHtml}`;
  console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Step 4 complete: Final HTML assembled (${finalHtml.length} total characters)`);
  
  try {
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 5: Sending email via Resend API...`);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: finalHtml,
    });

    if (error) {
      console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Resend API returned an error for template '${templateId}':`, JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] ✅ SUCCESS! Email '${templateId}' sent via Resend. Email ID:`, data?.id);
    return data;
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] A catch-block error occurred while sending email '${templateId}':`, error);
    throw error;
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] sendVerificationCodeEmail called for: ${to}`);
  try {
    await renderAndSend('verificationCode', to, { userName: name, code, emailTitle: "Verify Your Email" });
    console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Verification email completed successfully for: ${to}`);
  } catch (error: any) {
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] sendVerificationCodeEmail failed for ${to}:`, error);
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

    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Step 3: Loading header and footer templates...`);
  const headerTemplate = await getTemplateFromFile('header');
  const footerTemplate = await getTemplateFromFile('footer');
  
  if (!headerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION - ${BUILD_VERSION}] Header template not found, using empty header`);
  }
  if (!footerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION - ${BUILD_VERSION}] Footer template not found, using empty header`);
  }
  
  const headerHtmlTemplate = headerTemplate?.html || '';
  const footerHtmlTemplate = footerTemplate?.html || '';
  console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Step 3 complete: Header (${headerHtmlTemplate.length} chars) and footer (${footerHtmlTemplate.length} chars) loaded`);

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
