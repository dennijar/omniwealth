-- ==============================================================================
-- OMNIWEALTH: SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS)
--
-- Fresh install : run this file entirely in the Supabase SQL Editor.
-- Existing DB   : run only the "MIGRATION" sections at the bottom — they are
--                 idempotent (safe to re-run) and never drop data.
--
-- Security model (defence in depth):
--   1. RLS            → WHO may touch a row      (auth.uid() = user_id)
--   2. CHECK/UNIQUE   → WHAT values are legal    (amounts > 0, enums, …)
--   3. Composite FK   → rows can only reference RELATED rows of the SAME user
--   4. App layer      → friendly validation before PostgREST (src/lib/validate)
-- ==============================================================================

-- 0. Create Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  initial_balance NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transfer_to_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT,
  asset_class TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  average_buy_price NUMERIC NOT NULL,
  manual_valuation NUMERIC,
  currency TEXT DEFAULT 'IDR',
  sector TEXT,
  logo_url TEXT,
  live_price NUMERIC,
  price_source TEXT DEFAULT 'cached',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Create Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  category TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 4. Enforce RLS Policies — split PER ACTION (least privilege)
--    (replaces the previous single "FOR ALL" policy)
DROP POLICY IF EXISTS "Users can manage their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage their own assets" ON assets;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_accounts', 'transactions', 'assets', 'budgets']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_own', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() = user_id)',
      t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      t || '_insert_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      t || '_update_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() = user_id)',
      t || '_delete_own', t);
  END LOOP;
END $$;

-- ==============================================================================
-- MIGRATION: HARDENING (idempotent — safe on fresh AND existing databases)
-- ==============================================================================

-- 5. CHECK constraints — enforce business meaning, not just types.
--    RLS answers "may this user write?" — CHECK answers "is this value sane?"
DO $$
BEGIN
  -- transactions: positive amounts only (blocks the negative-amount
  -- balance-inflation attack) + known types only
  BEGIN
    ALTER TABLE transactions ADD CONSTRAINT transactions_amount_positive
      CHECK (amount > 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_valid
      CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- bank_accounts
  BEGIN
    ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_initial_balance_valid
      CHECK (initial_balance >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- assets: sane quantities/prices + known asset classes
  BEGIN
    ALTER TABLE assets ADD CONSTRAINT assets_quantity_positive
      CHECK (quantity > 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE assets ADD CONSTRAINT assets_avg_price_valid
      CHECK (average_buy_price >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE assets ADD CONSTRAINT assets_manual_valuation_valid
      CHECK (manual_valuation IS NULL OR manual_valuation >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE assets ADD CONSTRAINT assets_class_valid
      CHECK (asset_class IN ('STOCK', 'CRYPTO', 'REAL_ESTATE', 'COMMODITY', 'MUTUAL_FUND'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- budgets: positive limit + YYYY-MM format
  BEGIN
    ALTER TABLE budgets ADD CONSTRAINT budgets_limit_positive
      CHECK (limit_amount > 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE budgets ADD CONSTRAINT budgets_month_year_format
      CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 6. UNIQUE: one budget per user/month/category (prevents race duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budgets_one_per_user_month_category'
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_one_per_user_month_category
      UNIQUE (user_id, month_year, category);
  END IF;
END $$;

-- 7. Composite ownership keys — a transaction can ONLY reference a
--    bank account belonging to the SAME user (FK checks existence only;
--    this checks the relationship).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_id_user_unique'
  ) THEN
    ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_id_user_unique
      UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_bank_owner_fk'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_bank_owner_fk
      FOREIGN KEY (bank_account_id, user_id)
      REFERENCES bank_accounts (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_transfer_owner_fk'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_transfer_owner_fk
      FOREIGN KEY (transfer_to_account_id, user_id)
      REFERENCES bank_accounts (id, user_id);
  END IF;
END $$;

-- 8. Indexes — every query filters by user_id first
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user  ON bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_assets_user         ON assets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user        ON budgets (user_id, month_year);
