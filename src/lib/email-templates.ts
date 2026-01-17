
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
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to PawMe</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #7678EE 0%, #9673D6 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">🐾 Welcome to PawMe!</h1>
                </td>
              </tr>
              
              <!-- Content -->
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
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f8fc; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                    &copy; 2026 PawMe by Ayva Labs Limited.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Follow us @pawme on all social media
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  referralSuccess: {
    id: 'referralSuccess',
    name: 'Referral Success',
    subject: "🎉 You've earned points! Someone joined using your referral link",
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You've Earned Points!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #7678EE 0%, #9673D6 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">🎉 You've Earned Points!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi {{referrerName}},
                  </p>
                  
                  <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                    Great news! Someone just signed up using your referral link. Keep up the great work!
                  </p>
                  
                  <!-- Stats Box -->
                  <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                    <tr>
                      <td style="background-color: #f8f8fc; border-radius: 8px; padding: 20px; text-align: center;">
                        <p style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Your Referral Stats</p>
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
                  
                  <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                    Keep sharing to unlock even more rewards.
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" style="width: 100%; text-align: center; margin-top: 10px;">
                    <tr>
                      <td>
                        <a href="https://pawme.com/leaderboard" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Leaderboard</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f8fc; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                    &copy; 2026 PawMe by Ayva Labs Limited.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Follow us @pawme on all social media
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    variables: ['referrerName', 'newReferralCount', 'newPoints'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your PawMe Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #7678EE 0%, #9673D6 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">Verify Your Email</h1>
                </td>
              </tr>
              
              <!-- Content -->
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
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f8fc; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                    &copy; 2026 PawMe by Ayva Labs Limited.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Follow us @pawme on all social media
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    variables: ['userName', 'code'],
  },
  shippingNotification: {
    id: 'shippingNotification',
    name: 'Reward Shipped',
    subject: '🎁 Your PawMe Reward has Shipped!',
    html: `
    <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #ffffff; border-radius: 8px;">
          <h2 style="color: #7678EE;">🚀 It's on its way, {{userName}}!</h2>
          <p>Great news! Your reward, <strong>{{rewardTitle}}</strong>, has been shipped.</p>
          <p>You can track your package using the following tracking code:</p>
          <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed #7678EE; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px;">
            {{trackingCode}}
          </p>
          <p>Thank you for being an essential part of the PawMe community. We appreciate your support!</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>The PawMe Team</strong></p>
        </div>
      </body>
      </html>
    `,
    variables: ['userName', 'rewardTitle', 'trackingCode'],
  }
};

export function renderTemplate(templateId: string, variables: Record<string, string>): { subject: string; html: string } {
  const template = defaultTemplates[templateId];
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  let html = template.html;
  let subject = template.subject;

  // Replace variables in both subject and HTML
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
    subject = subject.replace(regex, value);
  });

  return { subject, html };
}
