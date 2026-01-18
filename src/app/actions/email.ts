
'use server';

import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';
import { defaultTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';
const BUILD_VERSION = 'v1.0.3-path-finder';

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:9008';
}

function templateIdToFilename(templateId: string): string {
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function getTemplateFromFile(templateId: string): Promise<{ subject: string; html: string } | null> {
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] ========== LOADING TEMPLATE: '${templateId}' ==========`);
    
    const filename = templateIdToFilename(templateId);
    console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Template ID '${templateId}' → filename '${filename}.html'`);

    const cwd = process.cwd();
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Current working directory: ${cwd}`);
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] __dirname:`, __dirname);
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Environment: ${process.env.NODE_ENV}`);
    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Vercel: ${process.env.VERCEL ? 'YES' : 'NO'}`);

    const possiblePaths = [
      path.join(cwd, 'public', 'email-templates', `${filename}.html`),
      path.join(cwd, 'src', 'lib', 'email-assets', `${filename}.html`),
      path.join(cwd, '.next', 'server', 'public', 'email-templates', `${filename}.html`),
      path.join(cwd, 'email-templates', `${filename}.html`),
    ];

    console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Will try ${possiblePaths.length} possible paths...`);

    for (let i = 0; i < possiblePaths.length; i++) {
        const filePath = possiblePaths[i];
        console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Trying path ${i + 1}/${possiblePaths.length}: ${filePath}`);
        try {
            const html = await fs.readFile(filePath, 'utf-8');
            console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Found file at path ${i + 1}!`);
            console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Using file path: ${filePath}`);
            console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] Successfully read file: ${html.length} characters`);
            
            const metadata = defaultTemplates[templateId];
            if (!metadata) {
                console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] No metadata found for template '${templateId}' after reading file.`);
                return null;
            }

            console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] ========== TEMPLATE LOADED SUCCESSFULLY ==========`);
            return { subject: metadata.subject, html };
        } catch (fileError: any) {
            if (fileError.code === 'ENOENT') {
                console.log(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Not found at path ${i + 1}`);
            } else {
                console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error at path ${i + 1}:`, fileError.message);
            }
        }
    }
    
    // If loop completes without finding the file
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] File NOT found in any of the ${possiblePaths.length} paths!`);
    console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Searched paths:\n   1. ${possiblePaths[0]}\n   2. ${possiblePaths[1]}\n   3. ${possiblePaths[2]}\n   4. ${possiblePaths[3]}`);

    if (process.env.VERCEL) {
        console.log(`🔵 [EMAIL_ACTION - ${BUILD_VERSION}] Attempting to explore directory structure...`);
        try {
            const rootDir = await fs.readdir(cwd);
            console.log(`📁 [EMAIL_ACTION - ${BUILD_VERSION}] Root directory (${cwd}):\n   Files/folders:`, rootDir.slice(0, 50).join(', '));
            
            try {
              const publicDir = await fs.readdir(path.join(cwd, 'public'));
              console.log(`📁 [EMAIL_ACTION - ${BUILD_VERSION}] Public directory (${path.join(cwd, 'public')}):\n   Files/folders:`, publicDir.join(', '));
              if (!publicDir.includes('email-templates')) {
                  console.log(`   ⚠️  'email-templates' folder NOT found in public/`);
              } else {
                 const templatesDir = await fs.readdir(path.join(cwd, 'public', 'email-templates'));
                 console.log(`📁 [EMAIL_ACTION - ${BUILD_VERSION}] Email templates directory (${path.join(cwd, 'public', 'email-templates')}):\n   Template files:`, templatesDir.join(', '));
              }
            } catch (e: any) {
              console.log(`   ❌ Cannot read public/: ${e.message}`);
            }
            
            try {
              const srcDir = await fs.readdir(path.join(cwd, 'src'));
              console.log(`📁 [EMAIL_ACTION - ${BUILD_VERSION}] Src directory (${path.join(cwd, 'src')}):\n   Files/folders:`, srcDir.join(', '));
            } catch (e: any) {
              console.log(`   ❌ Cannot read src/: ${e.message}`);
            }

            try {
              const nextDir = await fs.readdir(path.join(cwd, '.next'));
              console.log(`📁 [EMAIL_ACTION - ${BUILD_VERSION}] .next directory (${path.join(cwd, '.next')}):\n   Files/folders:`, nextDir.join(', '));
            } catch(e: any) {
              console.log(`   ❌ Cannot read .next/: ${e.message}`);
            }


        } catch (dirError: any) {
            console.error(`❌ [EMAIL_ACTION - ${BUILD_VERSION}] Error reading directories for debugging:`, dirError.message);
        }
    }

    return null;
}

async function getTemplate(templateId: string) {
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
    console.log(`🔵 [EMAIL_ACTION] Template: ${templateId}, To: ${to}, From: ${fromEmail}, Subject: ${subject}`);
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
    
    console.log(`✅ [EMAIL_ACTION - ${BUILD_VERSION}] ✅ SUCCESS! Email sent via Resend. Email ID:`, data?.id);
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
    const settings = {};

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
