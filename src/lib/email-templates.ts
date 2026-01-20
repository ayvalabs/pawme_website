
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

export const defaultTemplates: Record<string, EmailTemplate> = {
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: '🐾 Welcome to PawMe! Your referral link is ready',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{userName}},
    </p>
    
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Thank you for joining the waitlist! We're thrilled to have you in our community of pet lovers who are excited about the future of pet care.
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      You've earned <strong style="color: #7678EE;">100 points</strong> just for signing up! Start sharing your unique referral link to earn more points and climb the leaderboard.
    </p>
    
    <!-- Referral Link Box -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background-color: #f8f8fc; border-radius: 8px; padding: 25px; text-align: center;">
          <p style="margin: 0 0 15px; color: #666666; font-size: 14px;">Your Unique Referral Link</p>
          <a href="{{referralLink}}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #ffffff; border: 1px solid #e5e5e5; color: #7678EE; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">{{referralLink}}</a>
          <p style="margin: 15px 0 0; color: #666666; font-size: 14px;">Or share your code: <strong style="color: #333;">{{referralCode}}</strong></p>
        </td>
      </tr>
    </table>

    <!-- VIP Banner -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background: linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(118, 120, 238, 0.1) 50%, rgba(250, 204, 21, 0.1) 100%); border: 1px solid rgba(118, 120, 238, 0.2); border-radius: 8px; text-align: center; padding: 25px;">
          <a href="https://pawme.com/leaderboard" target="_blank" style="text-decoration: none; color: #333333;">
            <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: bold; color: #7678EE;">👑 Join the VIP List! 👑</h2>
            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4A5568;">
              Become a founding member, get exclusive early bird pricing, and earn <strong style="color: #7678EE;">1.5x points</strong> for every referral!
            </p>
            <div style="display: inline-block; padding: 10px 20px; background-color: #7678EE; color: #ffffff; border-radius: 9999px; font-size: 16px; font-weight: 600;">
              ✨ Limited spots available - Join Now!
            </div>
          </a>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table role="presentation" style="width: 100%; text-align: center;">
      <tr>
        <td>
          <a href="https://pawme.com/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Your Dashboard</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`,
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  referralSuccess: {
    id: 'referralSuccess',
    name: 'Referral Success',
    subject: "🎉 You've earned points! Someone joined using your referral link",
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{referrerName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      Fantastic news! Your friend, <strong>{{newUserName}}</strong>, just joined the PawMe family using your referral link. You've earned points for the referral!
    </p>
    
    <!-- Stats Box -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background-color: #f8f8fc; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Your New Stats</p>
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="width: 50%; text-align: center; padding: 10px; border-right: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #666666; font-size: 14px;">Total Referrals</p>
                <p style="margin: 5px 0 0; color: #7678EE; font-size: 28px; font-weight: 700;">{{newReferralCount}}</p>
              </td>
              <td style="width: 50%; text-align: center; padding: 10px;">
                <p style="margin: 0; color: #666666; font-size: 14px;">Total Points</p>
                <p style="margin: 5px 0 0; color: #7678EE; font-size: 28px; font-weight: 700;">{{newPoints}}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Unlocked Goodies -->
    {{unlockedRewardsHtml}}
    
    <p style="margin: 20px 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Keep sharing to climb the leaderboard and unlock even more amazing rewards for you and your pet!
    </p>
    
    <!-- CTA Button -->
    <table role="presentation" style="width: 100%; text-align: center; margin-top: 10px;">
      <tr>
        <td>
          <a href="https://pawme.com/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Check Your Progress</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`,
    variables: ['referrerName', 'newUserName', 'newReferralCount', 'newPoints', 'unlockedRewardsHtml'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{userName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      Here is your 4-digit verification code to complete your PawMe signup.
    </p>
    
    <!-- Code Box -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background-color: #f8f8fc; border-radius: 8px; padding: 30px; text-align: center;">
          <p style="margin: 0; color: #7678EE; font-size: 48px; font-weight: 700; letter-spacing: 12px; line-height: 1;">{{code}}</p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
      This code will expire in 10 minutes.
    </p>
    
    <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </td>
</tr>`,
    variables: ['userName', 'code'],
  },
  passwordReset: {
    id: 'passwordReset',
    name: 'Password Reset',
    subject: 'Reset Your PawMe Password',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hello {{userName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new one. This link is only valid for one hour.
    </p>
    
    <table role="presentation" style="width: 100%; text-align: center;">
      <tr>
        <td>
          <a href="{{link}}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Set New Password</a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you didn't request a password reset, you can safely ignore this email. Your account is secure.
    </p>
  </td>
</tr>`,
    variables: ['userName', 'link'],
  },
  shippingNotification: {
    id: 'shippingNotification',
    name: 'Reward Shipped',
    subject: '🎁 Your PawMe Reward has Shipped!',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <h2 style="color: #7678EE;">🚀 It's on its way, {{userName}}!</h2>
    <p>Great news! Your reward, <strong>{{rewardTitle}}</strong>, has been shipped.</p>
    <p>You can track your package using the following tracking code:</p>
    <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed #7678EE; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px;">
      {{trackingCode}}
    </p>
    <p>Thank you for being an essential part of the PawMe community. We appreciate your support!</p>
  </td>
</tr>`,
    variables: ['userName', 'rewardTitle', 'trackingCode'],
  },
  productUpdate: {
    id: 'productUpdate',
    name: 'Product Update',
    subject: '🚀 An Update from PawMe!',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{userName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      {{customBody}}
    </p>
    
    <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
      Stay tuned for more news!
    </p>
  </td>
</tr>`,
    variables: ['userName', 'customBody'],
  },
};
