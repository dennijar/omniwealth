import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

type Sentiment = 'bullish' | 'bearish' | 'neutral';

type NewsItem = {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  sentiment: Sentiment;
};

function timeAgoFrom(date: Date): string {
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function sentimentFromTitle(title: string): Sentiment {
  const t = title.toLowerCase();
  const bullish = ['surge', 'rally', 'breakout', 'beats', 'upgrade', 'record high', 'tops', 'soars', 'bull'];
  const bearish = ['plunge', 'selloff', 'downgrade', 'misses', 'hacked', 'breach', 'lawsuit', 'crackdown', 'bear'];
  if (bullish.some((k) => t.includes(k))) return 'bullish';
  if (bearish.some((k) => t.includes(k))) return 'bearish';
  return 'neutral';
}

function hashId(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function parseRssItems(xml: string, maxItems = 5): { title: string; pubDate?: string; source: string }[] {
  const items: { title: string; pubDate?: string; source: string }[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const titleRe = /<title>([\s\S]*?)<\/title>/i;
  const pubRe = /<pubDate>([\s\S]*?)<\/pubDate>/i;

  const matches = xml.match(itemRe) ?? [];
  for (const raw of matches.slice(0, maxItems)) {
    const titleMatch = raw.match(titleRe);
    const pubMatch = raw.match(pubRe);
    const title = titleMatch ? decodeHtmlEntities(stripCdata(titleMatch[1].trim())) : '';
    if (!title) continue;
    items.push({
      title,
      pubDate: pubMatch ? stripCdata(pubMatch[1].trim()) : undefined,
      source: 'CoinDesk',
    });
  }
  return items;
}

function mockNews(): NewsItem[] {
  const now = Date.now();
  const base: Array<{ title: string; minsAgo: number; source: string }> = [
    { title: 'Bitcoin steadies as macro traders price in softer rate path; volatility compresses into U.S. CPI window', minsAgo: 18, source: 'OmniWealth Wire' },
    { title: 'Ethereum L2 fees slide as activity rotates to alt ecosystems; analysts flag renewed throughput headroom', minsAgo: 42, source: 'OmniWealth Wire' },
    { title: 'Asian equities open mixed; energy bid firms while semis lag amid cautious guidance revisions', minsAgo: 67, source: 'OmniWealth Desk' },
    { title: 'Dollar index retreats after risk-on flows; EM FX gains as carry trades rebuild', minsAgo: 105, source: 'OmniWealth Desk' },
    { title: 'Crypto market watches for ETF flow inflection; on-chain signals show renewed spot accumulation', minsAgo: 150, source: 'OmniWealth Research' },
  ];
  return base.map((b) => {
    const date = new Date(now - b.minsAgo * 60_000);
    return {
      id: hashId(`${b.source}:${b.title}:${date.toISOString()}`),
      title: b.title,
      source: b.source,
      timeAgo: timeAgoFrom(date),
      sentiment: sentimentFromTitle(b.title),
    };
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are supported' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // RSS feed: no API key required; server-side fetch avoids browser CORS.
    const rssUrl = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'OmniWealth/1.0 (+https://vercel.com)',
        accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1',
      },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return response.status(200).json(mockNews());
    }

    const xml = await res.text();
    const items = parseRssItems(xml, 5);
    if (items.length === 0) {
      response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return response.status(200).json(mockNews());
    }

    const out: NewsItem[] = items.map((it) => {
      const date = it.pubDate ? new Date(it.pubDate) : new Date();
      return {
        id: hashId(`${it.source}:${it.title}:${it.pubDate ?? ''}`),
        title: it.title,
        source: it.source,
        timeAgo: timeAgoFrom(date),
        sentiment: sentimentFromTitle(it.title),
      };
    });

    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response.status(200).json(out);
  } catch {
    response.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return response.status(200).json(mockNews());
  }
}

