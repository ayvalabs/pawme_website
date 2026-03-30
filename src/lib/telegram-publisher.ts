/**
 * Telegram Channel Publisher
 * Posts messages and media to the PawMe Telegram channel
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.PAWMEROBOTO_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramResult {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number; title: string };
  };
  description?: string;
}

/**
 * Send a text message to the Telegram channel
 */
export async function sendTelegramMessage(
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram not configured - skipping');
    return null;
  }

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL_ID,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false,
    }),
  });

  const data: TelegramResult = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${data.description}`);
  }

  return data.result?.message_id || null;
}

/**
 * Send a photo to the Telegram channel
 */
export async function sendTelegramPhoto(
  photoUrl: string,
  caption: string
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram not configured - skipping');
    return null;
  }

  const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL_ID,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    }),
  });

  const data: TelegramResult = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram sendPhoto failed: ${data.description}`);
  }

  return data.result?.message_id || null;
}

/**
 * Send a video to the Telegram channel
 */
export async function sendTelegramVideo(
  videoUrl: string,
  caption: string
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram not configured - skipping');
    return null;
  }

  const response = await fetch(`${TELEGRAM_API}/sendVideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL_ID,
      video: videoUrl,
      caption,
      parse_mode: 'HTML',
      supports_streaming: true,
    }),
  });

  const data: TelegramResult = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram sendVideo failed: ${data.description}`);
  }

  return data.result?.message_id || null;
}

/**
 * Send a media group (multiple photos/videos) to the Telegram channel
 */
export async function sendTelegramMediaGroup(
  mediaUrls: { url: string; type: 'photo' | 'video' }[],
  caption: string
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram not configured - skipping');
    return null;
  }

  const media = mediaUrls.map((item, index) => ({
    type: item.type,
    media: item.url,
    ...(index === 0 ? { caption, parse_mode: 'HTML' } : {}),
  }));

  const response = await fetch(`${TELEGRAM_API}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL_ID,
      media,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram sendMediaGroup failed: ${data.description}`);
  }

  return data.result?.[0]?.message_id || null;
}

/**
 * Convert X-style tweet text to Telegram HTML format
 * - Converts @mentions to links
 * - Converts #hashtags to searchable links
 * - Preserves line breaks
 */
export function formatForTelegram(tweetText: string): string {
  let text = tweetText;

  // Convert @mentions to X profile links
  text = text.replace(/@(\w+)/g, '<a href="https://x.com/$1">@$1</a>');

  // Convert #hashtags to X search links
  text = text.replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1">#$1</a>');

  // Convert URLs to links if not already
  text = text.replace(
    /(?<![">])(https?:\/\/[^\s<]+)/g,
    '<a href="$1">$1</a>'
  );

  return text;
}
