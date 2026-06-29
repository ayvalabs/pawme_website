import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import FoundForm from './FoundForm';

/**
 * /found/[petId] — public page rendered when someone scans a PawMe QR collar
 * tag on a lost pet. Shows the pet's photo + name + "I found this pet" form.
 *
 * Does NOT expose owner contact info — the form posts to the relay endpoint
 * which notifies the owner directly via push + email. The owner reaches out
 * if/when they want to.
 */

export const runtime = 'nodejs';
export const revalidate = 60; // cache pet basics 1 min — most lookups are immediate-after-scan

interface PetBasics {
  name: string;
  breed: string | null;
  species: string | null;
  photoUrl: string | null;
}

async function getPet(petId: string): Promise<PetBasics | null> {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(petId)) return null;
  const snap = await adminDb.collection('pets').doc(petId).get();
  if (!snap.exists) return null;
  const p = snap.data() as Record<string, unknown>;
  return {
    name: typeof p.name === 'string' ? p.name : 'A pet',
    breed: typeof p.breed === 'string' ? p.breed : null,
    species: typeof p.type === 'string' ? p.type : null,
    photoUrl: typeof p.photoUrl === 'string' ? p.photoUrl : null,
  };
}

export default async function FoundPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const pet = await getPet(petId);
  if (!pet) notFound();

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        {pet.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pet.photoUrl} alt={pet.name} style={styles.photo} />
        ) : (
          <div style={{ ...styles.photo, ...styles.photoEmpty }}>🐾</div>
        )}
        <h1 style={styles.name}>{pet.name}</h1>
        <p style={styles.subtitle}>
          {[pet.breed, pet.species].filter(Boolean).join(' · ') || 'Lost pet'}
        </p>
        <div style={styles.divider} />
        <h2 style={styles.h2}>Found this pet?</h2>
        <p style={styles.lede}>
          Leave a quick note and your contact info — we'll notify the owner immediately.
          They'll get in touch with you directly.
        </p>
        <FoundForm petId={petId} petName={pet.name} />
        <p style={styles.footer}>Made with PawMe · ayvalabs.com</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FAF6F2 0%, #F4ECE3 100%)',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 16px 40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  photo: {
    display: 'block',
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: 16,
    background: '#F4ECE3',
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    fontSize: 48,
  },
  name: {
    margin: '16px 0 4px',
    fontSize: 28,
    fontWeight: 700,
    color: '#1E1810',
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#7A6D5F',
    textTransform: 'capitalize' as const,
  },
  divider: {
    height: 1,
    background: '#EBE3D8',
    margin: '20px 0 16px',
  },
  h2: {
    margin: '0 0 6px',
    fontSize: 18,
    color: '#1E1810',
  },
  lede: {
    margin: '0 0 16px',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#5C5246',
  },
  footer: {
    margin: '24px 0 0',
    fontSize: 11,
    textAlign: 'center' as const,
    color: '#9C8E7F',
  },
};
