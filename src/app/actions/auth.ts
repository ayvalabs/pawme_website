
'use server';

import { db } from '@/firebase/config';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail } from './email';

const BUILD_VERSION = 'v1.0.2-debug-paths';

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
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes
  console.log(`🔵 [ACTION] Generated code ${code} for ${email}. Expires at ${expiresAt.toDate().toLocaleTimeString()}.`);

  // Step 1: Store verification document in Firestore
  try {
    console.log('🔵 [ACTION] (1/2) Storing verification document in Firestore...');
    const verificationRef = doc(collection(db, 'verifications'));
    await setDoc(verificationRef, {
      email,
      code,
      expiresAt,
    });
    console.log('✅ [ACTION] (1/2) Verification document created successfully in Firestore.');
  } catch (error: any) {
    console.error('❌ [ACTION] FIRESTORE_ERROR: Failed to store verification code in Firestore.');
    console.error('Full Firestore error object:', error);
    if (error.code === 'permission-denied') {
        return { success: false, message: 'Server error: Permission denied when accessing the database. Please check Firestore rules.' };
    }
    return { success: false, message: 'Could not save verification details. Please try again later.' };
  }

  // Step 2: Send verification email
  try {
    console.log('🔵 [ACTION] (2/2) Sending verification email via Resend...');
    await sendVerificationCodeEmail({ to: email, name, code });
    console.log('✅ [ACTION] (2/2) Verification email sent successfully.');
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
