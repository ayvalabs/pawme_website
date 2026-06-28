'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FOOD_GAME_DECK } from '@/lib/food-game-deck';
import type { FoodCard, SwipeAnswer } from '@/lib/game-types';

const APP_STORE_URL = 'https://apps.apple.com/app/id6758856073';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme';
const ROUND_SIZE = 10;

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

  // Track which ref attribution applies — preserved through the round.
  const refRef = useRef<string | undefined>(initialRef);
  const anonIdRef = useRef<string>('');
  const playedFiredRef = useRef(false);

  useEffect(() => {
    anonIdRef.current = genAnonId();
  }, []);

  const current = deck[index];

  const start = useCallback(() => {
    setDeck(pickRound());
    setIndex(0);
    setScore(0);
    setLastResult(null);
    setPhase('playing');
    setShareUrl(null);
    setCopied(false);
    // First-card-shown event (idempotent per page session).
    if (!playedFiredRef.current) {
      playedFiredRef.current = true;
      postEvent('web_game_played', {
        ref: refRef.current,
        anonId: anonIdRef.current,
      });
    }
  }, []);

  const choose = useCallback((guess: SwipeAnswer) => {
    if (!current) return;
    const correct = guess === current.answer;
    setLastResult({ card: current, correct });
    if (correct) setScore((s) => s + 1);
    setPhase('reveal');
  }, [current]);

  const next = useCallback(() => {
    const nextIdx = index + 1;
    if (nextIdx >= deck.length) {
      postEvent('web_game_completed', {
        ref: refRef.current,
        anonId: anonIdRef.current,
        score,
      });
      setPhase('done');
      return;
    }
    setIndex(nextIdx);
    setLastResult(null);
    setPhase('playing');
  }, [index, deck.length, score]);

  const onInstallClick = useCallback(() => {
    const platform = detectPlatform();
    postEvent('web_game_cta_click', { platform, score });
    const target = platform === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    window.location.href = target;
  }, [score]);

  const onChallengeFriend = useCallback(async () => {
    postEvent('web_game_share', { hasParent: !!refRef.current });
    try {
      const res = await fetch('/api/web/game/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentToken: refRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data.message || 'Could not create share link. Please try again.');
        return;
      }
      setShareUrl(data.url as string);
      // Try the native Web Share API on mobile when available.
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
            title: 'Beat my pet-food score',
            text: `I got ${score}/${deck.length} on PawMe. Can you beat me?`,
            url: data.url,
          });
          return;
        } catch {
          /* user dismissed, fall through to copy UI */
        }
      }
    } catch {
      alert('Network error. Please try again.');
    }
  }, [score, deck.length]);

  const onCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — show URL inline so user can copy manually */
    }
  }, [shareUrl]);

  const verdict = useMemo(() => {
    const pct = Math.round((score / Math.max(deck.length, 1)) * 100);
    if (pct >= 90) return 'Pet-parent legend! 🏆';
    if (pct >= 70) return 'Solid — your vet would approve. 👏';
    if (pct >= 50) return 'Not bad. Worth a refresher. 🐾';
    return 'Whoops. Definitely refresh your food know-how. 🥲';
  }, [score, deck.length]);

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.brandBar}>
          <span style={styles.pawDot} aria-hidden>🐾</span>
          <span style={styles.brandText}>PawMe</span>
        </div>

        {phase === 'intro' && (
          <>
            <div style={styles.bigEmoji}>🍫</div>
            <h1 style={styles.h1}>Can your pet eat this?</h1>
            <p style={styles.subtitle}>
              10 foods. Tap SAFE or AVOID. How well do you really know what&apos;s OK?
            </p>
            <button onClick={start} style={styles.primaryBtn}>Play</button>
          </>
        )}

        {phase === 'playing' && current && (
          <>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(index / deck.length) * 100}%` }} />
            </div>
            <p style={styles.cardCounter}>Card {index + 1} / {deck.length}</p>

            <div style={styles.gameCard}>
              <div style={styles.cardEmoji}>{current.emoji}</div>
              <h2 style={styles.cardFood}>{current.food}</h2>
              <p style={styles.cardPrompt}>
                Can your {current.species === 'both' ? 'pet' : current.species} eat this?
              </p>
            </div>

            <div style={styles.choiceRow}>
              <button onClick={() => choose('avoid')} style={{ ...styles.choiceBtn, ...styles.avoidBtn }}>
                ✕ Avoid
              </button>
              <button onClick={() => choose('safe')} style={{ ...styles.choiceBtn, ...styles.safeBtn }}>
                ✓ Safe
              </button>
            </div>
            <p style={styles.scoreInline}>Score: {score} / {Math.max(index, 0)}</p>
          </>
        )}

        {phase === 'reveal' && lastResult && (
          <>
            <div style={styles.bigEmoji}>{lastResult.card.emoji}</div>
            <h2 style={styles.h2}>{lastResult.card.food}</h2>
            <div style={{ ...styles.verdictPill, background: lastResult.card.answer === 'safe' ? '#4CAF50' : '#E2553D' }}>
              {lastResult.card.answer === 'safe' ? 'SAFE' : 'AVOID'}
            </div>
            <p style={styles.resultMsg}>{lastResult.correct ? '✅ You got it!' : '❌ Other way around'}</p>
            <p style={styles.why}>{lastResult.card.why}</p>
            <button onClick={next} style={styles.primaryBtn}>
              {index + 1 >= deck.length ? 'See score' : 'Next'}
            </button>
          </>
        )}

        {phase === 'done' && (
          <>
            <div style={styles.bigEmoji}>{score >= 7 ? '🏅' : score >= 5 ? '🐾' : '🍫'}</div>
            <h1 style={{ ...styles.h1, fontSize: 40 }}>{score} / {deck.length}</h1>
            <p style={styles.subtitle}>{verdict}</p>

            <button onClick={onInstallClick} style={styles.primaryBtn}>
              Get the app for YOUR pet&apos;s games
            </button>

            <div style={styles.shareBlock}>
              {!shareUrl ? (
                <button onClick={onChallengeFriend} style={styles.secondaryBtn}>
                  Challenge a friend
                </button>
              ) : (
                <>
                  <p style={styles.shareLabel}>Share this link with a friend:</p>
                  <div style={styles.shareUrlRow}>
                    <code style={styles.shareUrl}>{shareUrl}</code>
                    <button onClick={onCopyLink} style={styles.copyBtn}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <p style={styles.replayLine}>
              <button onClick={start} style={styles.linkBtn}>Play again</button>
            </p>
          </>
        )}

        <p style={styles.footer}>Made with PawMe · ayvalabs.com</p>
      </div>
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
  pawDot: { fontSize: 16 },
  brandText: { fontWeight: 700, color: '#F47B5A' },

  bigEmoji: { fontSize: 96, lineHeight: 1, margin: '8px 0 12px' },
  h1: { margin: '8px 0', fontSize: 28, fontWeight: 800, color: '#1E1810' },
  h2: { margin: '8px 0', fontSize: 22, fontWeight: 700, color: '#1E1810' },
  subtitle: { margin: '0 0 20px', fontSize: 15, lineHeight: 1.5, color: '#5C5246' },

  progressBar: { height: 4, background: '#EBE3D8', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#F47B5A', transition: 'width 200ms ease' },
  cardCounter: { fontSize: 12, color: '#9C8E7F', margin: '6px 0 16px' },

  gameCard: {
    background: '#FAF6F2',
    borderRadius: 16,
    padding: '28px 20px',
    border: '1px solid #EBE3D8',
    marginBottom: 16,
  },
  cardEmoji: { fontSize: 96, marginBottom: 8 },
  cardFood: { margin: '8px 0 4px', fontSize: 24, fontWeight: 700, color: '#1E1810' },
  cardPrompt: { margin: 0, fontSize: 14, color: '#7A6D5F', textTransform: 'capitalize' as const },

  choiceRow: { display: 'flex', gap: 12, marginBottom: 8 },
  choiceBtn: {
    flex: 1,
    padding: '16px 12px',
    borderRadius: 14,
    border: 'none',
    fontSize: 16,
    fontWeight: 700,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  avoidBtn: { background: '#E2553D' },
  safeBtn: { background: '#4CAF50' },
  scoreInline: { margin: '8px 0 0', fontSize: 12, color: '#9C8E7F' },

  verdictPill: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 999,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 13,
    marginTop: 6,
  },
  resultMsg: { margin: '12px 0 0', fontSize: 14, color: '#5C5246' },
  why: { margin: '8px 0 20px', fontSize: 14, lineHeight: 1.55, color: '#5C5246' },

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
  secondaryBtn: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #F47B5A',
    background: '#FFFFFF',
    color: '#F47B5A',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  shareBlock: { marginTop: 16 },
  shareLabel: { margin: '0 0 8px', fontSize: 13, color: '#5C5246' },
  shareUrlRow: { display: 'flex', gap: 8, alignItems: 'center' },
  shareUrl: {
    flex: 1,
    padding: '10px 12px',
    background: '#FAF6F2',
    border: '1px solid #EBE3D8',
    borderRadius: 10,
    fontSize: 12,
    color: '#1E1810',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
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
  replayLine: { margin: '12px 0 0' },

  footer: { margin: '24px 0 0', fontSize: 11, textAlign: 'center' as const, color: '#9C8E7F' },
};
