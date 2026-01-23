
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{emailTitle}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #7678EE 0%, #9D7FEE 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                🐾 PawMe
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your Pet's AI Companion
              </p>
            </td>
          </tr>`;

const footer = `          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8fc; padding: 30px; text-align: center; border-top: 1px solid #e8e8f0;">
              <p style="margin: 0 0 15px; color: #666666; font-size: 14px; line-height: 1.6;">
                Follow us for updates and behind-the-scenes content:
              </p>
              <div style="margin-bottom: 20px;">
                <a href="https://twitter.com/pawme" style="display: inline-block; margin: 0 8px; color: #7678EE; text-decoration: none; font-size: 14px;">Twitter</a>
                <span style="color: #cccccc;">•</span>
                <a href="https://instagram.com/pawme" style="display: inline-block; margin: 0 8px; color: #7678EE; text-decoration: none; font-size: 14px;">Instagram</a>
                <span style="color: #cccccc;">•</span>
                <a href="https://www.ayvalabs.com" style="display: inline-block; margin: 0 8px; color: #7678EE; text-decoration: none; font-size: 14px;">Website</a>
              </div>
              <p style="margin: 0 0 10px; color: #999999; font-size: 12px; line-height: 1.5;">
                © 2026 PawMe by AyvaLabs. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                <a href="{{unsubscribeLink}}" style="color: #7678EE; text-decoration: none;">Unsubscribe</a>
                <span style="margin: 0 8px; color: #cccccc;">•</span>
                <a href="https://www.ayvalabs.com/privacy" style="color: #7678EE; text-decoration: none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const defaultTemplates: { [key: string]: EmailTemplate } = {
  header: {
    id: 'header',
    name: 'Default Email Header',
    subject: '',
    variables: ['emailTitle'],
    html: header,
  },
  footer: {
    id: 'footer',
    name: 'Default Email Footer',
    subject: '',
    variables: ['unsubscribeLink'],
    html: footer,
  },
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
          <a href="{{appUrl}}/leaderboard" target="_blank" style="text-decoration: none; color: #333333;">
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
          <a href="{{appUrl}}/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Your Dashboard</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`,
    variables: ['userName', 'referralCode', 'referralLink', 'appUrl'],
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
          <a href="{{appUrl}}/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Check Your Progress</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`,
    variables: ['referrerName', 'newUserName', 'newReferralCount', 'newPoints', 'unlockedRewardsHtml', 'appUrl'],
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
    
    <p style="margin: 0 0 20px; color: #7678EE; font-size: 14px; line-height: 1.6; text-align: center; font-weight: 600;">
      📧 Can't find this email? Please check your spam or junk folder.
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
      We received a request to reset your password. Click the button below to securely reset your password on our website. This link is only valid for one hour.
    </p>
    
    <table role="presentation" style="width: 100%; text-align: center;">
      <tr>
        <td>
          <a href="{{link}}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Set New Password</a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 20px 0 0; color: #22c55e; font-size: 14px; line-height: 1.6; text-align: center; font-weight: 600;">
      🔒 This is a secure link from PawMe. Your email provider may show a security warning - you can safely proceed.
    </p>
    
    <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you didn't request a password reset, you can safely ignore this email. Your account is secure.
    </p>
  </td>
</tr>`,
    variables: ['userName', 'link'],
  },
  passwordResetCode: {
    id: 'passwordResetCode',
    name: 'Password Reset Code',
    subject: 'Your PawMe Password Reset Code',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hello,
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      We received a request to reset your PawMe password. Here is your 4-digit verification code:
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
    
    <p style="margin: 0 0 20px; color: #7678EE; font-size: 14px; line-height: 1.6; text-align: center; font-weight: 600;">
      📧 Can't find this email? Please check your spam or junk folder.
    </p>
    
    <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you didn't request a password reset, you can safely ignore this email. Your account is secure.
    </p>
  </td>
</tr>`,
    variables: ['code'],
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
  accountDeletion: {
    id: 'accountDeletion',
    name: 'Account Deletion Verification',
    subject: '⚠️ Confirm Your PawMe Account Deletion',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{userName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      We received a request to delete your PawMe account. If this was you, please use the verification code below to confirm the deletion.
    </p>
    
    <!-- Code Box -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background-color: #fee; border: 2px solid #dc2626; border-radius: 8px; padding: 30px; text-align: center;">
          <p style="margin: 0 0 15px; color: #dc2626; font-size: 18px; font-weight: 600;">⚠️ Account Deletion Code</p>
          <p style="margin: 0; color: #dc2626; font-size: 48px; font-weight: 700; letter-spacing: 12px; line-height: 1;">{{code}}</p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
      This code will expire in 10 minutes.
    </p>
    
    <p style="margin: 30px 0 20px; color: #dc2626; font-size: 14px; line-height: 1.6; font-weight: 600;">
      ⚠️ Warning: This action is permanent and cannot be undone.
    </p>
    
    <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
      Deleting your account will:
    </p>
    <ul style="margin: 0 0 30px; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
      <li>Remove all your personal data</li>
      <li>Delete your referral code and links</li>
      <li>Forfeit all earned points and rewards</li>
      <li>Remove you from the leaderboard</li>
    </ul>
    
    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you didn't request this deletion, please ignore this email and your account will remain active. Consider changing your password if you're concerned about account security.
    </p>
  </td>
</tr>`,
    variables: ['userName', 'code'],
  },
  vipDepositReceipt: {
    id: 'vipDepositReceipt',
    name: 'VIP Deposit Receipt',
    subject: '👑 Thank You for Your VIP Deposit!',
    html: `<!-- This is just the body content. The header and footer are added dynamically. -->
<tr>
  <td style="padding: 40px;">
    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
      Hi {{userName}},
    </p>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      Thank you for becoming a PawMe VIP founding member! 🎉 Your deposit has been successfully received.
    </p>
    
    <!-- Receipt Box -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background: linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(118, 120, 238, 0.1) 100%); border: 1px solid rgba(118, 120, 238, 0.2); border-radius: 8px; padding: 30px;">
          <h3 style="margin: 0 0 20px; color: #7678EE; font-size: 20px; font-weight: 700; text-align: center;">
            👑 VIP Membership Receipt
          </h3>
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #666666; font-size: 14px;">Deposit Amount:</p>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
                <p style="margin: 0; color: #333333; font-size: 16px; font-weight: 600;">{{amount}}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #666666; font-size: 14px;">Status:</p>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
                <p style="margin: 0; color: #22c55e; font-size: 14px; font-weight: 600;">✓ Confirmed</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <p style="margin: 0; color: #666666; font-size: 14px;">Refundable:</p>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600;">Yes, until Kickstarter launch</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Benefits Section -->
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="background-color: #f8f8fc; border-radius: 8px; padding: 25px;">
          <h3 style="margin: 0 0 20px; color: #333333; font-size: 18px; font-weight: 700;">Your VIP Benefits:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 2;">
            <li><strong style="color: #7678EE;">1.5x Points</strong> on all referrals, forever</li>
            <li><strong style="color: #7678EE;">Exclusive Discounts</strong> on our Kickstarter launch</li>
            <li><strong style="color: #7678EE;">Guaranteed Early Bird</strong> access to the best deals</li>
            <li><strong style="color: #7678EE;">Founding Member Badge</strong> on your profile</li>
          </ul>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      Start sharing your referral link now to maximize your points and climb the leaderboard!
    </p>
    
    <!-- CTA Button -->
    <table role="presentation" style="width: 100%; text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <a href="{{appUrl}}/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Your Dashboard</a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
      If you have any questions about your VIP membership or need to request a refund, please don't hesitate to contact us.
    </p>
  </td>
</tr>`,
    variables: ['userName', 'amount', 'appUrl'],
  },
};
