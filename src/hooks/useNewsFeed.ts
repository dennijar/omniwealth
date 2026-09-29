/**
 * useNewsFeed — real news first, clearly-labelled simulation as fallback.
 *
 * Data flow:
 *   1. GET /api/news  → Yahoo Finance news + CoinDesk RSS (serverless proxy)
 *   2. Success        → mode 'live', real headlines are shown
 *   3. Failure/empty  → mode 'simulated', the mock useNewsStream feed is
 *                       shown WITH AN EXPLICIT "SIMULASI" badge in the UI so
 *                       demo content can never be mistaken for real news.
 *   4. Revalidate     → every 5 minutes (recovers automatically when the
 *                       API comes back).
 *
 * The mock stream hook is always mounted (rules of hooks) but its output is
 * ignored whenever live data is available.
 */

import { useEffect, useState } from 'react';
import { useNewsStream } from './useNewsStream';
import type { FlashAlert, NewsItemPayload, NewsSentiment } from './useNewsStream';

export type NewsFeedMode = 'loading' | 'live' | 'simulated';

/** Shape returned by api/news.ts */
export interface ApiNewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string; // e.g. "18m ago", "3h ago"
  sentiment: NewsSentiment;
}

const REVALIDATE_MS = 5 * 60_000;

/** Parse api/news `timeAgo` labels ("12s/m/h/d ago") into an epoch ms timestamp. */
export function parseAgoToTimestamp(timeAgo: string, now: number = Date.now()): number {
  const match = /^(\d+)\s*([smhd])\s*ago$/i.exec(timeAgo.trim());
  if (!match) return now;
  const value = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return now - value * (unitMs[match[2].toLowerCase()] ?? 0);
}

/** Extract $TICKER watch symbols mentioned in a headline. */
export function extractWatchSymbols(title: string): string[] {
  const symbols = new Set<string>();
  for (const match of title.matchAll(/\$([A-Za-z]{1,8})\b/g)) {
    symbols.add(match[1].toUpperCase());
  }
  return [...symbols];
}

/** Map API news items into the feed shape consumed by MarketNews. */
export function mapApiNewsToFeed(items: ApiNewsItem[], now: number = Date.now()): NewsItemPayload[] {
  return items.map((item, index) => ({
    id: item.id,
    // Older items sort first; subtract index to keep ordering deterministic
    // when several items share the same timeAgo bucket.
    timestamp: parseAgoToTimestamp(item.timeAgo, now) - index * 1_000,
    priority: 'STANDARD' as const,
    sentiment: item.sentiment,
    headline: item.title,
    implication: '', // real API has no analyst commentary — card hides this section
    source: item.source,
    watchSymbols: extractWatchSymbols(item.title),
  }));
}

export interface NewsFeedState {
  items: NewsItemPayload[];
  flashAlert: FlashAlert | null;
  mode: NewsFeedMode;
}

export function useNewsFeed(): NewsFeedState {
  const mock = useNewsStream();
  const [liveItems, setLiveItems] = useState<NewsItemPayload[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch('/api/news', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('empty feed');
        if (!alive) return;
        setLiveItems(mapApiNewsToFeed(data as ApiNewsItem[]));
        setHasFailed(false);
      } catch {
        if (!alive) return;
        setLiveItems(null);
        setHasFailed(true);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), REVALIDATE_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const mode: NewsFeedMode = liveItems ? 'live' : hasFailed ? 'simulated' : 'loading';

  return {
    items: liveItems ?? mock.feed,
    flashAlert: liveItems ? null : mock.flashAlert,
    mode,
  };
}
