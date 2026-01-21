
'use server';

import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail, sendAccountDeletionCodeEmail } from './email';

export async function sendAccountDeletionCode({ email, name }: { email: string; name: string }) {
  console.log('🔵 [ACTION] Initiating account deletion code send for:', email);
  
  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    console.log('🔵 [ACTION] Generated deletion code', code, 'for', email, '. It expires at', new Date(expiresAt).toLocaleTimeString());
    
    await sendAccountDeletionCodeEmail({ to: email, name, code });
    
    console.log('✅ [ACTION] Account deletion code sent successfully.');
    return { success: true, code, expiresAt };
  } catch (error: any) {
    console.error('❌ [ACTION] Failed to send account deletion code:', error);
    return { success: false, message: `Could not send deletion code. Error: ${error?.message || 'Unknown error'}` };
  }
}

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

  // Step 1: Store verification document in Firestore
  try {
    console.log('🔵 [ACTION] Sending verification email to:', email);
    await sendVerificationCodeEmail({ to: email, name, code });
    console.log('✅ [ACTION] Verification email sent successfully.');
    
    // Return the code and expiry so the client can store it in Firestore
    return { success: true, message: 'Verification code sent.', code, expiresAt };
  } catch (error: any) {
    console.error('❌ [ACTION] EMAIL_ERROR: The operation to send the verification email failed.');
    console.error('❌ [ACTION] Error type:', typeof error);
    console.error('❌ [ACTION] Error name:', error?.name);
    console.error('❌ [ACTION] Error message:', error?.message);
    console.error('❌ [ACTION] Error code:', error?.code);
    console.error('❌ [ACTION] Error stack:', error?.stack);
    console.error('❌ [ACTION] Full error object:', JSON.stringify(error, null, 2));

    if (error.message && (error.message.includes('API key') || error.message.includes('RESEND_API_KEY'))) {
        console.error('❌ [ACTION] Detected missing API key error');
        return { success: false, message: 'Email service is not configured on the server.' };
    }

    if (error.message && (error.message.includes('domain is not verified') || error.message.includes('is not a verified sender'))) {
        console.error('❌ [ACTION] Detected domain verification error');
        return { success: false, message: 'Email sending failed: The sending domain is not verified. Please configure it in your email provider (Resend).'};
    }
    
    console.error('❌ [ACTION] Returning generic error message to client');
    return { success: false, message: `Could not send verification code. Error: ${error?.message || 'Unknown error'}` };
  }
    
  return { success: true, message: 'Verification code sent.' };
}
