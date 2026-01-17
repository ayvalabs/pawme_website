
import { SocialIcon } from 'react-social-icons';
import { ThemeAwareLogo } from '@/app/components/theme-aware-logo';

export function Footer() {
  const socialLinks = [
    { network: 'twitter', url: 'https://twitter.com/pawme' },
    { network: 'facebook', url: 'https://facebook.com/pawme' },
    { network: 'instagram', url: 'https://instagram.com/pawme' },
    { network: 'youtube', url: 'https://youtube.com/@pawme' },
    { network: 'tiktok', url: 'https://tiktok.com/@pawme' },
  ];

  return (
    <footer className="border-t border-border bg-gradient-to-b from-transparent to-secondary/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ThemeAwareLogo
                type="circle"
                alt="PawMe Circle Logo"
                className="h-10 w-10"
              />
              <ThemeAwareLogo
                type="text"
                alt="PawMe Text Logo"
                className="h-6 w-auto"
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
            <div className="flex gap-2 mb-4">
              {socialLinks.map((social) => (
                <SocialIcon
                  key={social.network}
                  url={social.url}
                  network={social.network}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-primary hover:text-primary-foreground hover:bg-primary rounded-full transition-all hover:scale-110"
                  style={{ height: 44, width: 44 }}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ))}
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
