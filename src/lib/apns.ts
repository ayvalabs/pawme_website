import crypto from 'crypto';

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_KEY_CONTENT = process.env.APNS_KEY_CONTENT!;

// APNs endpoints
const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// Your app's bundle ID from App Store Connect
const BUNDLE_ID = 'ai.ayvalabs.pawme';

/**
 * Create a JWT token for APNs authentication using ES256 (P-256 + SHA-256).
 * Token is valid for up to 1 hour per Apple's spec.
 */
function createAPNsJWT(): string {
  const header = {
    alg: 'ES256',
    kid: APNS_KEY_ID,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APNS_TEAM_ID,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Clean the key content — remove surrounding quotes if present
  const cleanKey = APNS_KEY_CONTENT.replace(/^"|"$/g, '').trim();

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const privateKey = crypto.createPrivateKey({
    key: cleanKey,
    format: 'pem',
  });

  // Sign and convert DER signature to raw r||s format for ES256
  const derSignature = sign.sign(privateKey);
  const rawSignature = derToRaw(derSignature);
  const encodedSignature = base64UrlEncode(rawSignature);

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Convert DER-encoded ECDSA signature to raw r||s (64 bytes).
 */
function derToRaw(derSig: Buffer): Buffer {
  // DER: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
  let offset = 2; // skip 0x30 and total length
  
  // Read r
  offset++; // skip 0x02
  let rLen = derSig[offset++];
  let r = derSig.subarray(offset, offset + rLen);
  offset += rLen;

  // Read s
  offset++; // skip 0x02
  let sLen = derSig[offset++];
  let s = derSig.subarray(offset, offset + sLen);

  // Pad or trim to 32 bytes each
  r = padOrTrim(r, 32);
  s = padOrTrim(s, 32);

  return Buffer.concat([r, s]);
}

function padOrTrim(buf: Buffer, len: number): Buffer {
  if (buf.length === len) return buf;
  if (buf.length > len) return buf.subarray(buf.length - len);
  const padded = Buffer.alloc(len);
  buf.copy(padded, len - buf.length);
  return padded;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Cache the JWT token (valid for ~50 minutes, refresh before 1 hour)
let cachedToken: string | null = null;
let cachedTokenTime = 0;
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes

function getAPNsToken(): string {
  const now = Date.now();
  if (!cachedToken || now - cachedTokenTime > TOKEN_REFRESH_INTERVAL) {
    cachedToken = createAPNsJWT();
    cachedTokenTime = now;
  }
  return cachedToken;
}

export interface APNsNotification {
  deviceToken: string;
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  /** Use 'alert' for visible notifications, 'background' for silent */
  pushType?: 'alert' | 'background';
}

export interface APNsSendResult {
  deviceToken: string;
  success: boolean;
  statusCode?: number;
  reason?: string;
}

/**
 * Send a push notification via APNs HTTP/2.
 * Uses fetch (available in Node 18+/Next.js runtime).
 */
export async function sendAPNsNotification(
  notification: APNsNotification,
  sandbox = false,
): Promise<APNsSendResult> {
  const host = sandbox ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;
  const url = `https://${host}/3/device/${notification.deviceToken}`;
  const token = getAPNsToken();

  const pushType = notification.pushType || 'alert';

  const apsPayload: any = {
    alert: {
      title: notification.title,
      body: notification.body,
    },
    sound: notification.sound || 'default',
  };

  if (notification.badge !== undefined) {
    apsPayload.badge = notification.badge;
  }

  const payload: any = { aps: apsPayload };

  // Merge custom data into the top-level payload
  if (notification.data) {
    Object.assign(payload, notification.data);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${token}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': pushType,
        'apns-priority': pushType === 'alert' ? '10' : '5',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200) {
      return { deviceToken: notification.deviceToken, success: true, statusCode: 200 };
    }

    const errorBody = await response.json().catch(() => ({}));
    console.error(`[APNs] Error ${response.status} for token ${notification.deviceToken.substring(0, 8)}...:`, errorBody);

    return {
      deviceToken: notification.deviceToken,
      success: false,
      statusCode: response.status,
      reason: (errorBody as any)?.reason || `HTTP ${response.status}`,
    };
  } catch (error: any) {
    console.error(`[APNs] Network error for token ${notification.deviceToken.substring(0, 8)}...:`, error.message);
    return {
      deviceToken: notification.deviceToken,
      success: false,
      reason: error.message || 'Network error',
    };
  }
}

/**
 * Send notifications to multiple device tokens.
 */
export async function sendAPNsNotifications(
  notifications: APNsNotification[],
  sandbox = false,
): Promise<APNsSendResult[]> {
  const results = await Promise.allSettled(
    notifications.map((n) => sendAPNsNotification(n, sandbox)),
  );

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { deviceToken: '', success: false, reason: 'Promise rejected' },
  );
}

/**
 * Validate that all required APNs environment variables are set.
 */
export function validateAPNsConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!APNS_KEY_ID) missing.push('APNS_KEY_ID');
  if (!APNS_TEAM_ID) missing.push('APNS_TEAM_ID');
  if (!APNS_KEY_CONTENT) missing.push('APNS_KEY_CONTENT');
  return { valid: missing.length === 0, missing };
}
