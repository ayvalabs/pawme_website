'use server';

import { adminDb } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAIL = 'pawme+admin@ayvalabs.com';

/**
 * Check if an email is an admin.
 * The super admin (pawme+admin@ayvalabs.com) is always an admin even if not in Firestore.
 */
export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();

  // Super admin is always allowed
  if (normalizedEmail === SUPER_ADMIN_EMAIL) return true;

  try {
    const doc = await adminDb.collection('admins').doc(normalizedEmail).get();
    return doc.exists && doc.data()?.active !== false;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
}

/**
 * Get all admin emails.
 */
export async function getAdmins(): Promise<{ email: string; addedAt: string; addedBy: string }[]> {
  try {
    const snapshot = await adminDb.collection('admins').where('active', '!=', false).get();
    const admins = snapshot.docs.map((doc) => ({
      email: doc.id,
      addedAt: doc.data()?.addedAt?.toDate?.()?.toISOString?.() || doc.data()?.addedAt || '',
      addedBy: doc.data()?.addedBy || '',
    }));

    // Always include super admin
    if (!admins.find((a) => a.email === SUPER_ADMIN_EMAIL)) {
      admins.unshift({ email: SUPER_ADMIN_EMAIL, addedAt: '', addedBy: 'system' });
    }

    return admins;
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    return [{ email: SUPER_ADMIN_EMAIL, addedAt: '', addedBy: 'system' }];
  }
}

/**
 * Add a new admin by email. Only existing admins can add new admins.
 */
export async function addAdmin(
  requesterEmail: string,
  newAdminEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!requesterEmail || !newAdminEmail) {
    return { success: false, error: 'Missing email' };
  }

  const normalizedRequester = requesterEmail.toLowerCase().trim();
  const normalizedNew = newAdminEmail.toLowerCase().trim();

  // Verify requester is an admin
  const requesterIsAdmin = await isAdmin(normalizedRequester);
  if (!requesterIsAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if already an admin
  const alreadyAdmin = await isAdmin(normalizedNew);
  if (alreadyAdmin) {
    return { success: false, error: 'This email is already an admin' };
  }

  try {
    await adminDb.collection('admins').doc(normalizedNew).set({
      email: normalizedNew,
      active: true,
      addedAt: new Date(),
      addedBy: normalizedRequester,
    });
    console.log(`✅ Admin added: ${normalizedNew} by ${normalizedRequester}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error adding admin:', error);
    return { success: false, error: error.message || 'Failed to add admin' };
  }
}

/**
 * Remove an admin by email. Only existing admins can remove admins.
 * The super admin cannot be removed.
 */
export async function removeAdmin(
  requesterEmail: string,
  targetEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!requesterEmail || !targetEmail) {
    return { success: false, error: 'Missing email' };
  }

  const normalizedRequester = requesterEmail.toLowerCase().trim();
  const normalizedTarget = targetEmail.toLowerCase().trim();

  // Cannot remove super admin
  if (normalizedTarget === SUPER_ADMIN_EMAIL) {
    return { success: false, error: 'Cannot remove the super admin' };
  }

  // Verify requester is an admin
  const requesterIsAdmin = await isAdmin(normalizedRequester);
  if (!requesterIsAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await adminDb.collection('admins').doc(normalizedTarget).delete();
    console.log(`✅ Admin removed: ${normalizedTarget} by ${normalizedRequester}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error removing admin:', error);
    return { success: false, error: error.message || 'Failed to remove admin' };
  }
}
