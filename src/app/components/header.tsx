'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { User, LogOut, Trophy, Palette } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import imageData from '@/app/lib/placeholder-images.json';

interface HeaderProps {
  onShowLeaderboard?: () => void;
}

export function Header({ onShowLeaderboard }: HeaderProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { user, profile, signOut, updateTheme } = useAuth();

  const headerClasses = user ? 'border-b' : 'absolute top-0 left-0 right-0 z-40';

  useEffect(() => {
    // Apply theme color to CSS variables
    console.log('Theme effect triggered, profile theme:', profile?.theme);
    if (profile?.theme) {
      console.log('Setting data-theme attribute to:', profile.theme);
      document.documentElement.setAttribute('data-theme', profile.theme);
      console.log('Current data-theme attribute:', document.documentElement.getAttribute('data-theme'));
    } else {
      console.log('No profile theme available');
    }
  }, [profile?.theme]);

  const handleThemeChange = async (theme: string) => {
    console.log('handleThemeChange called with theme:', theme);
    console.log('updateTheme function exists:', !!updateTheme);
    if (updateTheme) {
      try {
        await updateTheme(theme);
        console.log('Theme change completed');
      } catch (error) {
        console.error('Error in handleThemeChange:', error);
      }
    } else {
      console.error('updateTheme function not available');
    }
  };

  const themes = [
    { name: 'Green', value: 'green', color: '#10b981' },
    { name: 'Blue', value: 'blue', color: '#3b82f6' },
    { name: 'Purple', value: 'purple', color: '#837bf6' },
    { name: 'Orange', value: 'orange', color: '#f97316' },
    { name: 'Pink', value: 'pink', color: '#ec4899' },
  ];

  return (
    <>
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={imageData.circleIcon.src}
              alt={imageData.circleIcon.alt}
              className="h-10 w-10"
            />
            <ImageWithFallback
              src={imageData.textLogo.src}
              alt={imageData.textLogo.alt}
              className="h-8 w-auto"
            />
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <Button
                onClick={() => setAuthDialogOpen(true)}
              >
                Join Waitlist
              </Button>
            ) : (
              <>
                {onShowLeaderboard && (
                  <Button
                    onClick={onShowLeaderboard}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">{profile?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.name}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>{profile?.points || 0} Points</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      <Palette className="inline mr-2 h-3 w-3" />
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
