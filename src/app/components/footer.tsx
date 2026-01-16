import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';
import Image from 'next/image';
import placeholderImages from '@/app/lib/placeholder-images.json';

export function Footer() {
  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/pawme', label: 'Twitter' },
    { icon: Facebook, href: 'https://facebook.com/pawme', label: 'Facebook' },
    { icon: Instagram, href: 'https://instagram.com/pawme', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/pawme', label: 'LinkedIn' },
  ];

  const { favicon, logoText } = placeholderImages;

  return (
    <footer className="border-t border-border bg-gradient-to-b from-transparent to-secondary/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
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
                className="h-6 w-auto"
                data-ai-hint={logoText.hint}
              />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The AI companion robot that understands and cares for your pets.
            </p>
            <p className="text-xs text-muted-foreground">
              By Ayva Labs Limited
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4">About</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Technology</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4">Connect With Us</h4>
            <div className="flex gap-3 mb-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary rounded-lg transition-all hover:scale-110"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Follow <span className="text-primary">@pawme</span> on all platforms
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 Ayva Labs Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
