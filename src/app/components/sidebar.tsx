'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Gift, Radio, FileText, Settings, LogOut, User } from 'lucide-react';
import { ThemeAwareLogo } from '@/app/components/theme-aware-logo';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';

const navItems = [
  { name: 'Socials', href: '/dashboard/socials', icon: BarChart3 },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Gift },
  { name: 'Broadcast', href: '/dashboard/broadcast', icon: Radio },
  { name: 'Templates', href: '/dashboard/templates', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-center border-b px-6">
        <Link href="/dashboard/socials" className="flex items-center gap-2">
          <ThemeAwareLogo
            type="circle"
            alt="PawMe Circle Logo"
            className="h-8 w-8"
          />
          <ThemeAwareLogo
            type="text"
            alt="PawMe Text Logo"
            className="h-6 w-auto"
          />
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
