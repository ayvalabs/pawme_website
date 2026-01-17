
'use server';

import { db } from '@/firebase/config';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail } from './email';

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
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes
  console.log(`🔵 [ACTION] Generated code ${code} for ${email}. It expires at ${expiresAt.toDate().toLocaleTimeString()}.`);

  try {
    console.log('🔵 [ACTION] (1/2) Storing verification document in Firestore...');
    const verificationRef = doc(collection(db, 'verifications'));
    await setDoc(verificationRef, {
      email,
      code,
      expiresAt,
    });
    console.log('✅ [ACTION] (1/2) Verification document created successfully in Firestore.');

    console.log('🔵 [ACTION] (2/2) Sending verification email via Resend...');
    await sendVerificationCodeEmail({ to: email, name, code });
    console.log('✅ [ACTION] (2/2) Verification email sent successfully.');
    
    return { success: true, message: 'Verification code sent.' };
  } catch (error: any) {
    // This will now catch errors from both Firestore and the email service.
    console.error('❌ [ACTION] CRITICAL FAILURE in sendSignUpVerificationCode:', error.message);
    console.error(error); // Log the full error object
    
    // Provide a more specific message if it's our custom error.
    if (error.message.includes('API key')) {
        return { success: false, message: 'Email service is not configured on the server. Please contact support.' };
    }
    
    return { success: false, message: 'Could not send verification code. Please try again later.' };
  }
}
