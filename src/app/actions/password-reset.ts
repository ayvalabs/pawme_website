'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { sendCustomPasswordResetEmail } from './email';

export async function generatePasswordResetLink({ email }: { email: string }) {
  console.log('🔵 [ACTION] Generating password reset link for:', email);

  if (!email) {
    console.error('❌ [ACTION] Email is missing.');
    return { success: false, message: 'Email is required.' };
  }

  try {
    // Generate password reset link using Firebase Admin SDK
    // Use custom Firebase Hosting domain to avoid "suspicious link" warnings
    const actionCodeSettings = {
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://pawme.ayvalabs.com',
      handleCodeInApp: false,
    };

    console.log('🔵 [ACTION] Generating reset link with settings:', actionCodeSettings);
    const resetLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
    console.log('✅ [ACTION] Password reset link generated successfully');

    // Send custom email with the reset link
    console.log('🔵 [ACTION] Sending custom password reset email');
    await sendCustomPasswordResetEmail({ email, resetLink });
    console.log('✅ [ACTION] Password reset email sent successfully');

    return { success: true, message: 'Password reset email sent.' };
  } catch (error: any) {
    console.error('❌ [ACTION] Failed to generate password reset link:', error);
    
    if (error.code === 'auth/user-not-found') {
      // Return success even if user not found (security best practice)
      console.log('🔵 [ACTION] User not found, but returning success for security');
      return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    if (error.message && error.message.includes('credential')) {
      return { success: false, message: 'Server configuration error. Please contact support.' };
    }

    return { success: false, message: `Could not send password reset email. Error: ${error?.message || 'Unknown error'}` };
  }
}
