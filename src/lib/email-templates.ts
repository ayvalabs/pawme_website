
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
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: #7678EE;">🐾 Welcome to PawMe, {{userName}}!</h2>
      <p>We're thrilled to have you on the waitlist. You're one step closer to giving your pet the ultimate AI companion.</p>
      
      <h3>Your Unique Referral Link</h3>
      <p>Share this link with friends and family to earn points and climb the leaderboard:</p>
      <p style="background-color: #f0f2fe; padding: 12px; border-radius: 5px; border: 1px dashed #7678EE;">
        <a href="{{referralLink}}" style="color: #7678EE; font-weight: bold; text-decoration: none;">{{referralLink}}</a>
      </p>
      <p>Your personal code is: <strong style="color: #7678EE;">{{referralCode}}</strong></p>
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
    `,
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: #7678EE;">Hi {{userName}}, please verify your email</h2>
      <p>Here is your 4-digit verification code to complete your signup for PawMe:</p>
      <p style="background-color: #f0f2fe; padding: 20px; border-radius: 5px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 2rem 0;">
        {{code}}
      </p>
      <p>This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team</strong></p>
    </div>
    `,
    variables: ['userName', 'code'],
  },
  productUpdate: {
    id: 'productUpdate',
    name: 'Product Update',
    subject: '🚀 An Update from PawMe!',
    html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
      <h2 style="color: #7678EE;">Hi {{userName}}, we have an update!</h2>
      <p>Here's what's new with PawMe...</p>
      
      <!-- Admin can add more content here -->
      
      <br/>
      <p>Best regards,</p>
      <p><strong>The PawMe Team</strong></p>
    </div>
    `,
    variables: ['userName'],
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
