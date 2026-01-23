'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'product' | 'referral';
}

const faqData: FAQItem[] = [
  // Product FAQs
  {
    category: 'product',
    question: 'What is PawMe?',
    answer: 'PawMe is an AI-powered companion for your pets that helps you understand their needs, track their health, and provide better care. Our smart device uses advanced AI to monitor your pet\'s behavior, health metrics, and emotional state, giving you real-time insights and personalized recommendations.',
  },
  {
    category: 'product',
    question: 'How does PawMe work?',
    answer: 'PawMe uses a combination of sensors, cameras, and AI algorithms to monitor your pet\'s activities, behavior patterns, and vital signs. The device connects to our mobile app where you can view insights, receive alerts, and get personalized care recommendations based on your pet\'s unique needs.',
  },
  {
    category: 'product',
    question: 'When will PawMe be available?',
    answer: 'We\'re currently in the pre-launch phase and building our community through our referral campaign. We\'ll be launching on Kickstarter soon! Join our waitlist to be notified when we launch and get exclusive early-bird pricing.',
  },
  {
    category: 'product',
    question: 'What pets does PawMe support?',
    answer: 'PawMe is designed for both dogs and cats. Our AI is trained on a wide variety of breeds and can adapt to your pet\'s specific characteristics and needs.',
  },
  {
    category: 'product',
    question: 'Is my $1 VIP deposit refundable?',
    answer: 'Yes! Your $1 VIP deposit is fully refundable until our Kickstarter campaign launches. This deposit secures your spot as a founding member and gives you access to exclusive perks and early-bird pricing.',
  },
  {
    category: 'product',
    question: 'What are the benefits of becoming a VIP member?',
    answer: 'VIP founding members get exclusive benefits including: early access to the product, special pricing on Kickstarter, priority customer support, exclusive updates, and the ability to influence product development through early feedback.',
  },
  
  // Referral Campaign FAQs
  {
    category: 'referral',
    question: 'How does the referral program work?',
    answer: 'Share your unique referral link with friends and family. When someone signs up using your link, you both earn points! You get 50 points for each successful referral, and your friend gets 100 points for signing up. The more people you refer, the higher you climb on the leaderboard.',
  },
  {
    category: 'referral',
    question: 'What can I do with my points?',
    answer: 'Points determine your position on the leaderboard and unlock exclusive rewards! Top referrers can win prizes like free PawMe devices, premium subscriptions, exclusive merchandise, and special recognition as founding community members.',
  },
  {
    category: 'referral',
    question: 'How do I find my referral link?',
    answer: 'After signing up and logging in, you\'ll find your unique referral link on your dashboard. You can easily copy it and share it via email, social media, or messaging apps. Track your referrals and points in real-time on your dashboard.',
  },
  {
    category: 'referral',
    question: 'Is there a limit to how many people I can refer?',
    answer: 'No! There\'s no limit to the number of people you can refer. The more you share, the more points you earn, and the better your chances of winning amazing rewards and climbing to the top of the leaderboard.',
  },
  {
    category: 'referral',
    question: 'When do I receive points for referrals?',
    answer: 'Points are awarded instantly when someone signs up using your referral link and completes their email verification. You can track all your referrals and points in real-time on your dashboard.',
  },
  {
    category: 'referral',
    question: 'What rewards can I earn?',
    answer: 'Top referrers on the leaderboard can earn exclusive rewards including free PawMe devices, lifetime premium subscriptions, limited edition merchandise, early access to new features, and special recognition in our founding community. Check the leaderboard page for current reward tiers!',
  },
  {
    category: 'referral',
    question: 'Can I share my referral link on social media?',
    answer: 'Absolutely! We encourage you to share your referral link on social media platforms like Facebook, Twitter, Instagram, and LinkedIn. The more places you share, the more potential referrals you can get. Just make sure to follow each platform\'s guidelines.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'product' | 'referral'>('all');

  const filteredFAQs = activeCategory === 'all' 
    ? faqData 
    : faqData.filter(faq => faq.category === activeCategory);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about PawMe and our referral campaign
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary/20 text-foreground hover:bg-secondary/30'
            }`}
          >
            All Questions
          </button>
          <button
            onClick={() => setActiveCategory('product')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeCategory === 'product'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary/20 text-foreground hover:bg-secondary/30'
            }`}
          >
            Product
          </button>
          <button
            onClick={() => setActiveCategory('referral')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeCategory === 'referral'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary/20 text-foreground hover:bg-secondary/30'
            }`}
          >
            Referral Program
          </button>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    faq.category === 'product' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                    {faq.category === 'product' ? 'Product' : 'Referral'}
                  </span>
                  <span className="font-semibold text-foreground">{faq.question}</span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-accent/20 border-t border-border">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center p-6 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-foreground font-medium mb-2">Still have questions?</p>
          <p className="text-muted-foreground">
            We're here to help! Reach out to us at{' '}
            <a href="mailto:support@ayvalabs.com" className="text-primary hover:underline font-medium">
              support@ayvalabs.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
