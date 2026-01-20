
'use server';

import { Resend } from 'resend';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import { defaultTemplates } from '@/lib/email-templates';
import type { AppSettings } from '@/app/actions/settings';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'PawMe <pawme@ayvalabs.com>';
const adminDb = getAdminFirestore();

async function getTemplate(templateId: string) {
  // Templates are now loaded from the local file, not Firestore.
  const template = defaultTemplates[templateId];
  if (template) {
    return { subject: template.subject, html: template.html };
  }

  console.warn(`Local email template '${templateId}' not found. No fallback available.`);
  return null;
}

async function renderAndSend(templateId: string, to: string, variables: Record<string, any>) {
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set. Email '${templateId}' to '${to}' cannot be sent.`);
    throw new Error('Server is missing API key for email service.');
  }

  const [template, settingsSnap] = await Promise.all([
    getTemplate(templateId),
    getDoc(doc(adminDb, 'app-settings', 'rewards'))
  ]);

  if (!template) {
    console.error(`❌ [EMAIL_ACTION] Email template "${templateId}" is missing.`);
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
  
  const appSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : {};
  let headerHtml = (appSettings.emailHeader || '').replace(/{{emailTitle}}/g, subject);
  let footerHtml = (appSettings.emailFooter || '');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`;
  footerHtml = footerHtml.replace(/{{unsubscribeLink}}/g, unsubscribeUrl);

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
    throw new Error(`Failed to send email '${templateId}' due to a server error.`);
  }
}

export async function sendWelcomeEmail({ to, name, referralCode }: { to: string, name: string, referralCode: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  await renderAndSend('welcome', to, { userName: name, referralCode, referralLink, emailTitle: "Welcome to PawMe!" });
}

export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  await renderAndSend('verificationCode', to, { userName: name, code, emailTitle: "Verify Your Email" });
}

export async function sendReferralSuccessEmail({ to, referrerName, newUserName, oldPoints, newPoints, newReferralCount }: { to: string, referrerName: string, newUserName: string, oldPoints: number, newPoints: number, newReferralCount: number }) {
  
  const settingsSnap = await getDoc(doc(adminDb, 'app-settings', 'rewards'));
  const rewardTiers = settingsSnap.exists() ? (settingsSnap.data() as AppSettings).rewardTiers || [] : [];
  
  const unlockedRewards = rewardTiers.filter(
    tier => oldPoints < tier.requiredPoints && newPoints >= tier.requiredPoints
  );

  let unlockedRewardsHtml = '';
  if (unlockedRewards.length > 0) {
    unlockedRewardsHtml = `
      <table role="presentation" style="width: 100%; margin-bottom: 30px;">
        <tr>
          <td style="background-color: #e8eaf6; border-radius: 8px; padding: 25px; text-align: center;">
            <p style="margin: 0 0 15px; color: #333; font-size: 18px; font-weight: 600;">🎉 You've Unlocked New Rewards! 🎉</p>
            <ul style="list-style: none; padding: 0; margin: 0; text-align: left;">
              ${unlockedRewards.map(reward => `
                <li style="margin-bottom: 10px; font-size: 16px; color: #4A5568;">
                  <span style="font-weight: bold; color: #7678EE;">${reward.title}</span> - Unlocked at ${reward.requiredPoints} points.
                </li>
              `).join('')}
            </ul>
          </td>
        </tr>
      </table>
    `;
  }
  
  await renderAndSend('referralSuccess', to, { 
    referrerName, 
    newUserName, 
    newReferralCount, 
    newPoints: newPoints.toLocaleString(),
    unlockedRewardsHtml,
    emailTitle: "You've Earned Points!"
  });
}

export async function sendCustomPasswordResetEmail({ email }: { email: string }) {
  const adminAuth = getAdminAuth();
  const user = await adminAuth.getUserByEmail(email);
  const link = await adminAuth.generatePasswordResetLink(email);
  
  await renderAndSend('passwordReset', email, { 
    userName: user.displayName || user.email,
    link,
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

// Helper to get Admin Auth without exposing it to the client bundle
async function getAdminAuth() {
  const admin = await import('@/lib/firebase-admin');
  return admin.getAdminAuth();
}
