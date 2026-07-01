'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FOOD_GAME_DECK } from '@/lib/food-game-deck';
import type { FoodCard, SwipeAnswer } from '@/lib/game-types';

const APP_STORE_URL = 'https://apps.apple.com/app/id6758856073';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme';
const ROUND_SIZE = 10;
const SWIPE_THRESHOLD = 75;   // px drag required to trigger a choice
const FLY_MS = 280;           // card fly-off animation duration
const REVEAL_MS = 1800;       // time to show result before auto-advancing

type Phase = 'intro' | 'playing' | 'reveal' | 'done';

function pickRound(): FoodCard[] {
  const shuffled = [...FOOD_GAME_DECK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(ROUND_SIZE, shuffled.length));
}

function genAnonId(): string {
  // Cookie/localStorage anon ID — stable per browser, no Firebase signup.
  if (typeof window === 'undefined') return 'anon';
  const KEY = 'pawme_play_anon';
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `anon_${Date.now()}`;
  }
}

function detectPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function postEvent(event: string, payload: Record<string, unknown>) {
  // Fire-and-forget — never block the UI on analytics.
  try {
    fetch('/api/web/game/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {});
    // Also fire gtag if present (when the GA4 snippet is on the page).
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, payload);
    }
  } catch {
    /* analytics is best-effort */
  }
}

interface Props {
  initialRef?: string;
}

export default function FoodSwipeWebGame({ initialRef }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [deck, setDeck] = useState<FoodCard[]>(() => pickRound());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<{ card: FoodCard; correct: boolean } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Drag / swipe state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyDir, setFlyDir] = useState<'left' | 'right' | null>(null);

  // Refs for stable timers (avoid stale closures)
  const indexRef = useRef(0);
  const scoreRef = useRef(0);
  const deckRef = useRef(deck);
  const refRef = useRef<string | undefined>(initialRef);
  const anonIdRef = useRef<string>('');
  const playedFiredRef = useRef(false);
  const dragStartX = useRef(0);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { deckRef.current = deck; }, [deck]);

  useEffect(() => {
    anonIdRef.current = genAnonId();
    return () => {
      if (flyTimer.current) clearTimeout(flyTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  const current = deck[index];

  // Stable next — uses refs so timers always have fresh values
  const next = useCallback(() => {
    const nextIdx = indexRef.current + 1;
    if (nextIdx >= deckRef.current.length) {
      postEvent('web_game_completed', {
        ref: refRef.current,
        anonId: anonIdRef.current,
        score: scoreRef.current,
      });
      setPhase('done');
      return;
    }
    setIndex(nextIdx);
    setLastResult(null);
    setDragX(0);
    setFlyDir(null);
    setPhase('playing');
  }, []);

  const start = useCallback(() => {
    if (flyTimer.current) clearTimeout(flyTimer.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    const newDeck = pickRound();
    deckRef.current = newDeck;
    indexRef.current = 0;
    scoreRef.current = 0;
    setDeck(newDeck);
    setIndex(0);
    setScore(0);
    setLastResult(null);
    setPhase('playing');
    setShareUrl(null);
    setCopied(false);
    setDragX(0);
    setFlyDir(null);
    setSharing(false);
    if (!playedFiredRef.current) {
      playedFiredRef.current = true;
      postEvent('web_game_played', { ref: refRef.current, anonId: anonIdRef.current });
    }
  }, []);

  const choose = useCallback((guess: SwipeAnswer, dir: 'left' | 'right') => {
    if (!current || phase !== 'playing' || flyDir !== null) return;
    const correct = guess === current.answer;
    if (correct) {
      scoreRef.current += 1;
      setScore(s => s + 1);
    }
    const captured = current;
    setIsDragging(false);
    setFlyDir(dir);

    flyTimer.current = setTimeout(() => {
      setLastResult({ card: captured, correct });
      setPhase('reveal');
      setFlyDir(null);
      setDragX(0);
      revealTimer.current = setTimeout(next, REVEAL_MS);
    }, FLY_MS);
  }, [current, phase, flyDir, next]);

  // Pointer / touch drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'playing' || flyDir !== null) return;
    dragStartX.current = e.clientX;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [phase, flyDir]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || phase !== 'playing') return;
    setDragX(e.clientX - dragStartX.current);
  }, [isDragging, phase]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = e.clientX - dragStartX.current;
    if (dx > SWIPE_THRESHOLD) {
      choose('safe', 'right');
    } else if (dx < -SWIPE_THRESHOLD) {
      choose('avoid', 'left');
    } else {
      setDragX(0);
    }
  }, [isDragging, choose]);

  const onInstallClick = useCallback(() => {
    const platform = detectPlatform();
    postEvent('web_game_cta_click', { platform, score });
    window.location.href = platform === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
  }, [score]);

  const onShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    postEvent('web_game_share', { hasParent: !!refRef.current, score });
    try {
      let url = shareUrl;
      if (!url) {
        const res = await fetch('/api/web/game/invite/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentToken: refRef.current }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          alert(data.message || 'Could not create share link. Please try again.');
          setSharing(false);
          return;
        }
        url = data.url as string;
        setShareUrl(url);
      }
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
            title: 'Can your pet eat this? — PawMe',
            text: `I got ${scoreRef.current}/${deckRef.current.length} on PawMe's food safety game. Can you beat me? 🐾`,
            url: url!,
          });
          setSharing(false);
          return;
        } catch { /* dismissed — show copy fallback below */ }
      }
    } catch {
      alert('Network error. Please try again.');
    }
    setSharing(false);
  }, [sharing, shareUrl, score]);

  const onCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }, [shareUrl]);

  const verdict = useMemo(() => {
    const pct = Math.round((score / Math.max(deck.length, 1)) * 100);
    if (pct >= 90) return 'Pet-parent legend! 🏆';
    if (pct >= 70) return 'Solid — your vet would approve. 👏';
    if (pct >= 50) return 'Not bad. Worth a refresher. 🐾';
    return 'Whoops. Definitely refresh your food know-how. 🥲';
  }, [score, deck.length]);

  // Derived card transform
  const cardTransform = flyDir === 'right'
    ? 'translateX(150%) rotate(22deg)'
    : flyDir === 'left'
    ? 'translateX(-150%) rotate(-22deg)'
    : `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`;

  const cardTransition = flyDir
    ? `transform ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${FLY_MS}ms ease`
    : isDragging
    ? 'none'
    : 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';

  const safeOpacity = Math.min(1, Math.max(0, (dragX - 30) / 50));
  const avoidOpacity = Math.min(1, Math.max(0, (-dragX - 30) / 50));
  const glowColor = dragX > 40
    ? `rgba(76,175,80,${Math.min(0.5, (dragX - 40) / 80)})`
    : dragX < -40
    ? `rgba(226,85,61,${Math.min(0.5, (-dragX - 40) / 80)})`
    : 'transparent';

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.brandBar}>
          <span aria-hidden>🐾</span>
          <span style={styles.brandText}>PawMe</span>
        </div>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <>
            <div style={styles.bigEmoji}>🍫</div>
            <h1 style={styles.h1}>Can your pet eat this?</h1>
            <p style={styles.subtitle}>
              10 foods. Swipe <strong>right if SAFE</strong>, left if AVOID. How well do you really know?
            </p>
            <div style={styles.swipeHints}>
              <span style={styles.hintAvoid}>✕ Avoid</span>
              <span style={styles.hintSafe}>Safe ✓</span>
            </div>
            <button onClick={start} style={styles.primaryBtn}>Play</button>
          </>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && current && (
          <>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(index / deck.length) * 100}%` }} />
            </div>
            <p style={styles.cardCounter}>{index + 1} / {deck.length}</p>

            {/* Card stack */}
            <div style={styles.stackWrap}>
              {/* Peek card behind */}
              {deck[index + 1] && (
                <div style={styles.peekCard}>
                  <div style={{ fontSize: 64 }}>{deck[index + 1].emoji}</div>
                </div>
              )}

              {/* Draggable card */}
              <div
                style={{
                  ...styles.swipeCard,
                  transform: cardTransform,
                  transition: cardTransition,
                  opacity: flyDir ? 0 : 1,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  boxShadow: `0 12px 40px ${glowColor}, 0 4px 20px rgba(0,0,0,0.10)`,
                  border: `2px solid ${dragX > 40 ? 'rgba(76,175,80,0.5)' : dragX < -40 ? 'rgba(226,85,61,0.5)' : 'transparent'}`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { setIsDragging(false); setDragX(0); }}
              >
                {/* SAFE overlay */}
                <div style={{ ...styles.swipeOverlay, ...styles.safeOverlay, opacity: safeOpacity }}>
                  <span style={styles.overlayText}>SAFE ✓</span>
                </div>
                {/* AVOID overlay */}
                <div style={{ ...styles.swipeOverlay, ...styles.avoidOverlay, opacity: avoidOpacity }}>
                  <span style={styles.overlayText}>AVOID ✕</span>
                </div>

                <div style={{ fontSize: 96, lineHeight: 1 }}>{current.emoji}</div>
                <h2 style={styles.cardFood}>{current.food}</h2>
                <p style={styles.cardPrompt}>
                  Can your {current.species === 'both' ? 'pet' : current.species} eat this?
                </p>
              </div>
            </div>

            <div style={styles.swipeHints}>
              <span style={styles.hintAvoid}>← Avoid</span>
              <span style={styles.hintSafe}>Safe →</span>
            </div>

            {/* Button fallbacks for desktop */}
            <div style={styles.choiceRow}>
              <button
                onClick={() => choose('avoid', 'left')}
                style={{ ...styles.choiceBtn, ...styles.avoidBtn }}
                disabled={flyDir !== null}
              >✕ Avoid</button>
              <button
                onClick={() => choose('safe', 'right')}
                style={{ ...styles.choiceBtn, ...styles.safeBtn }}
                disabled={flyDir !== null}
              >✓ Safe</button>
            </div>
            <p style={styles.scoreInline}>Score: {score} / {index}</p>
          </>
        )}

        {/* ── REVEAL (auto-advances) ── */}
        {phase === 'reveal' && lastResult && (
          <div style={styles.revealWrap}>
            <div style={styles.bigEmoji}>{lastResult.card.emoji}</div>
            <h2 style={styles.h2}>{lastResult.card.food}</h2>
            <div style={{ ...styles.verdictPill, background: lastResult.card.answer === 'safe' ? '#4CAF50' : '#E2553D' }}>
              {lastResult.card.answer === 'safe' ? 'SAFE' : 'AVOID'}
            </div>
            <p style={styles.resultMsg}>{lastResult.correct ? '✅ Correct!' : '❌ Other way around'}</p>
            <p style={styles.why}>{lastResult.card.why}</p>
            {/* Depleting timer bar */}
            <div style={styles.timerTrack}>
              <div style={{ ...styles.timerBar, animationDuration: `${REVEAL_MS}ms` }} />
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <>
            <div style={styles.bigEmoji}>{score >= 7 ? '🏅' : score >= 5 ? '🐾' : '🍫'}</div>
            <h1 style={{ ...styles.h1, fontSize: 40 }}>{score} / {deck.length}</h1>
            <p style={styles.subtitle}>{verdict}</p>

            <button onClick={onInstallClick} style={styles.primaryBtn}>
              Get the app for YOUR pet&apos;s games
            </button>

            <button onClick={onShare} style={styles.shareBtn} disabled={sharing}>
              {sharing ? 'Generating link…' : '🔗  Share with a friend'}
            </button>

            {shareUrl && (
              <div style={styles.shareUrlRow}>
                <code style={styles.shareUrl}>{shareUrl}</code>
                <button onClick={onCopyLink} style={styles.copyBtn}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            )}

            <p style={styles.replayLine}>
              <button onClick={start} style={styles.linkBtn}>Play again</button>
            </p>
          </>
        )}

        <p style={styles.footer}>Made with PawMe · ayvalabs.com</p>
      </div>

      <style>{`
        @keyframes timerShrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FAF6F2 0%, #F4ECE3 100%)',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 16px 40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  brandBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-start',
    fontSize: 14,
    color: '#7A6D5F',
    marginBottom: 8,
  },
  brandText: { fontWeight: 700, color: '#F47B5A' },

  bigEmoji: { fontSize: 96, lineHeight: 1, margin: '8px 0 12px' },
  h1: { margin: '8px 0', fontSize: 28, fontWeight: 800, color: '#1E1810' },
  h2: { margin: '8px 0', fontSize: 22, fontWeight: 700, color: '#1E1810' },
  subtitle: { margin: '0 0 20px', fontSize: 15, lineHeight: 1.5, color: '#5C5246' },

  swipeHints: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 8px',
    marginBottom: 10,
    fontSize: 13,
    fontWeight: 600,
  },
  hintAvoid: { color: '#E2553D' },
  hintSafe:  { color: '#4CAF50' },

  progressBar: { height: 4, background: '#EBE3D8', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', background: '#F47B5A', transition: 'width 250ms ease' },
  cardCounter: { fontSize: 12, color: '#9C8E7F', margin: '4px 0 12px' },

  // Card stack
  stackWrap: {
    position: 'relative',
    height: 280,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekCard: {
    position: 'absolute',
    width: '88%',
    background: '#FAF6F2',
    borderRadius: 20,
    border: '1px solid #EBE3D8',
    padding: '24px 20px 16px',
    transform: 'scale(0.94) translateY(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  swipeCard: {
    position: 'relative',
    width: '100%',
    background: '#FAF6F2',
    borderRadius: 20,
    padding: '24px 20px 20px',
    zIndex: 1,
    userSelect: 'none',
    touchAction: 'none',
  },
  swipeOverlay: {
    position: 'absolute',
    top: 16,
    padding: '6px 14px',
    borderRadius: 10,
    pointerEvents: 'none',
  },
  safeOverlay: {
    right: 14,
    background: '#4CAF50',
    transform: 'rotate(10deg)',
  },
  avoidOverlay: {
    left: 14,
    background: '#E2553D',
    transform: 'rotate(-10deg)',
  },
  overlayText: {
    color: '#FFF',
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 1,
  },
  cardFood: { margin: '10px 0 4px', fontSize: 22, fontWeight: 700, color: '#1E1810' },
  cardPrompt: { margin: 0, fontSize: 13, color: '#7A6D5F', textTransform: 'capitalize' as const },

  choiceRow: { display: 'flex', gap: 10, marginBottom: 8, marginTop: 4 },
  choiceBtn: {
    flex: 1,
    padding: '14px 12px',
    borderRadius: 14,
    border: 'none',
    fontSize: 15,
    fontWeight: 700,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
  avoidBtn: { background: '#E2553D' },
  safeBtn:  { background: '#4CAF50' },
  scoreInline: { margin: '4px 0 0', fontSize: 12, color: '#9C8E7F' },

  // Reveal
  revealWrap: { padding: '4px 0' },
  verdictPill: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 999,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 13,
    marginTop: 6,
  },
  resultMsg: { margin: '12px 0 0', fontSize: 15, color: '#1E1810', fontWeight: 600 },
  why: { margin: '8px 0 16px', fontSize: 14, lineHeight: 1.55, color: '#5C5246' },
  timerTrack: { height: 3, background: '#EBE3D8', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  timerBar: {
    height: '100%',
    background: '#F47B5A',
    animation: 'timerShrink linear forwards',
    borderRadius: 2,
  },

  // Done / share
  primaryBtn: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: 'none',
    background: '#F47B5A',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 4,
  },
  shareBtn: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    border: '2px solid #F47B5A',
    background: '#FFFFFF',
    color: '#F47B5A',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 10,
  },
  shareUrlRow: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 },
  shareUrl: {
    flex: 1,
    padding: '10px 12px',
    background: '#FAF6F2',
    border: '1px solid #EBE3D8',
    borderRadius: 10,
    fontSize: 11,
    color: '#1E1810',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  copyBtn: {
    flexShrink: 0,
    padding: '10px 14px',
    background: '#1E1810',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#F47B5A',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  replayLine: { margin: '14px 0 0' },
  footer: { margin: '24px 0 0', fontSize: 11, textAlign: 'center' as const, color: '#9C8E7F' },
};
