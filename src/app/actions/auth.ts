
'use server';

import { db } from '@/firebase/config';
import { collection, query, where, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';
import { isDisposableEmail } from '@/lib/disposable-domains';
import { sendVerificationCodeEmail } from './email';

export async function sendSignUpVerificationCode({ email, name }: { email: string; name: string }) {
  if (!name || !email) {
    return { success: false, message: 'Name and email are required.' };
  }
  
  if (isDisposableEmail(email)) {
    return { success: false, message: "Disposable email addresses are not allowed." };
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return { success: false, message: "An account with this email already exists." };
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    const verificationRef = doc(collection(db, 'verifications'));
    await setDoc(verificationRef, {
      email,
      code,
      expiresAt,
    });

    await sendVerificationCodeEmail({ to: email, name, code });
    
    return { success: true, message: 'Verification code sent.' };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return { success: false, message: 'Could not send verification code. Please try again.' };
  }
}
