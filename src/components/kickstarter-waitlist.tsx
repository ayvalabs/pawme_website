'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import { useState } from 'react';

export function KickstarterWaitlist() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the email to your backend via a server action
    console.log('Email submitted:', email);
    toast({
      title: "You're on the list!",
      description: "We'll notify you when our Kickstarter goes live.",
    });
    setOpen(false);
    setEmail('');
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg text-lg px-8 py-6 animate-pulse hover:animate-none"
          >
            Join the Kickstarter Waitlist
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              Get Ready for Paw-some News!
            </DialogTitle>
            <DialogDescription>
              Be the first to know when our Kickstarter launches. Enter your
              email below to join the waitlist.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your.pet.lover@email.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Join Waitlist
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
