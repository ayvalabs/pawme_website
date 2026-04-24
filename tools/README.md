# Gemini diagnostic scripts

Use these to find out exactly why `/api/mobile/gemini-analyze` is returning
`breed: "Unknown"` instead of detecting the pet.

All scripts read `GEMINI_API_KEY` from `.env.local` (in this folder's parent)
so you don't need to export it separately.

## 1. Is the API key valid?

```bash
node tools/gemini-check-key.mjs
```

Lists every model reachable with your key. If this prints an error, your key
is the problem (rotated, wrong project, region-restricted, quota exhausted).

## 2. Which Gemini models actually work with your key?

```bash
# Use any pet image you have locally
node tools/gemini-test-vision.mjs ~/Downloads/puppy.jpg
```

Posts the image straight to Gemini (bypassing the Next route entirely) for each
model configured in `pawme-gemini.ts`. Per-model output tells you:

- ✅ HTTP 200 + parsed JSON → that model works end-to-end
- ⚠️  HTTP 200 but text is not JSON → model works, prompt needs tightening
- ⚠️  Prompt blocked (safety) → the image tripped a safety filter
- ❌ HTTP 4xx/5xx → model unavailable / key can't call that model

If every model fails, it's the key/region/quota. If some pass and some fail,
set `GEMINI_VISION_MODELS` in `.env.local` to just the passing ones:

```
GEMINI_VISION_MODELS=gemini-2.5-flash,gemini-1.5-flash
```

The new model-resolver in `pawme-gemini.ts` picks these up automatically.

## 3. Does the Next route itself work?

```bash
# Make sure `next dev` is running on localhost:3000 first.
node tools/gemini-test-analyze-route.mjs ~/Downloads/puppy.jpg
```

Posts through `/api/mobile/gemini-analyze` (same endpoint the mobile app calls).
The response prints with an `x-request-id` header — grep your Next.js terminal
for that ID to see every internal step:

- `[pawme-api] {...,"event":"start",...}` — request received
- `[pawme-api] {...,"event":"gemini-attempt-failed",...}` — per-model failures
- `[pawme-api] {...,"event":"gemini-attempt-ok",...}` — which model succeeded
- `[pawme-api] {...,"event":"done","model":"gemini-2.5-flash",...}` — final

If the tool says the response was the fallback, the `[pawme-gemini]` warnings
in the Next.js terminal will tell you exactly why.
