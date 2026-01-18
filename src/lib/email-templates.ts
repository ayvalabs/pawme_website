
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string; // This can be an empty string, as we will load from files.
  variables: string[];
}

export const defaultTemplates: Record<string, Omit<EmailTemplate, 'html'>> = {
  header: {
    id: 'header',
    name: 'Default Email Header',
    subject: '', // Not used for header
    variables: ['emailTitle'],
  },
  footer: {
    id: 'footer',
    name: 'Default Email Footer',
    subject: '', // Not used for footer
    variables: ['unsubscribeLink'],
  },
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: '🐾 Welcome to PawMe! Your referral link is ready',
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  referralSuccess: {
    id: 'referralSuccess',
    name: 'Referral Success',
    subject: "🎉 You've earned points! Someone joined using your referral link",
    variables: ['referrerName', 'newReferralCount', 'newPoints'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    variables: ['userName', 'code'],
  },
  passwordReset: {
    id: 'passwordReset',
    name: 'Password Reset',
    subject: 'Reset Your PawMe Password',
    variables: ['userName', 'link'],
  },
  shippingNotification: {
    id: 'shippingNotification',
    name: 'Reward Shipped',
    subject: '🎁 Your PawMe Reward has Shipped!',
    variables: ['userName', 'rewardTitle', 'trackingCode'],
  },
  productUpdate: {
    id: 'productUpdate',
    name: 'Product Update',
    subject: '🚀 An Update from PawMe!',
    variables: ['userName'],
  },
};
