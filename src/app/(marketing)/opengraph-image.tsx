import { ImageResponse } from 'next/og';

export const alt = 'PawMe — AI pet health & food scanner for dogs & cats';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #FBF4EF 0%, #FFE7DD 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F47B5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="#fff"><circle cx="6" cy="9" r="2" /><circle cx="10.5" cy="6" r="2" /><circle cx="15" cy="6.5" r="2" /><circle cx="18.5" cy="10" r="1.8" /><path d="M12 12c-3 0-5 2.2-5 4.6C7 18.5 8.6 19 12 19s5-.5 5-2.4C17 14.2 15 12 12 12z" /></svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#1A1A1A' }}>PawMe</div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.05, maxWidth: 900 }}>
          Know exactly what&apos;s good for your pet.
        </div>
        <div style={{ fontSize: 30, color: '#6E665F', marginTop: 28, maxWidth: 860, fontFamily: 'sans-serif' }}>
          Instant A–F food scores · gut-health checks · vaccine reminders. Free, for dogs &amp; cats.
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 44 }}>
          <div style={{ background: '#1A1A1A', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 22, fontFamily: 'sans-serif' }}>App Store</div>
          <div style={{ background: '#1A1A1A', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 22, fontFamily: 'sans-serif' }}>Google Play</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
