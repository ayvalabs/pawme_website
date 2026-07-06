'use client';

export const IOS_URL = 'https://apps.apple.com/hk/app/pawme-pet-health-food-ai/id6758856073?l=en-GB';
export const ANDROID_URL = 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme';

export default function AppStoreButtons({ size = 'default', glow = false }: { size?: 'default' | 'large'; glow?: boolean }) {
  const sizeClass = size === 'large' ? 'h-14' : 'h-11';
  const wrapperClass = glow ? 'animate-pulse-glow rounded-xl' : '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={IOS_URL} target="_blank" rel="noopener noreferrer" data-store="ios" className={`inline-block ${wrapperClass}`}>
        <svg className={sizeClass} viewBox="0 0 180 53" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="180" height="53" rx="8" fill="#1A1A1A" />
          <text x="62" y="18" fill="#FFFFFF" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="400">Download on the</text>
          <text x="62" y="35" fill="#FFFFFF" fontSize="16" fontFamily="Inter, sans-serif" fontWeight="600">App Store</text>
          <g transform="translate(18, 10)">
            <path d="M16.5 2.5c1.2 1.4 2 3.3 1.8 5.3-1.8.1-3.9-1-5.1-2.4-1.1-1.3-2.1-3.3-1.8-5.2 1.9-.1 3.8 1 5.1 2.3z" fill="white" />
            <path d="M18.3 7.8c-2.8-.2-5.2 1.6-6.5 1.6-1.4 0-3.4-1.5-5.6-1.5-2.9 0-5.5 1.7-7 4.2-3 5.2-.8 12.8 2.1 17 1.4 2.1 3.1 4.4 5.4 4.3 2.1-.1 2.9-1.4 5.5-1.4 2.6 0 3.3 1.4 5.5 1.3 2.3 0 3.8-2.1 5.2-4.1 1.6-2.4 2.3-4.7 2.3-4.8 0 0-4.5-1.7-4.5-6.8 0-4.3 3.5-6.3 3.6-6.4-2-2.9-5-3.2-6-3.4z" fill="white" />
          </g>
        </svg>
      </a>
      <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer" data-store="android" className={`inline-block ${wrapperClass}`}>
        <svg className={sizeClass} viewBox="0 0 180 53" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="180" height="53" rx="8" fill="#1A1A1A" />
          <text x="62" y="18" fill="#FFFFFF" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="400">GET IT ON</text>
          <text x="62" y="35" fill="#FFFFFF" fontSize="14" fontFamily="Inter, sans-serif" fontWeight="600">Google Play</text>
          <g transform="translate(16, 10)">
            <path d="M4 2.5L20 16.5 4 30.5V2.5z" fill="#4285F4" />
            <path d="M4 2.5l16 14-4.5 4L4 10V2.5z" fill="#34A853" />
            <path d="M4 30.5l11.5-10.5-4.5-4L4 30.5z" fill="#FBBC04" />
            <path d="M20 16.5l-4.5 4L4 30.5V10l7 6.5L20 16.5z" fill="#EA4335" />
          </g>
        </svg>
      </a>
    </div>
  );
}
