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
    subject: 'Welcome to PawMe! 🐾',
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
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7678EE 0%, #9673D6 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">Welcome to PawMe! 🐾</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hi {{userName}},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Thank you for joining PawMe! We're thrilled to have you as part of our community of pet lovers who are excited about the future of pet care.
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        You've earned <strong style="color: #7678EE;">100 points</strong> just for signing up! Use these points to climb the leaderboard and unlock exclusive rewards.
                      </p>
                      
                      <!-- Referral Code Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #f8f8fc; border-radius: 8px; border: 2px dashed #7678EE;">
                        <tr>
                          <td style="padding: 20px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">Your Referral Code</p>
                            <p style="margin: 0; color: #7678EE; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{{referralCode}}</p>
                            <p style="margin: 10px 0 0; color: #666666; font-size: 14px;">Share this code and earn 100 points for each friend who joins!</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        <strong>What's Next?</strong>
                      </p>
                      
                      <ul style="margin: 0 0 20px; padding-left: 20px; color: #333333; font-size: 16px; line-height: 1.8;">
                        <li>Share your referral code with friends and family</li>
                        <li>Track your points on the leaderboard</li>
                        <li>Stay tuned for exclusive updates and early access</li>
                      </ul>
                      
                      <table role="presentation" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://pawme.com" style="display: inline-block; padding: 14px 32px; background-color: #7678EE; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Visit Your Dashboard</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Best regards,<br>
                        <strong>The PawMe Team</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f8fc; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                        © 2024 PawMe. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        You're receiving this email because you signed up for PawMe.
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
    variables: ['userName', 'referralCode'],
  },
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
