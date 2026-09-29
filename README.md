# 💎 OmniWealth

Multi-asset wealth management PWA — fiat ledger, investment portfolio with live
market prices, budgeting, and rule-based financial insights. Built with
**React 19 + Vite + TypeScript (strict) + Tailwind + Zustand + Supabase**.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev                  # http://localhost:5173
```

Database setup: run `schema.sql` in the Supabase SQL Editor (idempotent —
safe to re-run; includes RLS, CHECK constraints, ownership FKs and indexes).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (PWA + service worker) |
| `npm run typecheck` | `tsc --noEmit` under `strict` mode |
| `npm run lint` | ESLint (flat config, incl. react-hooks rules) |
| `npm test` | Vitest unit tests (validation + news mapping) |
| `npm run ci` | typecheck + lint + test + build (what CI runs) |

## Architecture

```
api/            Vercel serverless proxies (market quotes, news) — keys stay server-side
schema.sql      Supabase DDL: tables + RLS + CHECK constraints + indexes (idempotent)
src/
  store/        Zustand stores — fiat ledger, portfolio (Supabase-backed),
                live-price store (Binance WebSocket), computed views
                (net worth & insights are pure "DB views" over raw stores)
  hooks/        useNewsFeed (real /api/news → labelled mock fallback),
                useBinanceTicker (reconnecting WS with backoff+jitter)
  lib/          validate.ts (runtime input validation), supabase client, insight engine
  components/   UI — dashboards, modals, MarketNews feed
  pages/        Route-level screens (Dashboard, MarketTerminal)
```

**Data flow:** browser ⇄ Supabase PostgREST (parameterized queries, RLS-scoped
per user) · market/news data via same-origin `/api/*` serverless proxies.

## Security model (defence in depth)

1. **RLS** — per-action policies (`SELECT/INSERT/UPDATE/DELETE`), `auth.uid() = user_id`
2. **CHECK constraints** — positive amounts, type enums, `YYYY-MM` budgets
3. **Composite FKs** — transactions can only reference bank accounts owned by the same user
4. **App validation** — `src/lib/validate.ts` rejects bad payloads before PostgREST
5. **Secrets** — only `VITE_*` vars reach the browser; `FINNHUB_API_KEY` stays on the server

> `.env.local` is gitignored. Use `.env.example` as the template. If you ever
> need to rotate keys: Supabase Dashboard → Settings → API.

Known gap: `npm audit` reports advisories from `@vercel/node` (dev-only
type package) with no upstream fix — tracked in CI as a non-blocking report.

## Environment variables

See `.env.example`. Never prefix server secrets with `VITE_`.

## Quality gates

Every push runs `.github/workflows/ci.yml`:
`tsc --noEmit` → `eslint` → `vitest` → `vite build` → audit report.

Project reports & audits: `SECURITY_AUDIT_SQL_DB.md`, `REPO_REVIEW.md`.
