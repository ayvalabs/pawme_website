import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

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
    adminDb.collection('petObservations').where('petId', '==', petId).get(),
    adminDb.collection('petVaccinations').where('petId', '==', petId).get(),
    adminDb.collection('petReminders').where('petId', '==', petId).get(),
    adminDb.collection('petMedicalRecords').where('petId', '==', petId).get(),
  ]);

  const sortDocsByCreatedAtDesc = (
    docs: QueryDocumentSnapshot[],
    limitCount: number,
  ): Array<Record<string, unknown>> => {
    return docs
      .map((doc) => doc.data() as Record<string, unknown>)
      .sort((a, b) => {
        const getMillis = (value: unknown) => {
          if (!value) return 0;
          if (typeof value === 'string') {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : parsed;
          }
          if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
            return ((value as { toMillis: () => number }).toMillis());
          }
          if (typeof value === 'object' && value !== null && '_seconds' in value) {
            return Number((value as { _seconds?: number })._seconds || 0) * 1000;
          }
          return 0;
        };

        return getMillis(b.createdAt) - getMillis(a.createdAt);
      })
      .slice(0, limitCount);
  };

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
    observations: sortDocsByCreatedAtDesc(observationSnap.docs, 6),
    vaccinations: sortDocsByCreatedAtDesc(vaccinationSnap.docs, 12),
    reminders: sortDocsByCreatedAtDesc(reminderSnap.docs, 12),
    records: sortDocsByCreatedAtDesc(recordSnap.docs, 8),
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
