// Email Funnel Configuration
// Lead-to-VIP Conversion Sequence: 12 emails over 26 days

export interface FunnelEmail {
  id: string;
  index: number;
  dayOffset: number;
  name: string;
  subjectA: string;
  subjectB: string;
  templateId: string;
  type: 'designed' | 'interactive';
  interactiveElement?: 'poll' | 'quiz' | 'calculator' | 'countdown' | 'live-counter' | 'comparison';
  enabled: boolean;
  angle: string;
}

export const LEAD_TO_VIP_FUNNEL_CONFIG = {
  funnelType: 'lead-to-vip',
  enabled: true,
  
  // Exit conditions
  exitOnVipConversion: true,
  exitOnUnsubscribe: true,
  
  // Behavior rules
  resendIfNotOpenedHours: 24,
  engagedAfterOpens: 1,
  hotAfterClicks: 1,
  dormantAfterEmails: 4,
  
  emails: [
    // Email 1 - Day 0
    {
      id: 'email_1',
      index: 0,
      dayOffset: 0,
      name: 'Welcome + VIP Offer',
      subjectA: 'You\'re on the PawMe waitlist! Here\'s what\'s next.',
      subjectB: 'Welcome to PawMe — one more step to lock your price',
      templateId: 'leadToVip_email1',
      type: 'designed',
      enabled: true,
      angle: 'Value',
    },
    
    // Email 2 - Day 1
    {
      id: 'email_2',
      index: 1,
      dayOffset: 1,
      name: 'Why VIPs Win',
      subjectA: '$299 vs $149 — the math on VIP',
      subjectB: 'Why 847 people already paid $1 (and you should too)',
      templateId: 'leadToVip_email2',
      type: 'interactive',
      interactiveElement: 'calculator',
      enabled: true,
      angle: 'FOMO',
    },
    
    // Email 3 - Day 3
    {
      id: 'email_3',
      index: 2,
      dayOffset: 3,
      name: 'Meet PawMe (Product)',
      subjectA: 'This is what PawMe actually does (you need to see this)',
      subjectB: 'Your pet camera sits still. PawMe doesn\'t.',
      templateId: 'leadToVip_email3',
      type: 'designed',
      enabled: true,
      angle: 'Education',
    },
    
    // Email 4 - Day 6
    {
      id: 'email_4',
      index: 3,
      dayOffset: 6,
      name: 'The Problem We Solve',
      subjectA: 'Quick question about your pet (takes 2 seconds)',
      subjectB: 'What worries you most when you leave your pet?',
      templateId: 'leadToVip_email4',
      type: 'interactive',
      interactiveElement: 'poll',
      enabled: true,
      angle: 'Pain',
    },
    
    // Email 5 - Day 8
    {
      id: 'email_5',
      index: 4,
      dayOffset: 8,
      name: 'Founder Story + Soft VIP Push',
      subjectA: 'The real reason I built PawMe (from Ashok, our founder)',
      subjectB: 'This happened to my cat. So I built PawMe.',
      templateId: 'leadToVip_email5',
      type: 'designed',
      enabled: true,
      angle: 'Trust',
    },
    
    // Email 6 - Day 10
    {
      id: 'email_6',
      index: 5,
      dayOffset: 10,
      name: 'Social Proof + VIP Counter',
      subjectA: 'People are locking VIP spots fast',
      subjectB: 'VIP counter just updated — spots are going',
      templateId: 'leadToVip_email6',
      type: 'interactive',
      interactiveElement: 'live-counter',
      enabled: true,
      angle: 'Proof',
    },
    
    // Email 7 - Day 13
    {
      id: 'email_7',
      index: 6,
      dayOffset: 13,
      name: 'PawMe vs Alternatives',
      subjectA: 'PawMe vs Furbo vs pet sitters (honest breakdown)',
      subjectB: 'We compared PawMe to every alternative',
      templateId: 'leadToVip_email7',
      type: 'interactive',
      interactiveElement: 'comparison',
      enabled: true,
      angle: 'Comparison',
    },
    
    // Email 8 - Day 15
    {
      id: 'email_8',
      index: 7,
      dayOffset: 15,
      name: 'Your Pet Deserves This',
      subjectA: 'What type of pet parent are you? (quick quiz)',
      subjectB: 'Your pet has a personality. PawMe learns it.',
      templateId: 'leadToVip_email8',
      type: 'interactive',
      interactiveElement: 'quiz',
      enabled: true,
      angle: 'Emotion',
    },
    
    // Email 9 - Day 17
    {
      id: 'email_9',
      index: 8,
      dayOffset: 17,
      name: 'VIP Spots Are Filling Up',
      subjectA: 'VIP spots are filling up — here\'s where things stand',
      subjectB: 'The $149 price won\'t last much longer',
      templateId: 'leadToVip_email9',
      type: 'designed',
      enabled: true,
      angle: 'Scarcity',
    },
    
    // Email 10 - Day 20
    {
      id: 'email_10',
      index: 9,
      dayOffset: 20,
      name: 'What You Miss Without VIP',
      subjectA: 'What you get vs what you miss (VIP vs regular)',
      subjectB: 'Two versions of launch day. Which one is yours?',
      templateId: 'leadToVip_email10',
      type: 'interactive',
      interactiveElement: 'comparison',
      enabled: true,
      angle: 'Loss Aversion',
    },
    
    // Email 11 - Day 23
    {
      id: 'email_11',
      index: 10,
      dayOffset: 23,
      name: 'FAQ + Last Objections',
      subjectA: 'Your top questions about PawMe VIP, answered',
      subjectB: 'Is VIP worth it? Here\'s everything you need to know.',
      templateId: 'leadToVip_email11',
      type: 'designed',
      enabled: true,
      angle: 'Trust',
    },
    
    // Email 12 - Day 26
    {
      id: 'email_12',
      index: 11,
      dayOffset: 26,
      name: 'Final Call — VIP Closes',
      subjectA: 'Last chance — VIP pricing closes tomorrow',
      subjectB: '$149 ends tomorrow. Then it\'s $299.',
      templateId: 'leadToVip_email12',
      type: 'interactive',
      interactiveElement: 'countdown',
      enabled: true,
      angle: 'Urgency',
    },
  ] as FunnelEmail[],
};

// Helper function to get email by index
export function getFunnelEmail(index: number): FunnelEmail | null {
  return LEAD_TO_VIP_FUNNEL_CONFIG.emails.find(e => e.index === index) || null;
}

// Helper function to get email by ID
export function getFunnelEmailById(id: string): FunnelEmail | null {
  return LEAD_TO_VIP_FUNNEL_CONFIG.emails.find(e => e.id === id) || null;
}

// Calculate next email due date
export function calculateNextEmailDue(currentIndex: number, startDate: Date): Date {
  const nextEmail = getFunnelEmail(currentIndex);
  if (!nextEmail) return new Date(); // No more emails
  
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + nextEmail.dayOffset);
  return dueDate;
}
