'use client';

import { useEffect } from 'react';
import imageData from '@/app/lib/placeholder-images.json';

export function FaviconHandler() {
  useEffect(() => {
    const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = imageData.circleIcon.src;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  return null;
}
