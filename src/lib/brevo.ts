const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_LIST_ID = 3;

interface BrevoContact {
  email: string;
  name: string;
  isVip: boolean;
  signupDate?: string;
  source?: string;
}

export async function syncContactToBrevo({
  email,
  name,
  isVip,
  signupDate,
  source = 'pawme-website',
}: BrevoContact): Promise<{ success: boolean; message?: string }> {
  if (!BREVO_API_KEY) {
    console.error('[Brevo] API key not configured');
    return { success: false, message: 'Brevo API key not configured' };
  }

  if (!email) {
    console.error('[Brevo] Email is required');
    return { success: false, message: 'Email is required' };
  }

  try {
    const payload = {
      email,
      attributes: {
        FIRSTNAME: name || 'PawMe User',
        SIGNUP_DATE: signupDate || new Date().toISOString().split('T')[0],
        VIP_STATUS: isVip,
        SOURCE: source,
      },
      listIds: [BREVO_LIST_ID],
      updateEnabled: true,
    };

    console.log('[Brevo] Syncing contact:', email, 'VIP:', isVip);

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      console.log('[Brevo] ✅ Contact added:', email);
      return { success: true, message: 'Contact added to Brevo' };
    } else if (response.status === 204) {
      console.log('[Brevo] ✅ Contact updated:', email);
      return { success: true, message: 'Contact updated in Brevo' };
    } else {
      const errorText = await response.text();
      console.error('[Brevo] ❌ Error:', response.status, errorText);
      return { success: false, message: `Brevo error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[Brevo] ❌ Request failed:', error.message);
    return { success: false, message: error.message };
  }
}
