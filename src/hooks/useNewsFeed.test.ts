import { describe, expect, it } from 'vitest';
import {
  extractWatchSymbols,
  mapApiNewsToFeed,
  parseAgoToTimestamp,
  type ApiNewsItem,
} from './useNewsFeed';

describe('parseAgoToTimestamp', () => {
  const now = Date.UTC(2026, 8, 29, 12, 0, 0);

  it('parses seconds/hours/days buckets', () => {
    expect(parseAgoToTimestamp('30s ago', now)).toBe(now - 30_000);
    expect(parseAgoToTimestamp('18m ago', now)).toBe(now - 18 * 60_000);
    expect(parseAgoToTimestamp('5h ago', now)).toBe(now - 5 * 3_600_000);
    expect(parseAgoToTimestamp('3d ago', now)).toBe(now - 3 * 86_400_000);
  });

  it('falls back to now for malformed labels', () => {
    expect(parseAgoToTimestamp('yesterday', now)).toBe(now);
    expect(parseAgoToTimestamp('', now)).toBe(now);
    expect(parseAgoToTimestamp('18 minutes ago', now)).toBe(now);
  });
});

describe('extractWatchSymbols', () => {
  it('extracts $TICKERS and uppercases them', () => {
    expect(extractWatchSymbols('$BTC rallies past $100k as $eth follows')).toEqual(['BTC', 'ETH']);
  });

  it('returns empty array when no tickers', () => {
    expect(extractWatchSymbols('Asian equities open mixed')).toEqual([]);
  });
});

describe('mapApiNewsToFeed', () => {
  const apiItems: ApiNewsItem[] = [
    {
      id: 'abc123',
      title: 'Bitcoin steadies as traders await CPI — $BTC in focus',
      source: 'Yahoo Finance',
      timeAgo: '18m ago',
      sentiment: 'bullish',
    },
    {
      id: 'def456',
      title: 'Asian equities open mixed',
      source: 'CoinDesk',
      timeAgo: '2h ago',
      sentiment: 'neutral',
    },
  ];

  it('maps every API item into a feed payload with sane defaults', () => {
    const now = Date.UTC(2026, 8, 29, 12, 0, 0);
    const feed = mapApiNewsToFeed(apiItems, now);

    expect(feed).toHaveLength(2);
    expect(feed[0]).toMatchObject({
      id: 'abc123',
      priority: 'STANDARD',
      sentiment: 'bullish',
      source: 'Yahoo Finance',
      watchSymbols: ['BTC'],
      implication: '',
    });
    expect(feed[0].timestamp).toBe(now - 18 * 60_000 - 0);
    expect(feed[1].timestamp).toBe(now - 2 * 3_600_000 - 1_000);
    expect(feed[1].watchSymbols).toEqual([]);
    expect(feed[1].headline).toBe('Asian equities open mixed');
  });
});
