import type { Metadata } from 'next';
import { ReferralRedirect } from './ReferralRedirect';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const title = 'Try PawMe — 30 days of Pro free';
  const description = `Use invite code ${code?.toUpperCase?.() ?? ''} for 30 days of PawMe Pro free. Your pet's AI health companion.`;
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary', title, description } };
}

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReferralRedirect code={(code || '').toUpperCase()} />;
}
