# 🔒 Audit Keamanan: SQL Injection & Database — OmniWealth
**Tanggal:** 2026-09-29 · **Cakupan:** seluruh permukaan query DB, API serverless, RLS, kredensial, supply chain

---

## 1. Ringkasan Eksekutif

| Area | Status | Keterangan |
|---|---|---|
| SQL injection klasik (raw SQL) | ✅ Bersih | Tidak ada satu pun string SQL mentah di codebase |
| PostgREST filter injection | ✅ Bersih (hari ini) | Tidak ada `.or()`, `.like()`, `.rpc()`, `.filter()` dengan input user |
| Parameter/URL injection di API | ⚠️ Temuan | `symbol` tidak di-encode di jalur Finnhub & Binance |
| Validasi di level database | ❌ **Tidak menyeluruh** | Nol CHECK constraint; `amount` bisa negatif → manipulasi saldo |
| RLS | ⚠️ Cukup tapi tunggal | Kebijakan `FOR ALL` terlalu luas, tanpa defense-in-depth |
| Kredensial di Git | ❌ **Temuan** | `.env.local` (URL + key asli) ter-commit; `.gitignore` rusak |
| Validasi input aplikasi | ❌ Tidak ada | Tidak ada schema validation (zod/yup) sama sekali |
| Serverless API | ⚠️ Temuan | Tanpa rate limit/auth, CORS `*`, leak pesan error internal |
| Supply chain / proses | ⚠️ Temuan | `npm audit` high-severity, tanpa SAST/CI, artefak build di-git |

**Intinya:** risiko SQL injection *langsung* rendah karena arsitektur Supabase/PostgREST (query selalu parameterized). Yang **tidak menyeluruh** adalah pertahanan *setelah* query terbentuk: validasi nilai di database, kedalaman pertahanan RLS, sanitasi input di API, dan kebersihan kredensial di repo.

---

## 2. SQL Injection — Hasil Pemeriksaan Permukaan

Dicari: `SELECT/INSERT/UPDATE/DELETE` string, template literal SQL, `pg`, `prisma`, `knex`, `mysql`, `.query()`, `.execute()`, raw driver, `.rpc()`, `.or()`, `.like()`, `.textSearch()`, `.filter()`.

**Hasil:**

- **`src/` & `api/` — 0 kueri SQL mentah.** Semua akses DB lewat `supabase-js` (PostgREST), yang meng-encode nilai secara parameterized by design. Permukaan SQLi klasik = 0.
- **4 tabel** (`assets`, `bank_accounts`, `budgets`, `transactions`) semuanya didefinisikan di `schema.sql` dan dirujuk hanya via builder `.from(...).select/insert/update/delete/upsert` — tidak ada `view`, `function`, atau `trigger` buatan aplikasi (jadi tidak ada RPC yang bisa jadi vektor).
- **`api/market.ts` & `api/news.ts` tidak menyentuh database sama sekali** (hanya fetch ke Yahoo/Binance/Finnhub/RSS).

### 2.1 Sisa vektor "injection" yang ditemukan

**⚠️ T-01 — Query-parameter injection di `api/market.ts` (bukan SQLi, satu kelas yang sama)**

```ts
// Jalur Yahoo — SUDAH benar:
`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}...`

// Jalur Finnhub — TIDAK di-encode:
`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubKey}`

// Jalur Binance — TIDAK di-encode:
`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}`
```

`symbol` yang mengandung `&`/`?`/`#` bisa menyuntikkan parameter tambahan ke URL upstream (mis. `BTC&token=x`), mengubah perilaku request, atau memanjangkan URL liar. **Perbaiki:** `encodeURIComponent()` di kedua jalur + whitelist format symbol (`/^[A-Za-z0-9.\-]{1,20}$/`).

**⚠️ T-02 — Refleksi `symbol` mentah di pesan error** (`message: \`Symbol ${symbol} not found\``). Saat ini keluar sebagai JSON (risiko XSS rendah), tapi kebiasaan merefleksikan input mentah harus dihindari.

**⚠️ T-03 — Tidak ada guardrail anti-regresi.** Hari ini tidak ada `.or()`/`.rpc()` berbasis string, tapi tidak ada pula validasi schema (zod/yup) maupun aturan lint yang mencegah developer masa depan menggabungkan input user ke filter PostgREST (`.or(\`name.eq.${input}\`)` = injection gaya PostgREST). Ini yang membuat cek SQLi "sekarang bersih" tapi **tidak terjamin menyeluruh ke depan**.

---

## 3. Database — Yang PALING Kurang Menyeluruh

### ❌ T-04 — Nol CHECK constraint (temuan terpenting)

`schema.sql` hanya menjamin tipe kolom, **tidak menjamin arti bisnis**. RLS menjawab *"bolehkah user ini menulis?"* — **bukan** *"apakah nilai ini sah?"*.

**Eksploitasi nyata — manipulasi saldo lewat `amount` negatif:**

1. Guard di aplikasi (`useFiatStore.ts:154`) hanya: `if (amountDecimal.greaterThan(currentBalance))` → nilai **negatif tidak pernah lebih besar** dari saldo → lolos.
2. Database menerima `amount = -999999999` tanpa protes (tidak ada `CHECK`).
3. `getBalanceByBank` menghitung `acc.minus(amt)` → minus nilai negatif = **saldo bertambah**.
4. RLS `WITH CHECK (auth.uid() = user_id)` juga lolos, karena user menulis datanya **sendiri**.

PoC (dengan JWT user sendiri, cukup PostgREST + anon key yang sudah ada di bundle):

```bash
curl -X POST "https://<proj>.supabase.co/rest/v1/transactions" \
  -H "apikey: <VITE_SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <access_token_user>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"id":"<uuid>","user_id":"<uid_sendiri>","bank_account_id":"<akun_sendiri>",
       "type":"EXPENSE","amount":-999999999,"category":"x",
       "date":"2026-09-29T00:00:00Z"}'
```

Karena guard "insufficient funds" **hanya berjalan di client**, siapa pun yang membuka DevTools (atau memanggil PostgREST langsung) bisa melewatkannya. Untuk aplikasi finansial, validasi harus **di database**, bukan hanya di UI.

**Perbaikan yang kurang (siap tempel ke `schema.sql`):**

```sql
ALTER TABLE transactions
  ADD CONSTRAINT amount_positive CHECK (amount > 0),
  ADD CONSTRAINT type_valid CHECK (type IN ('INCOME','EXPENSE','TRANSFER'));
ALTER TABLE bank_accounts
  ADD CONSTRAINT initial_balance_finite CHECK (initial_balance >= 0);
ALTER TABLE assets
  ADD CONSTRAINT quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT avg_price_positive CHECK (average_buy_price >= 0),
  ADD CONSTRAINT asset_class_valid
    CHECK (asset_class IN ('STOCK','CRYPTO','REAL_ESTATE','COMMODITY','MUTUAL_FUND'));
ALTER TABLE budgets
  ADD CONSTRAINT limit_positive CHECK (limit_amount >= 0),
  ADD CONSTRAINT month_year_format CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
```

### ❌ T-05 — Tidak ada validasi input di lapisan aplikasi

Payload dari UI diteruskan **apa adanya** ke PostgREST (`payload.amount`, `payload.category`, `description`, dst.). Tidak ada zod/yup; tipe TypeScript hanya hilang saat runtime. Akibat: tipe data aneh, angka string, enum palsu — semuanya sampai ke DB (dan lolos, lihat T-04).

### ❌ T-06 — UNIQUE constraint budget tidak ada

`budgets` tidak punya `UNIQUE (user_id, month_year, category)`. Upsert di app memakai *find-then-upsert* dengan UUID klien → dua tab/perangkat bisa membuat **baris budget ganda** untuk kategori & bulan yang sama. Perbaikan:

```sql
ALTER TABLE budgets ADD CONSTRAINT budgets_one_per_user_month UNIQUE (user_id, month_year, category);
```

### ⚠️ T-07 — Referensi lintas user tidak dicegah schema

FK `transactions.bank_account_id REFERENCES bank_accounts(id)` hanya mengecek **eksistensi** UUID, bukan pemilik. Seorang user dapat membuat transaksi yang menunjuk `bank_account_id` milik user lain (UUID harus ditebak — risiko rendah, tapi celah desain). Solusi permanen: FK komposit `UNIQUE(id, user_id)` di `bank_accounts` + `FOREIGN KEY (bank_account_id, user_id)`.

### ⚠️ T-08 — Keamanan RLS setelah policy dibuat

- **Policy `FOR ALL`** (baris 69–72) memberi SELECT+INSERT+UPDATE+DELETE sekaligus, termasuk kolom apa pun. Lebih menyeluruh: pecah per-aksi (`FOR SELECT` / `FOR INSERT WITH CHECK` / `FOR UPDATE USING+CHECK` / `FOR DELETE USING`).
- **Tidak ada defense-in-depth di app.** Beberapa operasi hanya `.eq('id', id)` tanpa `.eq('user_id', user.id)` (`useFiatStore` delete ×3, `useMarketStore` delete/patch). Selamat karena RLS, tapi bila suatu hari RLS salah-konfigurasi (atau `service_role` dipakai di client), ini langsung jadi IDOR. Tambahkan `.eq('user_id', user.id)` di semua operasi.
- **Tidak ada mekanisme drift/migrasi.** `schema.sql` dijalankan manual di SQL Editor — tidak ada `supabase/migrations/`, tidak ada verifikasi otomatis bahwa RLS benar-benar aktif. Satu langkah terlewat = tabel tanpa keamanan. (Kalau project prod menggunakan **anon key publik + RLS mati = seluruh database terbaca siapa pun** — ini skenario gagal paling mahal.)
- **Tidak ada indeks** pada `user_id`, `bank_account_id`, `date`, `month_year` → setiap fetch = seq scan (skala, bukan keamanan).

```sql
-- contoh pengetatan policy (per aksi)
DROP POLICY "Users can manage their own transactions" ON transactions;
CREATE POLICY tx_select ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tx_insert ON transactions FOR INSERT   WITH CHECK (auth.uid() = user_id);
CREATE POLICY tx_update ON transactions FOR UPDATE   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tx_delete ON transactions FOR DELETE   USING (auth.uid() = user_id);
CREATE INDEX idx_tx_user_date ON transactions (user_id, date DESC);
```

### ⚠️ T-09 — Tidak ada audit trail & verifikasi session

- Aplikasi finansial tanpa `updated_at`/log perubahan siapa-mengubah-apa (audit table) → tidak bisa menelusuri manipulasi data.
- `App.tsx` memakai `supabase.auth.getSession()` untuk hydration — Supabase sendiri memperingatkan session dari storage bisa dipalsukan; gunakan `supabase.auth.getUser()` (divalidasi server).

---

## 4. Kredensial & Kebersihan Repo

### ❌ T-10 — `.env.local` ter-commit, `.gitignore` rusak

- `.gitignore` berisi **satu baris literal: `(api/news.ts)`** — tidak meng-ignore apa pun yang berarti.
- `.env.local` (berisi `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` **asli**, teridentifikasi JWT `eyJ…`) **ter-track di git** sejak commit awal, beserta riwayatnya.
- `dist/assets/index-CKuulsrV.js` (juga ter-commit) memuat URL project `https://yzwjpewd….supabase.co` + key — artefak build + `omniwealth.zip` ikut di-git.

Catatan jujur: **anon key memang by-design untuk dikonsumsi browser** — bocor ≠ kebobolan, selama RLS benar (lihat T-08: di sinilah dua temuan saling mengunci). Yang tidak menyeluruh adalah *kebiasaannya*: begitu ada `SERVICE_ROLE` atau `FINNHUB_API_KEY` yang salah taruh di `VITE_`, otomatis ikut ter-commit.

**Perbaikan:**

```gitignore
# .gitignore (ganti seluruh isi)
.env
.env.*
!.env.example
*.zip
dist/
dev-dist/
```
- Tambahkan `.env.example` berisi placeholder.
- Jika repo pernah publik: pertimbangkan rotasi anon key (Dashboard → Settings → API).
- Pindahkan artefak build keluar dari git (Vercel/Vite build di CI).

---

## 5. API Serverless (`api/*.ts`)

| # | Temuan | Detail |
|---|---|---|
| T-11 | Tidak ada rate limiting | `/api/market` & `/api/news` terbuka untuk siapa pun → kuota Finnhub/Yahoo bisa dikuras pihak lain |
| T-12 | CORS `Access-Control-Allow-Origin: *` + `Allow-Credentials: true` | Kombinasi ini secara spesifik disalahartikan; browser memang menolak `*`+credentials, tapi tetap kebiasaan buruk — batasi origin |
| T-13 | Leak error internal | 500 mengembalikan `message: Failed to fetch: ${errorMessage}` mentah — bisa membocorkan detail environment |
| T-14 | Injection upstream (T-01) | `symbol` tanpa `encodeURIComponent` di jalur Finnhub/Binance |

---

## 6. Supply Chain & Proses

- **`npm audit`**: ditemukan beberapa advisory, termasuk **high severity** pada rantai build (`@babel/plugin-transform-modules-systemjs` GHSA-fv7c-fp4j-7gwp, `fixAvailable: true`). Jalankan `npm audit fix` + pin versi.
- **Tidak ada** SAST (semgrep/gitleaks), CI security check, maupun test sama sekali — tidak ada yang mencegah regresi keamanan.
- **Tidak ada** `.env.example`, tidak ada dokumentasi langkah hardening Supabase (rotasi key, aktifkan RLS, dst.).

---

## 7. Prioritas Perbaikan

| Prioritas | ID | Aksi | Estimasi |
|---|---|---|---|
| 🔴 P0 | T-04 | Tambah CHECK constraint (`amount > 0`, enum type/asset_class) di Supabase SQL Editor | 15 menit |
| 🔴 P0 | T-08 | Verifikasi RLS aktif di 4 tabel di dashboard prod; jalankan ulang `schema.sql` sebagai migrasi terstruktur | 15 menit |
| 🔴 P0 | T-10 | Perbaiki `.gitignore`, tambah `.env.example`, hentikan tracking `dist/`/`zip` | 10 menit |
| 🟠 P1 | T-01/T-14 | `encodeURIComponent` + whitelist symbol di `api/market.ts` | 20 menit |
| 🟠 P1 | T-05 | Tambah zod validation pada semua payload sebelum `supabase.*` | 1–2 jam |
| 🟠 P1 | T-06 | UNIQUE constraint budgets + `.eq('user_id')` di semua operasi (defense-in-depth) | 30 menit |
| 🟡 P2 | T-08 | Pecah policy `FOR ALL` per-aksi + indeks `user_id`/`date` | 1 jam |
| 🟡 P2 | T-11..13 | Rate limit, batasi CORS, generic error message di API | 1 jam |
| 🟢 P3 | T-09 | Ganti `getSession()`→`getUser()`, audit trail `updated_at` | 1 jam |
| 🟢 P3 | — | `npm audit fix`, pasang gitleaks/semgrep di CI | 1 jam |

---

## 8. Metode Pemeriksaan

- Pemindaian pola: seluruh `src/**`, `api/**`, `schema.sql`, `dist/**` (keyword SQL mentah, driver DB, builder query dinamis, pola secret)
- Review manual: `schema.sql` (DDL/RLS), `useFiatStore`/`useMarketStore`/`useAuthStore`, `LoginScreen`, `App.tsx`, `api/market.ts`, `api/news.ts`, `vite.config.ts`
- Pemeriksaan repo: `git ls-files` (env/artefak ter-track), `git log` untuk jejak secret, `git check-ignore`
- `npm audit --package-lock-only` untuk dependency advisories
- Analisis alur data: guard client-side vs enforce DB (bypass "insufficient funds" via PostgREST langsung)
