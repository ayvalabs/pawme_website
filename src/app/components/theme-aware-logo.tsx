'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface ThemeAwareLogoProps {
  type: 'circle' | 'text' | 'full';
  className?: string;
  alt?: string;
}

const themeColors: Record<string, string> = {
  purple: '#7678EE',
  green: '#10b981',
  blue: '#3b82f6',
  orange: '#f97316',
  pink: '#ec4899',
};

export function ThemeAwareLogo({ type, className = '', alt = 'PawMe Logo' }: ThemeAwareLogoProps) {
  const { profile } = useAuth();
  const [svgContent, setSvgContent] = useState<string>('');
  const currentColor = themeColors[profile?.theme || 'purple'];

  useEffect(() => {
    const loadSvg = async () => {
      const filename = type === 'circle' ? 'favicon.svg' : type === 'text' ? 'text_logo.svg' : 'full_logo.svg';
      
      try {
        const response = await fetch(`/${filename}`);
        let svg = await response.text();
        
        // Replace all instances of the hardcoded blue color with current theme color
        svg = svg.replace(/#7678EE/g, currentColor);
        
        setSvgContent(svg);
      } catch (error) {
        console.error('Failed to load SVG:', error);
      }
    };

    loadSvg();
  }, [type, currentColor]);

  if (!svgContent) {
    return <div className={className} />;
  }

  return (
    <div 
      className={`${className} flex items-center justify-center overflow-hidden`}
      aria-label={alt}
    >
      <div 
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
