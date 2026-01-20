
import welcomeHtml from './email-assets/welcome.html';
import referralSuccessHtml from './email-assets/referral-success.html';
import verificationCodeHtml from './email-assets/verification-code.html';
import passwordResetHtml from './email-assets/password-reset.html';
import shippingNotificationHtml from './email-assets/shipping-notification.html';
import productUpdateHtml from './email-assets/product-update.html';

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
    html: welcomeHtml,
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  referralSuccess: {
    id: 'referralSuccess',
    name: 'Referral Success',
    subject: "🎉 You've earned points! Someone joined using your referral link",
    html: referralSuccessHtml,
    variables: ['referrerName', 'newUserName', 'newReferralCount', 'newPoints', 'unlockedRewardsHtml'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    html: verificationCodeHtml,
    variables: ['userName', 'code'],
  },
  passwordReset: {
    id: 'passwordReset',
    name: 'Password Reset',
    subject: 'Reset Your PawMe Password',
    html: passwordResetHtml,
    variables: ['userName', 'link'],
  },
  shippingNotification: {
    id: 'shippingNotification',
    name: 'Reward Shipped',
    subject: '🎁 Your PawMe Reward has Shipped!',
    html: shippingNotificationHtml,
    variables: ['userName', 'rewardTitle', 'trackingCode'],
  },
  productUpdate: {
    id: 'productUpdate',
    name: 'Product Update',
    subject: '🚀 An Update from PawMe!',
    html: productUpdateHtml,
    variables: ['userName', 'customBody'],
  },
};
