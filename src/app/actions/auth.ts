
'use server';

import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail } from './email';

const HARDCODED_TEST_EMAIL = 'ashok.jaiswal@gmail.com';

export async function sendSignUpVerificationCode({ email, name }: { email: string; name: string }) {
  console.log('🔵 [ACTION] Initiating verification code send for:', email);

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

  try {
    console.log('🔵 [ACTION] Sending verification email to hardcoded test email...');
    console.log(`🔵 [ACTION] User email: ${email}, Test email: ${HARDCODED_TEST_EMAIL}`);
    await sendVerificationCodeEmail({ to: HARDCODED_TEST_EMAIL, name, code });
    console.log('✅ [ACTION] Verification email sent successfully to test email.');
    
    // Return the code and expiry so the client can store it in Firestore
    return { success: true, message: 'Verification code sent.', code, expiresAt };
  } catch (error: any) {
    console.error('❌ [ACTION] CRITICAL FAILURE in sendSignUpVerificationCode:', error.message);
    console.error(error); 
    
    if (error.message.includes('API key')) {
        return { success: false, message: 'Email service is not configured on the server. Please contact support.' };
    }
    
    return { success: false, message: 'Could not send verification code. Please try again later.' };
  }
}
