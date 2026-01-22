'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { User, LogOut, Trophy, Palette } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import { ThemeAwareLogo } from '@/app/components/theme-aware-logo';

interface HeaderProps {
  variant?: 'transparent' | 'solid';
}

export function Header({ variant: initialVariant = 'solid' }: HeaderProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { user, profile, signOut, updateTheme } = useAuth();
  
  const [headerVariant, setHeaderVariant] = useState(initialVariant);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    if (window.location.pathname.includes('/leaderboard') || window.location.pathname.includes('/dashboard')) {
      setHeaderVariant('solid');
      setIsScrolled(true); // Always solid on these pages
      return;
    }

    setHeaderVariant('transparent');
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  const headerClasses = headerVariant === 'transparent' && !isScrolled
    ? 'absolute top-0 left-0 right-0 z-40'
    : 'sticky top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b';

  const isTransparent = headerVariant === 'transparent' && !isScrolled;
  const textColorClass = isTransparent ? 'text-white' : '';
  const buttonVariantClass = isTransparent ? 'text-white border-white/30 hover:bg-white/10 hover:text-white' : '';

  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'purple');
    }
  }, [profile?.theme]);

  const handleThemeChange = async (theme: string) => {
    if (updateTheme) {
      try {
        await updateTheme(theme);
      } catch (error) {
        console.error('Error in handleThemeChange:', error);
      }
    }
  };

  const themes = [
    { name: 'Green', value: 'green', color: '#10b981' },
    { name: 'Blue', value: 'blue', color: '#3b82f6' },
    { name: 'Purple', value: 'purple', color: '#7678EE' },
    { name: 'Orange', value: 'orange', color: '#f97316' },
    { name: 'Pink', value: 'pink', color: '#ec4899' },
  ];

  return (
    <>
      <header className={headerClasses}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <ThemeAwareLogo
              type="circle"
              alt="PawMe Circle Logo"
              className="h-10 w-10"
            />
            <ThemeAwareLogo
              type="text"
              alt="PawMe Text Logo"
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3">
            {!user ? (
              <Button
                onClick={() => setAuthDialogOpen(true)}
              >
                Join Waitlist
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`gap-2 ${buttonVariantClass}`}
                >
                  <Link href="/leaderboard">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </Link>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={`gap-2 ${buttonVariantClass}`}>
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {profile?.name}
                        {profile?.isVip && ' 👑'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {profile?.name}
                          {profile?.isVip && ' 👑'}
                        </p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>{profile?.points || 0} Points</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      <Palette className="inline h-3 w-3 mr-2" />
                      Theme Color
                    </DropdownMenuLabel>
                    {themes.map((theme) => (
                      <DropdownMenuItem
                        key={theme.value}
                        onClick={() => handleThemeChange(theme.value)}
                        className="gap-2"
                      >
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span>{theme.name}</span>
                        {profile?.theme === theme.value && (
                          <span className="ml-auto text-xs">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />
    </>
  );
}
