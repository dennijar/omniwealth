/**
 * useNewsStream.ts
 *
 * Enterprise Event-Driven News Feed hook.
 *
 * Architecture:
 *  - A mock async emitter runs inside a useEffect, simulating the two
 *    event channels a real deployment would connect to:
 *
 *    1. STANDARD channel  — periodic "routine dump" of analyst commentary
 *       (fires every ~25–40 s with a jittered interval to avoid lock-step).
 *
 *    2. INTERRUPT channel — rare TIER_1 CRITICAL breaking-news events
 *       (fires once per lifecycle at a random 15–50 s delay, then idles).
 *
 * Priority Queue logic:
 *  - STANDARD items are appended to the tail of the feed (max cap: 50).
 *  - CRITICAL items are unshifted to position [0], triggering a 5-second
 *    flashAlert that freezes standard updates so the user sees the alert.
 *  - After the flashAlert window, standard updates resume automatically.
 *
 * In production, replace the mock emitter internals with:
 *   const ws = new WebSocket('wss://your-news-service/stream');
 *   ws.onmessage = (e) => dispatch(JSON.parse(e.data));
 */

import { useEffect, useRef, useCallback, useReducer } from 'react';

// ─── Public types ─────────────────────────────────────────────────────────────

export type NewsPriority = 'CRITICAL' | 'HIGH' | 'STANDARD';
export type NewsSentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsItemPayload {
  id: string;
  timestamp: number;      // Unix ms
  priority: NewsPriority;
  sentiment: NewsSentiment;
  headline: string;
  implication: string;    // Analyst paragraph
  source: string;
  watchSymbols: string[];
}

export interface FlashAlert {
  itemId: string;
  expiresAt: number;      // Unix ms
}

// ─── Internal state shape ─────────────────────────────────────────────────────

interface StreamState {
  feed: NewsItemPayload[];
  flashAlert: FlashAlert | null;
  paused: boolean;        // true while a CRITICAL flash is active
}

type StreamAction =
  | { type: 'APPEND'; item: NewsItemPayload }
  | { type: 'PREPEND_CRITICAL'; item: NewsItemPayload; expiresAt: number }
  | { type: 'CLEAR_FLASH' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

const MAX_FEED_SIZE = 50;

function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'APPEND': {
      // Ignore duplicates (idempotent on id)
      if (state.feed.some((n) => n.id === action.item.id)) return state;
      const newFeed = [action.item, ...state.feed].slice(0, MAX_FEED_SIZE);
      return { ...state, feed: newFeed };
    }
    case 'PREPEND_CRITICAL': {
      if (state.feed.some((n) => n.id === action.item.id)) return state;
      const newFeed = [action.item, ...state.feed].slice(0, MAX_FEED_SIZE);
      return {
        ...state,
        feed: newFeed,
        flashAlert: { itemId: action.item.id, expiresAt: action.expiresAt },
        paused: true,
      };
    }
    case 'CLEAR_FLASH':
      return { ...state, flashAlert: null, paused: false };
    case 'PAUSE':
      return { ...state, paused: true };
    case 'RESUME':
      return { ...state, paused: false };
    default:
      return state;
  }
}

// ─── Mock payload banks ───────────────────────────────────────────────────────

const STANDARD_POOL: Omit<NewsItemPayload, 'id' | 'timestamp'>[] = [
  {
    priority:  'STANDARD',
    sentiment: 'neutral',
    source:    'OmniWealth Macro Desk',
    headline:  'Fed Officials Keep Door Open to Q3 Rate Cut as Core PCE Cools to 2.6% YoY',
    implication:
      'The Fed\'s data-dependent posture signals no imminent cut, but a declining PCE trajectory removes the risk of a hike. Short-term yields should ease modestly; watch 2-year Treasuries. USD strength may soften, creating tailwinds for commodities priced in dollars — Gold and Copper could find buyers near current support levels.',
    watchSymbols: ['XAU/USD', 'USD/IDR', 'NVDA', 'MSFT'],
  },
  {
    priority:  'HIGH',
    sentiment: 'bullish',
    source:    'OmniWealth Crypto Intelligence',
    headline:  'Bitcoin ETF Net Inflows Extend 9-Day Streak; BlackRock IBIT Absorbs 4,200 BTC in Single Session',
    implication:
      'Sustained institutional ETF inflows are the strongest structural support driver for BTC since spot approval. Each day of net positive flow tightens available float on exchanges. Historically, 10+ day inflow streaks have preceded a 15–25% price appreciation phase over the following 3–4 weeks.',
    watchSymbols: ['BTC', 'ETH', 'SOL', 'COIN'],
  },
  {
    priority:  'STANDARD',
    sentiment: 'bearish',
    source:    'OmniWealth Energy & Commodities',
    headline:  'WTI Crude Slides 2.1% on Surprise EIA Inventory Build of +5.8M Barrels; OPEC+ Meeting Awaited',
    implication:
      'A sizeable inventory build signals weaker-than-expected US demand and softens OPEC+ pricing power. WTI technicals now point toward the $77–$78 support band. Energy sector equities (XOM, MEDC) are vulnerable to near-term multiple compression.',
    watchSymbols: ['WTI', 'NATGAS', 'XOM', 'MEDC'],
  },
  {
    priority:  'HIGH',
    sentiment: 'bullish',
    source:    'OmniWealth IDX Desk',
    headline:  'Amman Mineral (AMMN) Reports Record Quarterly Output; Copper Production Up 31% QoQ on New Smelter Ramp',
    implication:
      'AMMN\'s production ramp validates its capital expenditure cycle and reduces unit-cost pressure. With copper prices holding above $3.85/lb globally, incremental output translates directly to EBITDA expansion. Expect sell-side upgrades and price target revisions in the next 48 hours.',
    watchSymbols: ['AMMN', 'INCO', 'BRPT', 'COPPER'],
  },
  {
    priority:  'STANDARD',
    sentiment: 'bearish',
    source:    'OmniWealth FX Strategy',
    headline:  'EUR/USD Breaks Below 1.0850 Key Support on Deteriorating German PMI; ECB Cut Bets Rise to 98bps by Year-End',
    implication:
      'The EUR/USD breakdown below 1.0850 is technically significant — this level acted as support across Q1. The next meaningful floor is 1.0720, corresponding to the October 2023 low. Dollar strength from this dynamic is modestly supportive for USD/IDR.',
    watchSymbols: ['EUR/USD', 'USD/IDR', 'XAU/USD', 'GBP/USD'],
  },
  {
    priority:  'HIGH',
    sentiment: 'bullish',
    source:    'OmniWealth Tech Desk',
    headline:  'Palantir Wins $480M US Army AI Contract Extension; Management Raises Annual AIP Revenue Guidance by 22%',
    implication:
      'Government contract extensions provide high-visibility, recurring revenue — a critical re-rating catalyst for Palantir\'s multiple. At current prices, PLTR trades at roughly 22x forward revenues; an upgrade cycle from analysts tracking government IT spend could push this to 28–30x.',
    watchSymbols: ['PLTR', 'AMD', 'MSFT', 'NVDA'],
  },
  {
    priority:  'STANDARD',
    sentiment: 'neutral',
    source:    'OmniWealth Risk Monitor',
    headline:  'Asia Open: Banks Bid, Exporters Mixed; FX Stabilizes as Dollar Momentum Pauses Ahead of CPI Print',
    implication:
      'Thin order books at the Asia open amplify price swings. USD/IDR is consolidating in the Rp 15,780–15,860 range — a clean break above 15,900 would invite BI intervention speculation. Domestic bank stocks (BBCA, BMRI) remain resilient on NIM expansion narratives.',
    watchSymbols: ['USD/IDR', 'BBCA', 'BMRI', 'BBRI'],
  },
];

const CRITICAL_POOL: Omit<NewsItemPayload, 'id' | 'timestamp'>[] = [
  {
    priority:  'CRITICAL',
    sentiment: 'bearish',
    source:    'WIRE FLASH — Reuters / Bloomberg',
    headline:  '[FLASH] FOMC Emergency Statement Leaked: Discussion of 50bps Emergency Hike Amid Inflation Spike',
    implication:
      'UNVERIFIED — If confirmed, this represents the most hawkish Fed pivot in 25 years. Equities would face severe multiple compression across all sectors. Gold would initially sell off on USD strength before reversing as recession fears mount. Crypto highly vulnerable — BTC could retest $50K range rapidly. Traders are advised to reduce risk immediately pending official confirmation from the Fed chair or official FOMC communique.',
    watchSymbols: ['BTC', 'ETH', 'XAU/USD', 'NVDA', 'JPM', 'USD/IDR'],
  },
  {
    priority:  'CRITICAL',
    sentiment: 'bullish',
    source:    'WIRE FLASH — Nikkei Asia',
    headline:  '[FLASH] Bank Indonesia Surprises Markets with 50bps Emergency Rate Cut; Rupiah Surges',
    implication:
      'An emergency BI rate cut would signal extreme concern over economic slowdown and is typically followed by fiscal stimulus announcements. IDR would initially weaken on yield differential narrowing before recovering. IHSG financials (BBCA, BMRI) could re-rate higher on cheaper funding costs. Infrastructure and property plays (PGAS, BREN) are key beneficiaries of lower rates. Watch for capital flow reversals from foreigners who may exit IDR bonds.',
    watchSymbols: ['USD/IDR', 'BBCA', 'BMRI', 'BREN', 'PGAS'],
  },
];

// ─── ID generator ─────────────────────────────────────────────────────────────

let _seq = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const FLASH_DURATION_MS = 5_000;

export function useNewsStream() {
  const [state, dispatch] = useReducer(streamReducer, {
    feed:       STANDARD_POOL.map((p, i) => ({
      ...p,
      id:        `seed-${i}`,
      timestamp: Date.now() - (STANDARD_POOL.length - i) * 3 * 60_000, // stagger backwards
    })),
    flashAlert: null,
    paused:     false,
  });

  // Stable ref so the emitter callbacks never stale-close over old state
  const pausedRef       = useRef(state.paused);
  const mountedRef      = useRef(true);
  const usedCriticalRef = useRef(new Set<number>());   // which CRITICAL_POOL indices fired

  // Keep pausedRef in sync
  useEffect(() => { pausedRef.current = state.paused; }, [state.paused]);

  // Flash auto-clear
  useEffect(() => {
    if (!state.flashAlert) return;
    const remaining = state.flashAlert.expiresAt - Date.now();
    if (remaining <= 0) { dispatch({ type: 'CLEAR_FLASH' }); return; }
    const t = setTimeout(() => {
      if (mountedRef.current) dispatch({ type: 'CLEAR_FLASH' });
    }, remaining);
    return () => clearTimeout(t);
  }, [state.flashAlert]);

  // Standard emitter — fires every 25–40 s with jitter
  const scheduleStandard = useCallback(() => {
    const delay = 25_000 + Math.random() * 15_000;
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      if (!pausedRef.current) {
        const pick = STANDARD_POOL[Math.floor(Math.random() * STANDARD_POOL.length)];
        dispatch({
          type: 'APPEND',
          item: { ...pick, id: nextId('std'), timestamp: Date.now() },
        });
      }
      scheduleStandard();         // re-arm
    }, delay);
    return t;
  }, []);

  // Critical interrupt — fires once at a random 15–50 s window
  const scheduleCritical = useCallback(() => {
    const availableIndices = CRITICAL_POOL
      .map((_, i) => i)
      .filter((i) => !usedCriticalRef.current.has(i));

    if (availableIndices.length === 0) return undefined;

    const delay = 15_000 + Math.random() * 35_000;
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      const idx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      usedCriticalRef.current.add(idx);
      const pick = CRITICAL_POOL[idx];
      const expiresAt = Date.now() + FLASH_DURATION_MS;
      dispatch({
        type: 'PREPEND_CRITICAL',
        item: { ...pick, id: nextId('crit'), timestamp: Date.now() },
        expiresAt,
      });
    }, delay);
    return t;
  }, []);

  // Mount / unmount lifecycle
  useEffect(() => {
    mountedRef.current = true;

    const stdTimer  = scheduleStandard();
    const critTimer = scheduleCritical();

    return () => {
      mountedRef.current = false;
      clearTimeout(stdTimer);
      if (critTimer !== undefined) clearTimeout(critTimer);
    };
  }, [scheduleStandard, scheduleCritical]);

  return {
    feed:       state.feed,
    flashAlert: state.flashAlert,
  } as const;
}
