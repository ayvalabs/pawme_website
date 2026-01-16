import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { User, LogOut, Trophy, Palette } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import Image from 'next/image';
import placeholderImages from '@/app/lib/placeholder-images.json';

interface HeaderProps {
  onShowLeaderboard?: () => void;
}

export function Header({ onShowLeaderboard }: HeaderProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const { user, profile, signOut, updateTheme } = useAuth();

  useEffect(() => {
    // Apply theme color to CSS variables
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme);
    }
  }, [profile?.theme]);

  const handleThemeChange = async (theme: string) => {
    if (updateTheme) {
        await updateTheme(theme);
    }
    setThemeMenuOpen(false);
  };

  const themes = [
    { name: 'Green', value: 'green', color: '#10b981' },
    { name: 'Blue', value: 'blue', color: '#3b82f6' },
    { name: 'Purple', value: 'purple', color: '#7678EE' },
    { name: 'Orange', value: 'orange', color: '#f97316' },
    { name: 'Pink', value: 'pink', color: '#ec4899' },
  ];
  
  const { favicon, logoText } = placeholderImages;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={favicon.src}
              alt={favicon.alt}
              width={favicon.width}
              height={favicon.height}
              className="h-10 w-10"
              data-ai-hint={favicon.hint}
            />
            <Image
              src={logoText.src}
              alt={logoText.alt}
              width={logoText.width}
              height={logoText.height}
              className="h-8 w-auto"
              data-ai-hint={logoText.hint}
            />
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <Button
                onClick={() => setAuthDialogOpen(true)}
                variant="outline"
                className="border-white/30 hover:bg-white/10 text-white hover:text-white bg-white/5"
              >
                Sign In
              </Button>
            ) : (
              <>
                {onShowLeaderboard && (
                  <Button
                    onClick={onShowLeaderboard}
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-white hover:bg-white/10"
                  >
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 border-white/30 hover:bg-white/10 text-white bg-white/5">
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
                    <DropdownMenu open={themeMenuOpen} onOpenChange={setThemeMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Palette className="mr-2 h-4 w-4" />
                          <span>Change Theme</span>
                        </DropdownMenuItem>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="left" align="start" className="w-48">
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
                      </DropdownMenuContent>
                    </DropdownMenu>
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
