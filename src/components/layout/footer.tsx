import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Github, Twitter, Linkedin } from 'lucide-react';

const socialLinks = [
  {
    icon: <Twitter className="h-5 w-5" />,
    href: '#',
    label: 'Twitter',
  },
  {
    icon: <Github className="h-5 w-5" />,
    href: '#',
    label: 'Github',
  },
  {
    icon: <Linkedin className="h-5 w-5" />,
    href: '#',
    label: 'LinkedIn',
  },
];

export function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo />
          <div className="flex gap-2">
            {socialLinks.map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                size="icon"
                asChild
                aria-label={link.label}
              >
                <a href={link.href}>{link.icon}</a>
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PawMe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
