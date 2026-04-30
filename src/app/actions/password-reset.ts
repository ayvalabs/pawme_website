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
    // Firebase Admin's `generatePasswordResetLink(email, settings)` has been
    // throwing "INTERNAL ASSERT FAILED: Unable to create the email action
    // link" for some accounts even when the continueUrl domain is authorized.
    // The fallback: call without settings — Firebase generates a link to its
    // default-hosted handler. We then extract the oobCode and rewrite the URL
    // to point at our branded /reset-password page anyway.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ayvalabs.com';

    let firebaseResetLink: string;
    try {
      // First try with action code settings for the most direct branded flow.
      const actionCodeSettings = {
        url: `${baseUrl}/reset-password`,
        handleCodeInApp: false,
      };
      console.log('🔵 [ACTION] Generating reset link with settings:', actionCodeSettings);
      firebaseResetLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
    } catch (settingsErr: any) {
      console.warn(
        '⚠️ [ACTION] generatePasswordResetLink with settings failed, retrying without:',
        settingsErr?.message,
      );
      // Fallback: no settings. Firebase uses its default action URL but we
      // still extract the oobCode and build our own branded link below.
      firebaseResetLink = await adminAuth.generatePasswordResetLink(email);
    }
    console.log('✅ [ACTION] Password reset link generated successfully');

    // Extract the oobCode from Firebase's link and create our custom link
    const url = new URL(firebaseResetLink);
    const oobCode = url.searchParams.get('oobCode');
    
    if (!oobCode) {
      throw new Error('Failed to extract reset code from Firebase link');
    }

    // Create custom reset link pointing to our branded page
    const customResetLink = `${baseUrl}/reset-password?oobCode=${oobCode}&mode=resetPassword`;
    console.log('🔵 [ACTION] Custom reset link created:', customResetLink);

    // Send custom email with our custom reset link
    console.log('🔵 [ACTION] Sending custom password reset email');
    await sendCustomPasswordResetEmail({ email, resetLink: customResetLink });
    console.log('✅ [ACTION] Password reset email sent successfully');

    return { success: true, message: 'Password reset email sent.' };
  } catch (error: any) {
    // Verbose error logging — INTERNAL ASSERT FAILED hides the real cause
    // unless we also dump errorInfo. The Identity Toolkit error code lives
    // there (e.g. EMAIL_NOT_FOUND, INVALID_PROVIDER_ID, etc.).
    console.error('❌ [ACTION] Failed to generate password reset link:');
    console.error('  message:', error?.message);
    console.error('  code:', error?.code);
    console.error('  errorInfo:', JSON.stringify(error?.errorInfo, null, 2));
    console.error('  stack:', String(error?.stack || '').split('\n').slice(0, 4).join('\n'));

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
