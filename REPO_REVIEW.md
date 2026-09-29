# 📋 Repository Review Menyeluruh — OmniWealth
**Tanggal:** 2026-09-29 · **Branch:** `arena/01a0ec6f-omniwealth` · **Basis:** `29f7df9`
**Cakupan:** seluruh repo (build, tipe, fitur, arsitektur, keamanan, dependency, kebersihan Git)
> Terkait dengan: `SECURITY_AUDIT_SQL_DB.md` (audit SQL/DB — 14 temuan). Dokumen ini melengkapi: cek menyeluruh di seluruh lapisan repo.

---

## 0. Skor Kesehatan Repo

| Dimensi | Nilai | Keterangan |
|---|---|---|
| Type check (`tsc --noEmit`, strict) | ✅ **LOLOS** | 0 error, `strict: true`, `noUnusedLocals` aktif |
| Build (`npm run build`) | ✅ **LOLOS** | 4.7 dtk; PWA precache 11 file (976 KB) |
| Keamanan DB/SQL | ⚠️ | Lihat `SECURITY_AUDIT_SQL_DB.md` — 3× P0 |
| Functional correctness | ❌ | 3 bug nyata (reset palsu, tanpa logout, news fiktif) |
| Dependency health | ❌ | **29 vuln: 1 critical, 21 high, 5 moderate, 2 low** |
| Testing & linting | ❌ | 0 test, tanpa ESLint/Prettier, tanpa CI (`.github` tidak ada) |
| Kebersihan Git | ❌ | `.env.local` + `dist/` + `node_modules/` tak ter-ignore, `.gitignore` rusak |
| Kualitas kode dasar | ✅ | 0 TODO/FIXME, 0 `dangerouslySetInnerHTML`/`eval`, hanya 1 `as any` |

**Build hijau dan TypeScript bersih — tapi proses dan fungsinya bolong.**

---

## 1. 🔴 Temuan Tinggi (Fungsional)

### H-1 — Tidak ada fungsi Logout sama sekali
`grep supabase.auth.signOut` di seluruh `src/` → **0 hasil**. Satu-satunya panggilan auth: `getSession`, `onAuthStateChange`, `signUp`, `signInWithPassword`, `signInWithOAuth`. Pengguna **tidak bisa keluar dari akun**. Satu-satunya cara session hilang adalah efek samping tak sengaja dari `resetAllData()` (lihat H-2) — logout terjadi secara tidak sengaja lewat penghancuran data.

### H-2 — "Reset Semua Data" tidak menghapus data (janji palsu)
`SettingsDashboard` menampilkan dialog: *"Semua data rekening, transaksi, dan investasi akan **dihapus permanen** dan tidak bisa dipulihkan."* Kenyataannya `useAppStore.resetAllData()` hanya:

```ts
resetAllData: () => { localStorage.clear(); window.location.reload(); }
```

- **Baris Supabase tidak dihapus** → setelah login berikutnya, `fetchUserData()` menarik semuanya kembali. Data **tidak pernah permanen terhapus**.
- `localStorage.clear()` menghapus **semua** key di origin (termasuk `sb-*-auth-token` → session ikut hilang, efektif logout, tapi secara kasar), plus key aplikasi lain yang bukan milik OmniWealth.
- Konsekuensi privasi: fitur "hapus data saya" yang tidak benar-benar menghapus adalah pelanggaran janji ke pengguna.

**Perbaikan:** kombinasi `supabase.auth.signOut()` + `DELETE` row 4 tabel (atau RPC `delate user data`) sebelum reload; dialog harus jujur; logout terpisah dari reset.

### H-3 — Feed berita 100% FIKTIF, tanpa label; API berita asli = dead code
- `MarketNews.tsx` memakai `useNewsStream` — yang secara eksplisit berjudul *"A mock async emitter... simulating the two event channels"*: headline, sentimen, dan "CRITICAL breaking news" **dibuat-buat**, dirotasi tiap 25–40 detik, dan **tidak ada label MOCK/demo di UI** (berbeda dengan halaman Terminal yang jujur menandai `MOCK`).
- Endpoint nyata `api/news.ts` (Yahoo Finance + CoinDesk RSS, 234 baris) **tidak pernah direferensikan** dari mana pun di aplikasi → dead code di produksi.
- Untuk aplikasi finansial, menampilkan berita karangan sebagai nyata = masalah integritas serius (pengguna bisa mengambil keputusan investasi dari headline fiktif).

### H-4 — Bug data: `change24h` diisi dari field yang salah
`src/hooks/useBinanceTicker.ts` (≈ baris 96–97):

```ts
change24h:       parseFloat(raw.P),   // ❌ P = persentase 24h
changePercent24h: parseFloat(raw.P),  // ✓ benar
// raw.p (perubahan absolut) dideklarasikan di interface tapi TIDAK PERNAH DIPAKAI
```

`change24h` (nominal) dan `changePercent24h` (persen) selalu berisi **angka persen yang sama** — UI yang menampilkan perubahan nominal akan menampilkan persentase. Perbaikan: `change24h: parseFloat(raw.p)`.

### H-5 — Dua store dengan nama identik di folder berbeda (`store/` vs `stores/`)

| Path | Isi | Dipakai oleh |
|---|---|---|
| `src/store/useMarketStore.ts` | Portofolio aset + Supabase | `App`, `AddAssetModal`, `MarketDashboard` (components), `NetWorthDashboard`, `useAppStore`, `useNetWorthStore` |
| `src/stores/useMarketStore.ts` | Harga live Binance WS | `CryptoMarketTiers`, `useBinanceTicker`, `MarketDashboard` (pages) |

Keduanya mengekspor `useMarketStore` — import yang salah sangat mudah terjadi dan tidak akan ketahuan sampai runtime/behavior aneh. Ini jebakan pemeliharaan paling berbahaya di codebase saat ini. **Perbaikan:** rename menjadi `usePortfolioStore` & `useLivePriceStore` (atau gabungkan) dalam satu folder `store/`.

### H-6 — Dua komponen `MarketDashboard` berbeda untuk dua route
`App.tsx` memuat `components/MarketDashboard` (route `/invest`) **dan** `pages/MarketDashboard` (route `/markets`). Keduanya "MarketDashboard". Route `/markets` (Terminal) berisi **15+ saham IDX hardcoded dengan label MOCK** (labelnya jujur — bagus), route `/invest` adalah portofolio asli. Berpotensi membingungkan; pastikan halaman MOCK tidak dipromosikan seolah data live.

---

## 2. 🔴 Temuan Keamanan & Dependency (ringkas, detail di dokumen audit)

| ID | Temuan | Status |
|---|---|---|
| Dari audit SQL/DB | CHECK constraint nol → manipulasi saldo `amount` negatif | P0 |
| Dari audit SQL/DB | RLS `FOR ALL` tunggal; `.env.local` ter-commit; `.gitignore` rusak | P0 |
| Dari audit SQL/DB | `encodeURIComponent` hilang di jalur Finnhub/Binance `api/market.ts` | P1 |
| **R-1** | **`npm audit`: 29 vuln — 1 CRITICAL (`tar` ≤7.5.20), 21 HIGH** | ❌ |
| **R-2** | **`react-router-dom@7.13.1` runtime HIGH** (turbo-stream deserialization / XSS via redirect; fix di ≥7.14.1) — dependency runtime, bukan sekadar tooling | ❌ |
| **R-3** | `vite@7.2.4` HIGH (path traversal di dev server `server.fs.deny` bypass; fix di ≥7.3.4) | ⚠️ dev-only |
| **R-4** | `node_modules/` **tidak di-ignore** (karena `.gitignore` hanya berisi literal `(api/news.ts)`) → `git add .` akan meng-commit 514 paket | ❌ |
| **R-5** | API serverless tanpa rate limit, CORS `*`, error internal bocor ke client (detail di audit) | P2 |

Catatan: sebagian besar HIGH berasal dari toolchain build (babel, terser, postcss, undici) — tetap wajib `npm audit fix`, tapi R-2 adalah **runtime** dan paling penting.

---

## 3. 🟡 Kualitas & Arsitektur

### Kekuatan (pertahankan) ✅
- **TypeScript strict lolos tanpa error**; hanya 1 `as any` di seluruh codebase; nol `@ts-ignore`.
- **Desain store cerdas**: `useNetWorthStore` & `useInsightStore` = *computed view* murni di atas store mentah (mirip VIEW di DB) — tidak ada duplikasi data.
- **Decimal.js** dipakai konsisten untuk math finansial (precision 28).
- **WebSocket maturity**: reconnect exponential backoff + jitter, batas 15 percobaan, guard StrictMode double-mount, cleanup timer lengkap — di atas rata-rata.
- **Kerahasiaan API key**: `FINNHUB_API_KEY` hanya server-side; anon key Supabase memang by-design publik.
- Halaman Terminal **jujur** menandai `MOCK` vs `LIVE`; password signup punya 5 aturan; ada `role`/`tabIndex`/`onKeyDown` di baris settings (a11y dasar ada).
- Nol TODO/FIXME menumpuk; nol `dangerouslySetInnerHTML`/`eval`/`innerHTML`.

### Masalah ⚠️
| # | Temuan | Bukti |
|---|---|---|
| K-1 | **Tanpa test, ESLint, Prettier, CI** | `ls` config → NONE; `.github` tidak ada; scripts hanya `dev/build/preview` — regresi tak terdeteksi otomatis |
| K-2 | **Tanpa README** | Tidak ada `README*` di repo — onboarding contributor = nol |
| K-3 | **Artefak build & catatan dev di-git** | `dist/` (2 file JS 860 KB), `dev-dist/`, `omniwealth.zip` (1.2 MB), `INTEGRATION_GUIDE.txt` (catatan langkah integrasi basi) |
| K-4 | **Bundle 860 KB dalam 1 chunk** | Build memperingatkan `>500 kB`; PWA precache 976 KB — tanpa `React.lazy`/code splitting |
| K-5 | **Komentar basi menyesatkan** | `types/fiat.ts` & `types/market.ts`: *"Mirrors the Prisma schema"* (tidak ada Prisma); `marketAggregator.ts`: *"mirrors the Next.js API route"* (tidak ada Next.js); `main.tsx` akhir file: `// trigger vercel redeploy for env variables` |
| K-6 | **Kurs FX hardcoded duplikat** | `USD_TO_IDR_FALLBACK = 15850` didefinisikan di **2 file** (`services/api.ts` & `marketAggregator.ts`) — stale & duplikat |
| K-7 | **`catch` menelan error** 7 tempat (`insightEngine`, `marketAggregator`, `api/news`) — kegagalan senyap sulit didebug | grep `catch {` |
| K-8 | **30 `console.*`** (4 `log`, 3 `info`, 4 `warn`, 19 `error`) aktif di produksi termasuk log PWA & WebSocket | grep counts |
| K-9 | **God components**: `NetWorthDashboard` 916 baris, `InsightsDashboard` 786, `insightEngine` 640 — sulit diuji & direview | `wc -l` |
| K-10 | **`/api/news.ts` dead code** (lihat H-3) + `src/services/api.ts` & `marketService.ts` punya jalur fetch yang tumpang tindih dengan `marketAggregator` | grep referensi |
| K-11 | Session dibaca via `getSession()` bukan `getUser()` (Supabase sendiri memperingatkan ini tidak divalidasi server) | `App.tsx:51` |
| K-12 | Deep-link `BrowserRouter` tanpa `vercel.json` rewrite — refresh di `/fiat` dsb. bergantung pada auto-SPA-fallback Vercel | config check |
| K-13 | `browsersli​st` data 7 bulan tua (warning build) | build log |

---

## 4. 🟢 Positif yang Ditemukan (wajib dipertahankan)

1. **Arsitektur keamanan query**: 0 SQL mentah, semua via PostgREST parameterized; API key eksternal tidak pernah menyentuh browser.
2. **Store pattern "computed view"** untuk net worth & insights — bersih, tanpa duplikasi sumber data.
3. **Decimal.js** untuk semua math uang (bukan float IEEE754).
4. **Reconnect/logic WebSocket** mature (backoff+jitter+StrictMode guard).
5. **Indikator MOCK/LIVE** di Terminal — jujur ke pengguna.
6. **Password policy** signup ketat (8+, upper, number, special, match).
7. **TypeScript strict** + `noUnusedLocals` — kualitas dasar terjaga; hampir nol `any`.
8. **Strategi PWA** masuk akal: precache app shell, NetworkFirst untuk `/api/*`, CacheFirst untuk font.
9. **Migrasi arsitektur yang baik**: komentar menunjukkan sempat pakai proxy CORS publik berisiko → sudah dihapus ("High-risk public CORS proxies removed").

---

## 5. Prioritas Perbaikan (gabungan dengan audit SQL/DB)

### 🔴 P0 — minggu ini
1. **Reset/logout yang jujur** (H-1, H-2): tambah `signOut()`; `resetAllData` harus DELETE row Supabase sebelum reload; perbaiki teks dialog.
2. **Berita: sambungkan `/api/news` atau beri label jelas "Simulasi"** (H-3) — integritas data pengguna.
3. **`.gitignore` benar + `.env.example` + untrack artefak** (R-4 + audit T-10).
4. **CHECK constraint di database** (audit T-04) + verifikasi RLS aktif (audit T-08).
5. **`npm audit fix`** — minimal untuk `react-router-dom ≥7.14.1` (R-2) dan critical `tar` (R-1).

### 🟠 P1 — sprint berikutnya
6. Gabung/rename dua store `useMarketStore` (H-5).
7. Fix `change24h` → `raw.p` (H-4).
8. `encodeURIComponent` + whitelist symbol di `api/market.ts` (audit T-01).
9. Validasi input zod sebelum semua panggilan Supabase (audit T-05).
10. Pasang ESLint (+ `typescript-eslint`, `react-hooks` rules) & GitHub Actions CI (`tsc && build && audit`).

### 🟡 P2 — perbaikan berkala
11. Code splitting route (`React.lazy`) — turunkan chunk 860 KB (K-4).
12. Hapus `dist/`/`dev-dist/`/`zip` dari Git, tambah README (K-2, K-3).
13. Rate limit + CORS origin + generic error di API (R-5).
14. Bersihkan `console.*` prod, komentar basi Prisma/Next.js, duplikasi FX rate (K-5, K-6, K-8).
15. Pecah god components; tambah unit test untuk `insightEngine` & store — kandidat test pertama (paling murni, tanpa DOM).

---

## 6. Metode Pemeriksaan
- `tsc --noEmit` (strict) · `npm run build` · `npm audit --json` (29 vuln terkonfirmasi)
- `grep` menyeluruh: TODO/FIXME, `console.*`, `eval`/`innerHTML`, `as any`, `signOut`, mock/fiktif, URL hardcoded, pola auth, referensi antar-file (dead code detection)
- Review manual: `App.tsx`, `main.tsx`, `index.html`, seluruh `store/`+`stores/`, `services/` (3 file), `hooks/` (2 file), `SettingsDashboard`, `LoginScreen`, `MarketNews`, `pages/MarketDashboard`, `schema.sql`, config build
- Pemeriksaan Git: tracked files (75), `.gitignore` validity, artefak ter-commit
- Validasi bersih: artefak build dari sesi audit dibuat bersih (`git status` kembali clean kecuali `node_modules/` yang tak ter-ignore — justru membuktikan temuan R-4)
