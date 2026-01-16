import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase clients
const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const getSupabase = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// Health check endpoint
app.get("/make-server-f2b924d9/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up with email/password
app.post("/make-server-f2b924d9/auth/signup", async (c) => {
  try {
    const { email, password, name, referredBy } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (authError) {
      console.log(`Auth signup error: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }

    // Generate unique referral code
    const referralCode = generateReferralCode(email);
    
    // Create user profile in KV store
    const userProfile = {
      id: authData.user.id,
      email,
      name: name || email.split('@')[0],
      referralCode,
      points: 0,
      referralCount: 0,
      referredBy: referredBy || null,
      theme: 'green',
      rewards: [],
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${authData.user.id}`, userProfile);
    await kv.set(`referral:${referralCode}`, authData.user.id);
    
    // If user was referred, credit the referrer
    if (referredBy) {
      await creditReferrer(referredBy);
    }

    // Send welcome email
    await sendWelcomeEmail(email, name || email.split('@')[0], referralCode);

    return c.json({ 
      user: { ...authData.user, profile: userProfile },
      message: "User created successfully" 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Signup error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Sign in with email/password
app.post("/make-server-f2b924d9/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Auth signin error: ${error.message}`);
      return c.json({ error: error.message }, 401);
    }

    // Get user profile
    const profile = await kv.get(`user:${data.user.id}`);

    return c.json({ 
      user: data.user,
      session: data.session,
      profile 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Signin error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Get user session
app.get("/make-server-f2b924d9/auth/session", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile
    const profile = await kv.get(`user:${data.user.id}`);

    return c.json({ user: data.user, profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Session check error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Sign out
app.post("/make-server-f2b924d9/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ message: "Signed out" });
    }

    const supabase = getSupabase();
    await supabase.auth.signOut();

    return c.json({ message: "Signed out successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Signout error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// ==================== USER PROFILE ROUTES ====================

// Get user profile (requires auth)
app.get("/make-server-f2b924d9/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Profile fetch error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Update user theme
app.put("/make-server-f2b924d9/profile/theme", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { theme } = await c.req.json();
    
    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    profile.theme = theme;
    await kv.set(`user:${user.id}`, profile);

    return c.json({ profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Theme update error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// ==================== REFERRAL ROUTES ====================

// Get referral stats
app.get("/make-server-f2b924d9/referrals/stats", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ 
      referralCode: profile.referralCode,
      referralCount: profile.referralCount,
      points: profile.points,
      rewards: profile.rewards 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Referral stats error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Get leaderboard
app.get("/make-server-f2b924d9/leaderboard", async (c) => {
  try {
    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    
    // Sort by points
    const sorted = allUsers
      .sort((a: any, b: any) => b.points - a.points)
      .slice(0, 100) // Top 100
      .map((user: any, index: number) => ({
        rank: index + 1,
        name: user.name,
        points: user.points,
        referralCount: user.referralCount,
      }));

    return c.json({ leaderboard: sorted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Leaderboard error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// ==================== ADMIN ROUTES (for managing rewards) ====================

// Get all rewards
app.get("/make-server-f2b924d9/admin/rewards", async (c) => {
  try {
    const rewards = await kv.get('system:rewards') || [];
    return c.json({ rewards });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Get rewards error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Add reward (admin only - in production, add proper auth check)
app.post("/make-server-f2b924d9/admin/rewards", async (c) => {
  try {
    const { title, description, pointsRequired, image } = await c.req.json();
    
    const rewards = await kv.get('system:rewards') || [];
    
    const newReward = {
      id: `reward_${Date.now()}`,
      title,
      description,
      pointsRequired,
      image,
      createdAt: new Date().toISOString(),
    };
    
    rewards.push(newReward);
    await kv.set('system:rewards', rewards);

    return c.json({ reward: newReward });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Add reward error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

function generateReferralCode(email: string): string {
  const hash = email.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const code = Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
  return `PAWME${code}`;
}

async function creditReferrer(referralCode: string): Promise<void> {
  try {
    const userId = await kv.get(`referral:${referralCode}`);
    
    if (!userId) {
      return;
    }

    const profile = await kv.get(`user:${userId}`);
    
    if (!profile) {
      return;
    }

    // Credit points and increment referral count
    profile.points = (profile.points || 0) + 100; // 100 points per referral
    profile.referralCount = (profile.referralCount || 0) + 1;
    
    await kv.set(`user:${userId}`, profile);
    
    // Send notification email to referrer
    await sendReferralSuccessEmail(profile.email, profile.name, profile.referralCount);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Credit referrer error: ${message}`);
  }
}

// Email sending function using fetch to a Gmail/Google Workspace endpoint
// Note: This requires setting up Gmail API credentials or using a service like Resend
async function sendReferralSuccessEmail(toEmail: string, userName: string, referralCount: number): Promise<void> {
  try {
    // Log the email that would be sent
    // In production, integrate with Resend, SendGrid, or Gmail API
    console.log(`
      ==================== EMAIL NOTIFICATION ====================
      To: ${toEmail}
      From: pawme@ayvalabs.com
      Subject: 🎉 You've earned points! Someone joined using your referral link
      
      Hi ${userName},
      
      Great news! Someone just signed up using your referral link.
      
      Your Stats:
      - Total Referrals: ${referralCount}
      - Points Earned: ${referralCount * 100}
      
      Keep sharing to unlock more rewards!
      
      Best regards,
      The PawMe Team
      
      Follow us: @pawme on all social media
      ===========================================================
    `);
    
    // TODO: Integrate with email service
    // Example for Resend (you'll need to install resend and add API key):
    /*
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'PawMe <pawme@ayvalabs.com>',
      to: toEmail,
      subject: '🎉 You\'ve earned points! Someone joined using your referral link',
      html: `
        <h2>Hi ${userName},</h2>
        <p>Great news! Someone just signed up using your referral link.</p>
        <h3>Your Stats:</h3>
        <ul>
          <li>Total Referrals: ${referralCount}</li>
          <li>Points Earned: ${referralCount * 100}</li>
        </ul>
        <p>Keep sharing to unlock more rewards!</p>
        <p>Best regards,<br>The PawMe Team</p>
        <p>Follow us: @pawme on all social media</p>
      `
    });
    */
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Send email error: ${message}`);
  }
}

async function sendWelcomeEmail(toEmail: string, userName: string, referralCode: string): Promise<void> {
  try {
    console.log(`
      ==================== WELCOME EMAIL ====================
      To: ${toEmail}
      From: pawme@ayvalabs.com
      Subject: 🐾 Welcome to PawMe! Your referral link is ready
      
      Hi ${userName},
      
      Welcome to the PawMe community! We're excited to have you on board.
      
      Your unique referral code: ${referralCode}
      
      Share this link with friends and family:
      ${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '')}?ref=${referralCode}
      
      Earn rewards:
      - 100 points per successful referral
      - Exclusive early bird perks
      - Move up the leaderboard
      
      PawMe launches on Kickstarter in March 2026!
      
      Best regards,
      The PawMe Team @ Ayva Labs Limited
      
      Follow us: @pawme on all social media
      ======================================================
    `);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Send welcome email error: ${message}`);
  }
}

async function sendPriorityConfirmationEmail(toEmail: string, userName: string): Promise<void> {
  try {
    console.log(`
      ==================== PRIORITY CONFIRMATION EMAIL ====================
      To: ${toEmail}
      From: pawme@ayvalabs.com
      Subject: 👑 Welcome to the PawMe Priority List!
      
      Hi ${userName},
      
      Congratulations! You're now on the PawMe Priority List! 🎉
      
      Your Priority Benefits:
      ✅ 24-hour early access to Kickstarter launch
      ✅ Guaranteed early bird pricing
      ✅ Limited edition priority badge
      ✅ VIP updates and behind-the-scenes content
      ✅ Priority customer support
      ✅ 200 bonus points added to your account
      
      You've secured your spot for the best possible PawMe experience!
      
      Kickstarter Launch: March 2026
      
      We'll send you exclusive updates as we get closer to launch.
      
      Thank you for being part of our journey!
      
      Best regards,
      The PawMe Team @ Ayva Labs Limited
      
      Follow us: @pawme on all social media
      =====================================================================
    `);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Send priority confirmation email error: ${message}`);
  }
}

// ==================== EMAIL CAMPAIGN ROUTES ====================

// Priority List Upgrade
app.post("/make-server-f2b924d9/priority-upgrade", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { userId, paymentMethod } = await c.req.json();

    if (userId !== user.id) {
      return c.json({ error: "Unauthorized - User ID mismatch" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Check if already priority
    if (profile.isPriority) {
      return c.json({ error: "User is already on priority list" }, 400);
    }

    // In production, this would integrate with Stripe or similar payment processor
    // For now, we'll simulate a successful payment
    console.log(`
      ==================== PRIORITY UPGRADE PAYMENT ====================
      User: ${profile.email}
      Amount: $1.00
      Card Last 4: ${paymentMethod.cardLast4}
      Cardholder: ${paymentMethod.cardholderName}
      Status: SUCCESS (simulated)
      ==================================================================
    `);

    // Update user profile to priority status
    profile.isPriority = true;
    profile.priorityUpgradeDate = new Date().toISOString();
    profile.points = (profile.points || 0) + 200; // Bonus points for priority upgrade
    
    await kv.set(`user:${user.id}`, profile);

    // Send priority confirmation email
    await sendPriorityConfirmationEmail(profile.email, profile.name);

    return c.json({ 
      success: true,
      profile,
      message: "Successfully upgraded to priority list"
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Priority upgrade error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Send email to a user (admin only - add proper auth in production)
app.post("/make-server-f2b924d9/email/send", async (c) => {
  try {
    const { to, subject, message, type } = await c.req.json();
    
    console.log(`
      ==================== CAMPAIGN EMAIL ====================
      To: ${to}
      From: pawme@ayvalabs.com
      Subject: ${subject}
      Type: ${type || 'campaign'}
      
      ${message}
      
      Follow us: @pawme on all social media
      ======================================================
    `);
    
    return c.json({ success: true, message: 'Email logged (integrate email service for production)' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Send campaign email error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

// Broadcast email to all users (admin only)
app.post("/make-server-f2b924d9/email/broadcast", async (c) => {
  try {
    const { subject, message } = await c.req.json();
    
    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    
    console.log(`Broadcasting email to ${allUsers.length} users`);
    
    for (const user of allUsers) {
      console.log(`
        ==================== BROADCAST EMAIL ====================
        To: ${user.email}
        From: pawme@ayvalabs.com
        Subject: ${subject}
        
        Hi ${user.name},
        
        ${message}
        
        Best regards,
        The PawMe Team @ Ayva Labs Limited
        
        Follow us: @pawme on all social media
        ========================================================
      `);
    }
    
    return c.json({ 
      success: true, 
      message: `Email broadcast logged for ${allUsers.length} users`,
      count: allUsers.length 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Broadcast email error: ${message}`);
    return c.json({ error: message }, 500);
  }
});

Deno.serve(app.fetch);