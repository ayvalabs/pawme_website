import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { Chatbot } from '@/app/components/chatbot';

export function FloatingActions() {
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <>
      {/* Floating Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setChatbotOpen(!chatbotOpen)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
          title="Chat with PawMe Assistant"
        >
          {chatbotOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
          )}
        </Button>
      </div>

      {/* Chatbot Dialog */}
      {chatbotOpen && (
        <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <Chatbot onClose={() => setChatbotOpen(false)} />
        </div>
      )}
    </>
  );
}