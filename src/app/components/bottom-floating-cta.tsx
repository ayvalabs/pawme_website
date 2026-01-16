'use client';
import { Button } from '@/app/components/ui/button';

interface BottomFloatingCTAProps {
  onClick: () => void;
}

export function BottomFloatingCTA({ onClick }: BottomFloatingCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="pointer-events-auto">
          <Button
            onClick={onClick}
            size="lg"
            className="w-full h-14 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all hover:scale-105 bg-primary hover:bg-primary/90 group relative overflow-hidden animate-pulse rounded-full"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rounded-full" />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" style={{ animationDuration: '2s' }} />
            <span className="relative z-10 flex items-center justify-center gap-2">
              🚀 Join Kickstarter Waitlist 🎉
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
