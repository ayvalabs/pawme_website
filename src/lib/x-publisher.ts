/**
 * X (Twitter) Publisher using OAuth 1.0a
 * Handles posting tweets with text and media
 */
import crypto from 'crypto';

const X_API_KEY = process.env.X_API_KEY || '';
const X_API_SECRET = process.env.X_API_SECRET || '';
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || '';
const X_TOKEN_SECRET = process.env.X_TOKEN_SECRET || '';

interface OAuthParams {
  [key: string]: string;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function createSignatureBaseString(
  method: string,
  url: string,
  params: OAuthParams
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
}

function createSignature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

function generateAuthHeader(method: string, url: string, extraParams: OAuthParams = {}): string {
  const oauthParams: OAuthParams = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...extraParams,
  };

  const allParams = { ...oauthParams };
  const baseString = createSignatureBaseString(method, url, allParams);
  const signature = createSignature(baseString, X_API_SECRET, X_TOKEN_SECRET);
  oauthParams.oauth_signature = signature;

  const authHeader = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${authHeader}`;
}

/**
 * Upload media to X (Twitter) using v1.1 media upload endpoint
 * Returns the media_id_string for use in tweets
 */
export async function uploadMediaToX(
  mediaBuffer: Buffer,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4'
): Promise<string> {
  if (!X_API_KEY || !X_API_SECRET) {
    throw new Error('X API Consumer Key/Secret not configured. Get them from developer.x.com');
  }

  const isVideo = mediaType.startsWith('video/');

  if (isVideo) {
    return uploadVideoToX(mediaBuffer, mediaType);
  }

  // Simple image upload using multipart/form-data
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

  const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n`),
    Buffer.from(mediaBuffer.toString('base64')),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const authHeader = generateAuthHeader('POST', uploadUrl);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`X media upload failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.media_id_string;
}

/**
 * Chunked upload for videos (required for files > 5MB)
 */
async function uploadVideoToX(
  mediaBuffer: Buffer,
  mediaType: string
): Promise<string> {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const totalBytes = mediaBuffer.length;

  // INIT
  const initParams = new URLSearchParams({
    command: 'INIT',
    total_bytes: totalBytes.toString(),
    media_type: mediaType,
    media_category: 'tweet_video',
  });

  let authHeader = generateAuthHeader('POST', uploadUrl);
  let response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: initParams.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`X video INIT failed: ${response.status} ${err}`);
  }

  const initData = await response.json();
  const mediaId = initData.media_id_string;

  // APPEND - upload in 5MB chunks
  const chunkSize = 5 * 1024 * 1024;
  let segmentIndex = 0;

  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    const chunk = mediaBuffer.subarray(offset, Math.min(offset + chunkSize, totalBytes));
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="command"\r\n\r\nAPPEND\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_id"\r\n\r\n${mediaId}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="segment_index"\r\n\r\n${segmentIndex}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n`),
      Buffer.from(chunk.toString('base64')),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    authHeader = generateAuthHeader('POST', uploadUrl);
    response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`X video APPEND failed (segment ${segmentIndex}): ${response.status} ${err}`);
    }

    segmentIndex++;
  }

  // FINALIZE
  const finalizeParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId,
  });

  authHeader = generateAuthHeader('POST', uploadUrl);
  response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: finalizeParams.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`X video FINALIZE failed: ${response.status} ${err}`);
  }

  const finalizeData = await response.json();

  // Check processing status for videos
  if (finalizeData.processing_info) {
    await waitForProcessing(mediaId);
  }

  return mediaId;
}

async function waitForProcessing(mediaId: string): Promise<void> {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusUrl = `${uploadUrl}?command=STATUS&media_id=${mediaId}`;
    const authHeader = generateAuthHeader('GET', statusUrl);

    const response = await fetch(statusUrl, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) break;

    const data = await response.json();
    const state = data.processing_info?.state;

    if (state === 'succeeded') return;
    if (state === 'failed') {
      throw new Error(`X video processing failed: ${JSON.stringify(data.processing_info.error)}`);
    }

    attempts++;
  }
}

/**
 * Post a tweet with optional media
 */
export async function postTweet(
  text: string,
  mediaIds: string[] = [],
  replyToTweetId?: string
): Promise<{ id: string; text: string }> {
  if (!X_API_KEY || !X_API_SECRET) {
    throw new Error('X API Consumer Key/Secret not configured. Get them from developer.x.com');
  }

  const tweetUrl = 'https://api.x.com/2/tweets';
  const body: any = { text };

  if (mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  if (replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: replyToTweetId };
  }

  const authHeader = generateAuthHeader('POST', tweetUrl);

  const response = await fetch(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`X tweet post failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { id: data.data.id, text: data.data.text };
}
