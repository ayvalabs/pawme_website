import { useEffect } from 'react';
import circleIcon from 'figma:asset/bdd95d9196437c53040ed91a0ab1509a30e2ba09.png';

export function FaviconHandler() {
  useEffect(() => {
    // Set favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = circleIcon;
    document.getElementsByTagName('head')[0].appendChild(link);

    // Set page title
    document.title = 'PawMe - AI Companion Robot for Pets | Coming Soon on Kickstarter';

    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.getElementsByTagName('head')[0].appendChild(metaDescription);
    }
    metaDescription.content = 'PawMe is an AI-powered companion robot that keeps your pet happy, healthy, and entertained. Join the waitlist for our March 2026 Kickstarter launch!';
  }, []);

  return null;
}
