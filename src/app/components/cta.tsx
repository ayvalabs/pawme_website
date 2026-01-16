import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Mail, Sparkles } from 'lucide-react';

interface CTAProps {
  onEmailSubmit: (email: string) => void;
}

export function CTA({ onEmailSubmit }: CTAProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onEmailSubmit(email);
    setIsSubmitting(false);
  };

  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-500 to-primary p-12 md:p-16">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Limited Early Bird Spots Available</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl mb-4">Don't Miss Out!</h2>
            <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Join our waitlist now and be among the first to bring PawMe home. Early adopters get exclusive discounts and perks!
            </p>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/50"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isSubmitting}
                  className="h-12 px-8 bg-white hover:bg-white/90 text-primary"
                >
                  {isSubmitting ? 'Joining...' : 'Get Early Access'}
                </Button>
              </div>
            </form>

            <p className="text-sm text-white/70 mt-6">
              🎁 First 100 signups get an additional 20% OFF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
