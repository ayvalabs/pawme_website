import { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { X, Send, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotProps {
  onClose: () => void;
}

export function Chatbot({ onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm PawMe Assistant 🐾 I'm here to answer questions about PawMe, our AI companion robot for pets. What would you like to know?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getFAQResponse = (question: string): string => {
    const q = question.toLowerCase();

    // Features
    if (q.includes('feature') || q.includes('what does') || q.includes('can it')) {
      return "PawMe has amazing features! It includes:\n\n• 360° Movement - Follows your pet anywhere\n• HD Camera - Crystal clear video feed\n• AI Health Monitoring - Detects health issues early\n• Laser Pointer - Interactive play sessions\n• Temperature & Distance Sensors\n• Motion Detection for automatic photos\n• Daily Highlight Reels\n• Security Alerts\n• Tick & Skin Issue Detection\n• Companion App with remote control\n\nWhat specific feature interests you?";
    }

    // Kickstarter
    if (q.includes('kickstarter') || q.includes('launch') || q.includes('when')) {
      return "We're launching on Kickstarter in March 2026! 🚀\n\nJoin our waitlist now to get:\n• Early bird pricing\n• Exclusive updates\n• Referral rewards\n• First access when we launch\n\nSign up above to stay in the loop!";
    }

    // Price
    if (q.includes('price') || q.includes('cost') || q.includes('how much')) {
      return "We'll announce special early bird pricing when we launch on Kickstarter in March 2026! Join the waitlist to get notified first and access exclusive discounts. Early supporters will get the best deals! 💰";
    }

    // Referral
    if (q.includes('referral') || q.includes('reward') || q.includes('share')) {
      return "Our referral program is awesome! 🎁\n\nEarn points by:\n• Signing up (100 points)\n• Referring friends (50 points each)\n• Sharing on social media (25 points)\n\nRedeem points for:\n• Early bird discounts\n• Exclusive PawMe merch\n• Premium features\n• And more!\n\nSign in to get your unique referral link!";
    }

    // Pets
    if (q.includes('dog') || q.includes('cat') || q.includes('pet') || q.includes('animal')) {
      return "PawMe works great with both dogs and cats! 🐶🐱\n\nOur AI is trained to:\n• Recognize different breeds\n• Understand pet behavior\n• Monitor health for both species\n• Provide appropriate play interactions\n• Detect species-specific health issues\n\nWhether you have a playful pup or a curious cat, PawMe has you covered!";
    }

    // AI/Technology
    if (q.includes('ai') || q.includes('how') || q.includes('work') || q.includes('technology')) {
      return "PawMe uses advanced AI technology! 🤖\n\nOur system:\n• Computer Vision - Recognizes your pet and their behavior\n• Machine Learning - Learns your pet's patterns\n• Health Analytics - Detects anomalies early\n• Motion Tracking - Follows pets smoothly\n• Smart Alerts - Only notifies important events\n\nAll processing happens on-device for privacy and speed!";
    }

    // App
    if (q.includes('app') || q.includes('phone') || q.includes('control')) {
      return "The PawMe companion app is incredible! 📱\n\nFeatures:\n• Live video feed from anywhere\n Remote control of PawMe\n• Daily highlight reels\n• Health reports & alerts\n• Photo gallery\n• Play mode controls\n• Settings & preferences\n\nAvailable for iOS and Android!";
    }

    // Health
    if (q.includes('health') || q.includes('sick') || q.includes('vet') || q.includes('medical')) {
      return "PawMe's health monitoring is revolutionary! 🏥\n\nWe can detect:\n• Unusual behavior patterns\n• Skin issues & ticks\n• Movement changes\n• Temperature anomalies\n• Lethargy or hyperactivity\n\nNote: PawMe assists monitoring but doesn't replace your vet. Always consult professionals for medical concerns!";
    }

    // Shipping
    if (q.includes('ship') || q.includes('deliver') || q.includes('available') || q.includes('country')) {
      return "We plan to ship worldwide after our Kickstarter campaign! 🌍\n\nInitial shipping regions:\n• United States\n• Canada\n• United Kingdom\n• European Union\n• Australia\n\nMore regions will be added based on demand. Join the waitlist to stay updated on availability in your area!";
    }

    // Company
    if (q.includes('company') || q.includes('ayva') || q.includes('who made') || q.includes('team')) {
      return "PawMe is developed by Ayva Labs Limited! 👥\n\nWe're a team passionate about:\n• Pet wellbeing\n• AI innovation\n• Quality engineering\n• Customer satisfaction\n\nOur mission: Keep every pet happy, healthy, and loved through technology! Follow us @pawme on all social platforms!";
    }

    // Default
    return "Great question! Here's what I can help you with:\n\n• Features & capabilities\n• Kickstarter launch details\n• Pricing information\n• Referral program\n• Pet compatibility\n• AI technology\n• Companion app\n• Health monitoring\n• Shipping & availability\n• About Ayva Labs\n\nWhat would you like to know more about? 😊";
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getFAQResponse(input),
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickQuestions = [
    "What features does PawMe have?",
    "When is the Kickstarter launch?",
    "How does the referral program work?",
    "Is it compatible with my pet?",
  ];

  return (
    <Card className="flex flex-col h-[600px] w-[400px] shadow-2xl border-2 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">PawMe Assistant</h3>
            <p className="text-xs opacity-90">Ask me anything!</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isBot
                  ? 'bg-secondary text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs text-muted-foreground">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                onClick={() => {
                  setInput(q);
                  setTimeout(() => handleSend(), 100);
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="sm" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}