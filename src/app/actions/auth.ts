
'use server';

import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail } from './email';

const HARDCODED_TEST_EMAIL = 'ashok.jaiswal@gmail.com';

export async function sendSignUpVerificationCode({ email, name }: { email: string; name: string }) {
  console.log(`🔵 [ACTION - ${BUILD_VERSION}] Initiating verification code send for:`, email);

  if (!name || !email) {
    console.error('❌ [ACTION] Name or email is missing.');
    return { success: false, message: 'Name and email are required.' };
  }
  console.log('✅ [ACTION] Name and email are present.');

  if (isDisposableEmail(email)) {
    console.error('❌ [ACTION] Disposable email detected:', email);
    return { success: false, message: "Disposable email addresses are not allowed." };
  }
  console.log('✅ [ACTION] Email is not from a disposable provider.');
  
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now in milliseconds
  console.log(`🔵 [ACTION] Generated code ${code} for ${email}. It expires at ${new Date(expiresAt).toLocaleTimeString()}.`);

  // Step 1: Store verification document in Firestore
  try {
    console.log('🔵 [ACTION] Sending verification email to hardcoded test email...');
    console.log(`🔵 [ACTION] User email: ${email}, Test email: ${HARDCODED_TEST_EMAIL}`);
    await sendVerificationCodeEmail({ to: HARDCODED_TEST_EMAIL, name, code });
    console.log('✅ [ACTION] Verification email sent successfully to test email.');
    
    // Return the code and expiry so the client can store it in Firestore
    return { success: true, message: 'Verification code sent.', code, expiresAt };
  } catch (error: any) {
    console.error(`❌ [ACTION - ${BUILD_VERSION}] EMAIL_ERROR: The operation to send the verification email failed.`);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Error type:`, typeof error);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Error name:`, error?.name);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Error message:`, error?.message);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Error code:`, error?.code);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Error stack:`, error?.stack);
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Full error object:`, JSON.stringify(error, null, 2));

    if (error.message && (error.message.includes('API key') || error.message.includes('RESEND_API_KEY'))) {
        console.error(`❌ [ACTION - ${BUILD_VERSION}] Detected missing API key error`);
        return { success: false, message: `Email service is not configured on the server. [v: ${BUILD_VERSION}]` };
    }

    if (error.message && (error.message.includes('domain is not verified') || error.message.includes('is not a verified sender'))) {
        console.error(`❌ [ACTION - ${BUILD_VERSION}] Detected domain verification error`);
        return { success: false, message: `Email sending failed: The sending domain is not verified. Please configure it in your email provider (Resend). [v: ${BUILD_VERSION}]`};
    }
    
    console.error(`❌ [ACTION - ${BUILD_VERSION}] Returning generic error message to client`);
    return { success: false, message: `Could not send verification code. [v: ${BUILD_VERSION}] Error: ${error?.message || 'Unknown error'}` };
  }
    
  return { success: true, message: 'Verification code sent.' };
}
