import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

export interface MobilePetContext {
  id: string;
  userId: string;
  name: string;
  breed: string;
  type: PetType;
  age: string;
  weight: string;
  gender: string;
  activityLevel?: string;
  careGoals?: string[];
}

export interface MobileCareContext {
  pet: MobilePetContext | null;
  observations: Array<Record<string, unknown>>;
  vaccinations: Array<Record<string, unknown>>;
  reminders: Array<Record<string, unknown>>;
  records: Array<Record<string, unknown>>;
}

export async function requireMobileUser(request: NextRequest): Promise<{ uid: string }> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    throw new Error('Missing Authorization bearer token');
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return { uid: decoded.uid };
}

export async function getOwnedPetContext(
  uid: string,
  petId: string,
): Promise<MobileCareContext> {
  const petSnap = await adminDb.collection('pets').doc(petId).get();
  if (!petSnap.exists) {
    throw new Error('Pet not found');
  }

  const petData = petSnap.data() as Record<string, unknown>;
  if (petData.userId !== uid) {
    throw new Error('Pet does not belong to authenticated user');
  }

  const [observationSnap, vaccinationSnap, reminderSnap, recordSnap] = await Promise.all([
    adminDb
      .collection('petObservations')
      .where('petId', '==', petId)
      .orderBy('createdAt', 'desc')
      .limit(6)
      .get(),
    adminDb
      .collection('petVaccinations')
      .where('petId', '==', petId)
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get(),
    adminDb
      .collection('petReminders')
      .where('petId', '==', petId)
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get(),
    adminDb
      .collection('petMedicalRecords')
      .where('petId', '==', petId)
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get(),
  ]);

  return {
    pet: {
      id: petId,
      userId: uid,
      name: String(petData.name || ''),
      breed: String(petData.breed || ''),
      type: (petData.type as PetType) || 'other',
      age: String(petData.age || ''),
      weight: String(petData.weight || ''),
      gender: String(petData.gender || ''),
      activityLevel: petData.activityLevel ? String(petData.activityLevel) : undefined,
      careGoals: Array.isArray(petData.careGoals)
        ? petData.careGoals.map((item) => String(item))
        : undefined,
    },
    observations: observationSnap.docs.map((doc) => doc.data()),
    vaccinations: vaccinationSnap.docs.map((doc) => doc.data()),
    reminders: reminderSnap.docs.map((doc) => doc.data()),
    records: recordSnap.docs.map((doc) => doc.data()),
  };
}

export function mergePetContext(
  firestoreContext: MobileCareContext,
  clientPetContext?: Record<string, unknown> | null,
) {
  return {
    ...firestoreContext.pet,
    ...(clientPetContext || {}),
  };
}
