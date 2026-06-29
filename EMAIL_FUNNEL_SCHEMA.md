# Email Funnel Database Schema

## Firestore Collections

### 1. `emailFunnelUsers` Collection
Tracks each user's progress through the funnel

```typescript
{
  userId: string;              // Firebase user ID
  email: string;               // User email
  name: string;                // User name
  funnelStatus: 'active' | 'paused' | 'completed' | 'exited';
  funnelType: 'lead-to-vip';   // Funnel identifier
  startedAt: Timestamp;        // When they entered funnel
  completedAt?: Timestamp;     // When they completed/exited
  exitReason?: string;         // 'converted_to_vip' | 'unsubscribed' | 'completed'
  currentEmailIndex: number;   // Which email they're on (0-11)
  nextEmailDue: Timestamp;     // When next email should send
  isSubscribed: boolean;       // Marketing opt-in status
  isVip: boolean;              // VIP status (exit if true)
  tags: string[];              // ['lead_new', 'lead_engaged', 'lead_hot', 'lead_dormant']
  
  // Engagement metrics
  totalEmailsSent: number;
  totalOpens: number;
  totalClicks: number;
  lastOpenedAt?: Timestamp;
  lastClickedAt?: Timestamp;
  
  // Interactive responses
  pollResponses: {
    [emailId: string]: string;  // e.g., 'email_4': 'option_1'
  };
  quizResponses: {
    [emailId: string]: string;
  };
}
```

### 2. `emailFunnelSends` Collection
Tracks individual email sends

```typescript
{
  id: string;                  // Auto-generated
  userId: string;
  email: string;
  funnelType: 'lead-to-vip';
  emailId: string;             // 'email_1', 'email_2', etc.
  emailIndex: number;          // 0-11
  subject: string;
  sentAt: Timestamp;
  scheduledFor: Timestamp;
  status: 'scheduled' | 'sent' | 'failed' | 'skipped';
  
  // Resend tracking
  resendEmailId?: string;      // Resend API email ID
  
  // Engagement
  opened: boolean;
  openedAt?: Timestamp;
  openCount: number;
  
  clicked: boolean;
  clickedAt?: Timestamp;
  clickCount: number;
  clickedLinks: string[];      // URLs clicked
  
  // Metadata
  failureReason?: string;
}
```

### 3. `emailFunnelEvents` Collection
Tracks all email events (opens, clicks, etc.)

```typescript
{
  id: string;
  userId: string;
  email: string;
  emailSendId: string;         // Reference to emailFunnelSends doc
  emailId: string;             // 'email_1', etc.
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  timestamp: Timestamp;
  
  // Event-specific data
  clickedLink?: string;
  userAgent?: string;
  ipAddress?: string;
  
  // Resend webhook data
  resendEventId?: string;
  resendData?: any;
}
```

### 4. `emailFunnelConfig` Collection (Single Document)
Configuration for the funnel

```typescript
{
  funnelType: 'lead-to-vip';
  enabled: boolean;
  
  emails: [
    {
      id: 'email_1';
      index: 0;
      dayOffset: 0;              // Send on day 0 (immediately)
      name: 'Welcome + VIP Offer';
      subjectA: 'You're on the PawMe waitlist! Here's what's next.';
      subjectB: 'Welcome to PawMe — one more step to lock your price';
      templateId: 'leadToVip_email1';
      type: 'designed' | 'interactive';
      interactiveElement?: 'poll' | 'quiz' | 'calculator' | 'countdown';
      enabled: boolean;
    },
    // ... 11 more emails
  ];
  
  // Behavior rules
  exitOnVipConversion: boolean;
  exitOnUnsubscribe: boolean;
  resendIfNotOpenedHours: number;  // 24 hours
  
  // Tagging rules
  engagedAfterOpens: number;       // 1 open = engaged
  hotAfterClicks: number;          // 1 click = hot
  dormantAfterEmails: number;      // 4 emails with no opens = dormant
}
```

## User Fields to Add (in existing `users` collection)

```typescript
{
  // Existing fields...
  
  // Add these:
  marketingOptIn: boolean;         // Already exists
  unsubscribedAt?: Timestamp;      // When they unsubscribed
  emailFunnelStatus?: {
    currentFunnel: 'lead-to-vip' | null;
    status: 'active' | 'paused' | 'completed' | 'exited';
    startedAt: Timestamp;
  };
}
```

## Indexes Needed

```
emailFunnelUsers:
  - userId (for lookups)
  - funnelStatus + nextEmailDue (for scheduled sends)
  - isSubscribed + funnelStatus (for filtering)

emailFunnelSends:
  - userId + emailId (for user email history)
  - status + scheduledFor (for processing queue)
  - resendEmailId (for webhook lookups)

emailFunnelEvents:
  - emailSendId (for aggregation)
  - userId + eventType (for user analytics)
```

## API Endpoints Needed

1. `POST /api/funnel/enroll` - Enroll user in funnel
2. `POST /api/funnel/process` - Process scheduled emails (cron job)
3. `POST /api/funnel/webhook` - Handle Resend webhooks
4. `GET /api/funnel/user/:userId` - Get user funnel status
5. `POST /api/funnel/poll-response` - Record poll/quiz responses
6. `POST /api/funnel/unsubscribe` - Unsubscribe user
7. `GET /api/funnel/stats` - Dashboard statistics

## Automation Flow

1. **User signs up** → Check if NOT VIP → Enroll in funnel
2. **Cron job** (every hour) → Check `nextEmailDue` → Send emails
3. **Before sending** → Check `isSubscribed` and `isVip` → Skip if false
4. **Email sent** → Create `emailFunnelSends` record
5. **Webhook received** → Update `emailFunnelSends` and create `emailFunnelEvents`
6. **User converts to VIP** → Exit funnel, update status
7. **User unsubscribes** → Exit funnel, update status

## Dashboard Display

Show per user:
- Current funnel status
- Emails sent (12 total)
- Emails opened (X/12)
- Emails clicked (X/12)
- Current email position (e.g., "Email 5 of 12")
- Next email scheduled for
- Tags (engaged, hot, dormant)
- Subscription status
- Interactive responses (poll answers, quiz results)
