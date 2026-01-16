
'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.NODE_ENV === 'production' 
  ? 'PawMe <pawme@ayvalabs.com>' 
  : 'PawMe <onboarding@resend.dev>';

function getVipBannerHtml(totalUsers: number) {
  const vipLimit = 250;
  const spotsLeft = Math.max(0, vipLimit - totalUsers);
  return `
    <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #fffaf0; border: 2px dashed #F59E0B; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <h3 style="margin: 0 0 10px; color: #D97706; font-size: 20px;">👑 Join the VIP List!</h3>
          <p style="margin: 0 0 15px; color: #333; font-size: 16px;">
            Become a founding member and get <strong style="color: #7678EE;">1.5x points</strong> for every referral!
          </p>
          <a href="https://pawme.com/leaderboard" style="display: inline-block; padding: 10px 20px; background-color: #F59E0B; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Claim Your Spot
          </a>
          <p style="margin: 15px 0 0; background-color: #7678EE; color: #ffffff; display: inline-block; padding: 5px 15px; border-radius: 9999px; font-weight: bold;">
            Only ${spotsLeft} spots left!
          </p>
        </td>
      </tr>
    </table>
  `;
}

function getWelcomeEmailHtml(name: string, referralLink: string, referralCode: string, totalUsers: number | null) {
  const brandColor = '#7678EE';
  const vipBanner = totalUsers !== null && totalUsers < 250 ? getVipBannerHtml(totalUsers) : '';
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: ${brandColor};">🐾 Welcome to PawMe, ${name}!</h2>
      <p>We're thrilled to have you on the waitlist. You're one step closer to giving your pet the ultimate AI companion.</p>
      
      ${vipBanner}

      <h3>Your Unique Referral Link</h3>
      <p>Share this link with friends and family to earn points and climb the leaderboard:</p>
      <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed ${brandColor};">
        <a href="${referralLink}" style="color: ${brandColor}; font-weight: bold; text-decoration: none;">${referralLink}</a>
      </p>
      <p>Your personal code is: <strong style="color: ${brandColor};">${referralCode}</strong></p>
      <h3>Earn Rewards</h3>
      <ul>
        <li><strong>100 points</strong> per successful referral</li>
        <li>Exclusive <strong>early bird perks</strong></li>
        <li>Move up the leaderboard for <strong>top prizes</strong></li>
      </ul>
      <p>PawMe launches on Kickstarter in <strong>March 2026</strong>!</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team @ Ayva Labs Limited</strong></p>
      <p style="font-size: 0.8em; color: #777;">Follow us @pawme on all social media.</p>
    </div>
  `;
}

export async function sendWelcomeEmail({ to, name, referralCode, totalUsers }: { to: string, name: string, referralCode: string, totalUsers: number | null }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';
  const referralLink = `${appUrl}/?ref=${referralCode}`;
  const subject = '🐾 Welcome to PawMe! Your referral link is ready';
  const html = getWelcomeEmailHtml(name, referralLink, referralCode, totalUsers);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

function getReferralSuccessEmailHtml(referrerName: string, newReferralCount: number, newPoints: number) {
  const brandColor = '#7678EE';
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: ${brandColor};">🎉 You've earned points, ${referrerName}!</h2>
      <p>Great news! Someone just signed up using your referral link.</p>
      <h3>Your Stats:</h3>
      <ul>
        <li><strong>Total Referrals:</strong> ${newReferralCount}</li>
        <li><strong>Points Earned:</strong> ${newPoints}</li>
      </ul>
      <p>Keep sharing to unlock more rewards!</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team</strong></p>
      <p style="font-size: 0.8em; color: #777;">Follow us @pawme on all social media.</p>
    </div>
  `;
}

export async function sendReferralSuccessEmail({ to, referrerName, newReferralCount, newPoints }: { to: string, referrerName: string, newReferralCount: number, newPoints: number }) {
  const subject = "🎉 You've earned points! Someone joined using your referral link";
  const html = getReferralSuccessEmailHtml(referrerName, newReferralCount, newPoints);
  
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to send referral success email:', error);
  }
}

export async function sendAdminBroadcast(users: {email: string, name: string}[], subject: string, bodyTemplate: string) {
    for (const user of users) {
        const body = bodyTemplate.replace(/{{userName}}/g, user.name);
        try {
            await resend.emails.send({
                from: fromEmail,
                to: user.email,
                subject,
                html: body,
            });
        } catch (error) {
            console.error(`Failed to send broadcast to ${user.email}:`, error);
        }
    }
}

export async function sendShippingNotificationEmail({ to, userName, rewardTitle, trackingCode }: { to: string, userName: string, rewardTitle: string, trackingCode: string }) {
    const subject = `🎁 Your PawMe Reward has Shipped!`;
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: #7678EE;">🚀 It's on its way, ${userName}!</h2>
      <p>Great news! Your reward, <strong>${rewardTitle}</strong>, has been shipped.</p>
      <p>You can track your package using the following tracking code:</p>
      <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed #7678EE; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px;">
        ${trackingCode}
      </p>
      <p>Thank you for being an essential part of the PawMe community. We appreciate your support!</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team</strong></p>
    </div>
    `;

    try {
        await resend.emails.send({
            from: fromEmail,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error(`Failed to send shipping notification to ${to}:`, error);
        throw error;
    }
}
