
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

// Convert camelCase template ID to kebab-case filename
function templateIdToFilename(templateId: string): string {
  // Convert camelCase to kebab-case: verificationCode -> verification-code
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function getTemplateFromFile(templateId: string): Promise<{ subject: string, html: string } | null> {
    try {
        console.log(`🔵 [EMAIL_ACTION] ========== LOADING TEMPLATE: '${templateId}' ==========`);
        console.log(`🔵 [EMAIL_ACTION] Step 1: Looking up metadata for template ID: '${templateId}'`);
        const metadata = defaultTemplates[templateId];
        if (!metadata) {
            console.error(`❌ [EMAIL_ACTION] No metadata found for template '${templateId}'`);
            console.error(`❌ [EMAIL_ACTION] Available template IDs:`, Object.keys(defaultTemplates));
            return null;
        }
        console.log(`✅ [EMAIL_ACTION] Found metadata:`, { id: templateId, subject: metadata.subject, variables: metadata.variables });

        console.log(`🔵 [EMAIL_ACTION] Step 2: Converting template ID to filename...`);
        const filename = templateIdToFilename(templateId);
        console.log(`✅ [EMAIL_ACTION] Template ID '${templateId}' → filename '${filename}.html'`);
        
        console.log(`🔵 [EMAIL_ACTION] Step 3: Building file path...`);
        const cwd = process.cwd();
        console.log(`🔵 [EMAIL_ACTION] Current working directory: ${cwd}`);
        console.log(`🔵 [EMAIL_ACTION] __dirname would be:`, __dirname);
        console.log(`🔵 [EMAIL_ACTION] Environment: ${process.env.NODE_ENV}`);
        console.log(`🔵 [EMAIL_ACTION] Vercel: ${process.env.VERCEL ? 'YES' : 'NO'}`);
        
        // Try multiple possible paths (development vs production)
        // public/ folder is guaranteed to be included in Vercel builds
        const possiblePaths = [
            path.join(cwd, 'public', 'email-templates', `${filename}.html`),
            path.join(cwd, '.next', 'server', 'public', 'email-templates', `${filename}.html`),
            path.join(cwd, 'email-templates', `${filename}.html`),
        ];
        
        console.log(`🔵 [EMAIL_ACTION] Will try ${possiblePaths.length} possible paths...`);
        
        let filePath: string | null = null;
        let fileFound = false;
        
        // Check if file exists before trying to read
        console.log(`🔵 [EMAIL_ACTION] Step 4: Checking which path has the file...`);
        
        for (let i = 0; i < possiblePaths.length; i++) {
            const testPath = possiblePaths[i];
            console.log(`🔵 [EMAIL_ACTION] Trying path ${i + 1}/${possiblePaths.length}: ${testPath}`);
            try {
                await fs.access(testPath);
                console.log(`✅ [EMAIL_ACTION] Found file at path ${i + 1}!`);
                filePath = testPath;
                fileFound = true;
                break;
            } catch (accessError: any) {
                console.log(`❌ [EMAIL_ACTION] Not found at path ${i + 1}`);
            }
        }
        
        if (!fileFound || !filePath) {
            console.error(`❌ [EMAIL_ACTION] File NOT found in any of the ${possiblePaths.length} paths!`);
            console.error(`❌ [EMAIL_ACTION] Searched paths:`);
            possiblePaths.forEach((p, i) => console.error(`   ${i + 1}. ${p}`));
            
            // Try to list directory contents to help debug
            console.log(`🔵 [EMAIL_ACTION] Attempting to explore directory structure...`);
            
            // Check root directory
            try {
                console.log(`📁 [EMAIL_ACTION] Root directory (${cwd}):`);
                const rootFiles = await fs.readdir(cwd);
                console.log(`   Files/folders:`, rootFiles.slice(0, 30));
            } catch (e: any) {
                console.log(`   ❌ Cannot read root: ${e.message}`);
            }
            
            // Check public directory
            try {
                const publicPath = path.join(cwd, 'public');
                console.log(`📁 [EMAIL_ACTION] Public directory (${publicPath}):`);
                const publicFiles = await fs.readdir(publicPath);
                console.log(`   Files/folders:`, publicFiles);
                
                // Check if email-templates folder exists in public
                if (publicFiles.includes('email-templates')) {
                    const templatesPath = path.join(publicPath, 'email-templates');
                    console.log(`📁 [EMAIL_ACTION] Email templates directory (${templatesPath}):`);
                    const templateFiles = await fs.readdir(templatesPath);
                    console.log(`   Template files:`, templateFiles);
                } else {
                    console.log(`   ⚠️  'email-templates' folder NOT found in public/`);
                }
            } catch (e: any) {
                console.log(`   ❌ Cannot read public/: ${e.message}`);
            }
            
            // Check .next directory
            try {
                const nextPath = path.join(cwd, '.next');
                console.log(`📁 [EMAIL_ACTION] .next directory (${nextPath}):`);
                const nextFiles = await fs.readdir(nextPath);
                console.log(`   Files/folders:`, nextFiles.slice(0, 20));
            } catch (e: any) {
                console.log(`   ❌ Cannot read .next/: ${e.message}`);
            }
            
            throw new Error(`Template file not found: ${filename}.html`);
        }
        
        console.log(`✅ [EMAIL_ACTION] Using file path: ${filePath}`);
        
        console.log(`🔵 [EMAIL_ACTION] Step 5: Reading file contents...`);
        const html = await fs.readFile(filePath, 'utf-8');
        console.log(`✅ [EMAIL_ACTION] Successfully read file: ${html.length} characters`);
        console.log(`✅ [EMAIL_ACTION] ========== TEMPLATE LOADED SUCCESSFULLY ==========`);

        return { subject: metadata.subject, html };
    } catch (fileError: any) {
        console.error(`❌ [EMAIL_ACTION] ========== TEMPLATE LOADING FAILED ==========`);
        console.error(`❌ [EMAIL_ACTION] Template ID: '${templateId}'`);
        console.error(`❌ [EMAIL_ACTION] Error message:`, fileError.message);
        console.error(`❌ [EMAIL_ACTION] Error code:`, fileError.code);
        console.error(`❌ [EMAIL_ACTION] Error name:`, fileError.name);
        console.error(`❌ [EMAIL_ACTION] Stack trace:`, fileError.stack);
        console.error(`❌ [EMAIL_ACTION] Full error object:`, JSON.stringify(fileError, null, 2));
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

  console.log(`🔵 [EMAIL_ACTION] Step 1: Loading template '${templateId}'...`);
  const template = await getTemplate(templateId);
  const settings = {}; // No dynamic settings without Admin SDK

  if (!template) {
    console.error(`❌ [EMAIL_ACTION] FATAL: Email template "${templateId}" is missing.`);
    console.error(`❌ [EMAIL_ACTION] This means the file could not be loaded from public/email-assets/`);
    throw new Error(`Email template "${templateId}" is missing.`);
  }
  console.log(`✅ [EMAIL_ACTION] Step 1 complete: Template loaded successfully`);

  console.log(`🔵 [EMAIL_ACTION] Step 2: Processing template variables...`);
  console.log(`🔵 [EMAIL_ACTION] Variables provided:`, Object.keys(variables));
  
  let subject = template.subject;
  let bodyHtml = template.html;

  for (const key in variables) {
    const value = String(variables[key] ?? '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  }
  console.log(`✅ [EMAIL_ACTION] Step 2 complete: Variables replaced in subject and body`);
  
  console.log(`🔵 [EMAIL_ACTION] Step 3: Loading header and footer templates...`);
  const headerTemplate = await getTemplateFromFile('header');
  const footerTemplate = await getTemplateFromFile('footer');
  
  if (!headerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION] Header template not found, using empty header`);
  }
  if (!footerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION] Footer template not found, using empty header`);
  }
  
  const headerHtmlTemplate = headerTemplate?.html || '';
  const footerHtmlTemplate = footerTemplate?.html || '';
  console.log(`✅ [EMAIL_ACTION] Step 3 complete: Header (${headerHtmlTemplate.length} chars) and footer (${footerHtmlTemplate.length} chars) loaded`);
  
  console.log(`🔵 [EMAIL_ACTION] Step 4: Assembling final email HTML...`);
  let headerHtml = headerHtmlTemplate.replace(/{{emailTitle}}/g, subject);
  
  const appUrl = getAppUrl();
  console.log(`🔵 [EMAIL_ACTION] App URL: ${appUrl}`);
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`;
  let footerHtml = footerHtmlTemplate.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);

  const finalHtml = `${headerHtml}${bodyHtml}${footerHtml}`;
  console.log(`✅ [EMAIL_ACTION] Step 4 complete: Final HTML assembled (${finalHtml.length} total characters)`);
  
  try {
    console.log(`🔵 [EMAIL_ACTION] Step 5: Sending email via Resend API...`);
    console.log(`🔵 [EMAIL_ACTION] Template: ${templateId}`);
    console.log(`🔵 [EMAIL_ACTION] To: ${to}`);
    console.log(`🔵 [EMAIL_ACTION] From: ${fromEmail}`);
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
      console.error(`❌ [EMAIL_ACTION] This is a Resend API error, not a template loading error`);
      throw error;
    }
    
    console.log(`✅ [EMAIL_ACTION] ✅ SUCCESS! Email '${templateId}' sent via Resend. Email ID:`, data?.id);
    console.log(`✅ [EMAIL_ACTION] Step 5 complete: Email delivery initiated`);
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

    console.log(`🔵 [EMAIL_ACTION] Step 3: Loading header and footer templates...`);
  const headerTemplate = await getTemplateFromFile('header');
  const footerTemplate = await getTemplateFromFile('footer');
  
  if (!headerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION] Header template not found, using empty header`);
  }
  if (!footerTemplate) {
    console.warn(`⚠️ [EMAIL_ACTION] Footer template not found, using empty header`);
  }
  
  const headerHtmlTemplate = headerTemplate?.html || '';
  const footerHtmlTemplate = footerTemplate?.html || '';
  console.log(`✅ [EMAIL_ACTION] Step 3 complete: Header (${headerHtmlTemplate.length} chars) and footer (${footerHtmlTemplate.length} chars) loaded`);

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
