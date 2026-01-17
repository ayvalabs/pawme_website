
'use server';

import { db } from '@/firebase/config';
import { collection, query, where, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';
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

  // This check is removed as it causes a permission error for unauthenticated users.
  // The check for an existing email will be handled by Firebase Auth during user creation.
  
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes
  console.log(`🔵 [ACTION] Generated code ${code} for ${email}. It expires at ${expiresAt.toDate().toLocaleTimeString()}.`);

  try {
    console.log('🔵 [ACTION] Attempting to create verification document in Firestore...');
    const verificationRef = doc(collection(db, 'verifications'));
    await setDoc(verificationRef, {
      email,
      code,
      expiresAt,
    });
    console.log('✅ [ACTION] Verification document created successfully in Firestore.');

    console.log('🔵 [ACTION] Attempting to send verification email...');
    await sendVerificationCodeEmail({ to: email, name, code });
    console.log('✅ [ACTION] Verification email sent successfully.');
    
    return { success: true, message: 'Verification code sent.' };
  } catch (error) {
    console.error('❌ [ACTION] Error in sendSignUpVerificationCode:', error);
    return { success: false, message: 'Could not send verification code. Please try again.' };
  }
}
