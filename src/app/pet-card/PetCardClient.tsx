'use client';

import { useCallback, useRef, useState } from 'react';

interface PetAnalysis {
  breed: string;
  type: string;
  color: string;
  estimatedAge: string;
  gender: string;
  weight: string;
  careNotes: string;
  confidence: number;
}

const STYLES: { key: string; label: string; emoji: string }[] = [
  { key: 'renaissance', label: 'Renaissance', emoji: '🎨' },
  { key: 'superhero', label: 'Superhero', emoji: '🦸' },
  { key: 'astronaut', label: 'Astronaut', emoji: '🚀' },
  { key: 'watercolor', label: 'Watercolour', emoji: '💧' },
];

const KICKSTARTER_URL =
  'https://pawmebot.com?utm_source=pet-card&utm_medium=widget&utm_campaign=viral';
const APP_URL =
  'https://apps.apple.com/app/pawpilot-pet-parent-ai-copilot/id6764225799?utm_source=pet-card&utm_medium=widget&utm_campaign=viral';

type Step = 'upload' | 'analyzing' | 'style' | 'generating' | 'done';

export function PetCardClient() {
  const [step, setStep] = useState<Step>('upload');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [analysis, setAnalysis] = useState<PetAnalysis | null>(null);
  const [petName, setPetName] = useState<string>('');
  const [style, setStyle] = useState<string>('renaissance');
  const [cardUrl, setCardUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setPhotoDataUrl(dataUrl);
      setMimeType(file.type || 'image/jpeg');
      setStep('analyzing');

      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch('/api/pet-card/analyze', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || 'Something went wrong. Please try again.');
          setStep('upload');
          return;
        }
        setAnalysis(json.data as PetAnalysis);
        setStep('style');
      } catch {
        setError('Network error. Please try again.');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const generate = useCallback(async () => {
    if (!photoDataUrl || !analysis) return;
    setError('');
    setStep('generating');
    try {
      const res = await fetch('/api/pet-card/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photoDataUrl, mimeType, style }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || 'Could not create your card. Please try again.');
        setStep('style');
        return;
      }
      const composed = await composeCard(canvasRef.current, json.imageDataUrl, petName, analysis);
      setCardUrl(composed);
      setStep('done');
    } catch {
      setError('Network error while creating your card. Please try again.');
      setStep('style');
    }
  }, [photoDataUrl, mimeType, style, petName, analysis]);

  const download = useCallback(() => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `${(petName || 'pet').toLowerCase().replace(/\s+/g, '-')}-pawme-card.png`;
    a.click();
  }, [cardUrl, petName]);

  const share = useCallback(async () => {
    if (!cardUrl) return;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], 'pawme-pet-card.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My PawMe Pet Card',
          text: `Meet ${petName || 'my pet'}! Made with PawMe → pawmebot.com`,
        });
        return;
      }
    } catch {
      /* fall through to download */
    }
    download();
  }, [cardUrl, petName, download]);

  const reset = useCallback(() => {
    setStep('upload');
    setPhotoDataUrl('');
    setAnalysis(null);
    setPetName('');
    setCardUrl('');
    setError('');
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload */}
      {(step === 'upload' || step === 'analyzing') && (
        <label
          className={`block cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
            step === 'analyzing'
              ? 'border-indigo-300 bg-indigo-50/50'
              : 'border-indigo-300 bg-white/60 hover:bg-indigo-50/60'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={step === 'analyzing'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {step === 'analyzing' ? (
            <div className="text-indigo-700 font-semibold">
              <Spinner /> Reading your pet&apos;s photo…
            </div>
          ) : (
            <div>
              <div className="text-5xl">🐾</div>
              <div className="mt-3 text-lg font-bold text-zinc-800">
                Drop your pet&apos;s photo here
              </div>
              <div className="mt-1 text-sm text-zinc-500">or tap to choose · free · no signup</div>
            </div>
          )}
        </label>
      )}

      {/* Style picker */}
      {(step === 'style' || step === 'generating') && analysis && (
        <div className="rounded-3xl bg-white/70 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoDataUrl} alt="your pet" className="h-20 w-20 rounded-2xl object-cover" />
            )}
            <div>
              <div className="font-bold text-zinc-800">{analysis.breed}</div>
              <div className="text-sm text-zinc-500">
                {analysis.estimatedAge} · {analysis.weight}
              </div>
            </div>
          </div>

          <label className="mt-5 block text-sm font-semibold text-zinc-700">
            Your pet&apos;s name
            <input
              type="text"
              value={petName}
              maxLength={24}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="e.g. Biscuit"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-indigo-400"
            />
          </label>

          <div className="mt-5 text-sm font-semibold text-zinc-700">Pick a card style</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                disabled={step === 'generating'}
                className={`rounded-2xl border p-3 text-center transition ${
                  style === s.key
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-zinc-200 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="mt-1 text-xs font-medium text-zinc-700">{s.label}</div>
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={step === 'generating'}
            className="mt-6 w-full rounded-full bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {step === 'generating' ? (
              <span>
                <Spinner /> Painting {petName || 'your pet'}…
              </span>
            ) : (
              '✨ Create my pet card'
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {step === 'done' && cardUrl && (
        <div className="rounded-3xl bg-white/70 p-6 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${petName || 'Pet'} trading card`}
            className="mx-auto w-full max-w-sm rounded-2xl shadow-lg"
          />
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={share}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              📤 Share
            </button>
            <button
              onClick={download}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              ⬇ Download
            </button>
            <button
              onClick={reset}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              ↺ New card
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-indigo-50 p-4 text-sm text-zinc-700">
            Love {petName || 'your pet'}? Meet{' '}
            <a href={KICKSTARTER_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline">
              PawMe
            </a>
            , the AI companion robot that follows your pet around the home — on Kickstarter now.
            The{' '}
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline">
              PawPilot app
            </a>{' '}
            that powers it is live today.
          </div>
        </div>
      )}

      {/* Hidden canvas used to compose the final card */}
      <canvas ref={canvasRef} width={1080} height={1350} className="hidden" />
    </div>
  );
}

function Spinner() {
  return (
    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" />
  );
}

/**
 * Composes the final shareable card on a 1080x1350 canvas: AI portrait + pet
 * name + stat block + PawMe branding + pawmebot.com watermark. Returns a PNG
 * data URL. Drawing from a data-URL image keeps the canvas untainted so
 * toDataURL / toBlob (Download + Share) work everywhere.
 */
function composeCard(
  canvas: HTMLCanvasElement | null,
  portraitDataUrl: string,
  petName: string,
  analysis: PetAnalysis,
): Promise<string> {
  return new Promise((resolve) => {
    if (!canvas) return resolve(portraitDataUrl);
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(portraitDataUrl);

    const W = 1080;
    const H = 1350;
    const img = new Image();
    img.onload = () => {
      // Background gradient (PawMe periwinkle → violet)
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#6366f1');
      g.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Header
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '700 40px Poppins, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🐾 PAWME PET CARD', 70, 100);

      // Portrait panel
      const px = 70;
      const py = 150;
      const pw = W - 140;
      const ph = 720;
      roundRect(ctx, px, py, pw, ph, 32);
      ctx.save();
      ctx.clip();
      drawCover(ctx, img, px, py, pw, ph);
      ctx.restore();
      // panel border
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      roundRect(ctx, px, py, pw, ph, 32);
      ctx.stroke();

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '700 84px Poppins, system-ui, sans-serif';
      ctx.fillText((petName || analysis.breed).slice(0, 18), W / 2, py + ph + 110);

      // Breed subtitle
      ctx.font = '400 38px "PT Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(analysis.breed.slice(0, 30), W / 2, py + ph + 165);

      // Stat row
      const stats: [string, string][] = [
        ['AGE', analysis.estimatedAge || '—'],
        ['WEIGHT', analysis.weight || '—'],
        ['COAT', analysis.color || '—'],
      ];
      const rowY = py + ph + 230;
      const colW = (W - 140) / 3;
      stats.forEach(([label, value], i) => {
        const cx = 70 + colW * i + colW / 2;
        ctx.font = '700 26px Poppins, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(label, cx, rowY);
        ctx.font = '700 40px Poppins, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(value).slice(0, 14), cx, rowY + 50);
      });

      // Watermark
      ctx.font = '700 34px Poppins, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('pawmebot.com', W / 2, H - 50);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(portraitDataUrl);
    img.src = portraitDataUrl;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw an image with object-fit: cover semantics into a target rect. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
