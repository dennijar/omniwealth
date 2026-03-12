// ============================================================
// OmniWealth – OnboardingWizard.tsx
// Animated 4-step first-time setup flow.
//
// Steps:
//   0 – Welcome
//   1 – Monthly income (salary in IDR)
//   2 – Bank account setup (name + initial balance)
//   3 – Done / CTA
//
// On completion → calls useAppStore.completeOnboarding()
// which seeds useFiatStore and sets isFirstTimeSetup: false.
// ============================================================

import { useState } from 'react';
import {
  Sparkles, TrendingUp, Landmark, CheckCircle2,
  ArrowRight, ChevronLeft,
} from 'lucide-react';
import { useAppStore, type OnboardingData } from '../store/useAppStore';
import { BANK_OPTIONS } from '../store/useFiatStore';

// ── Helpers ───────────────────────────────────────────────────
function formatIDR(raw: string): string {
  const num = parseInt(raw.replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
}

// ── Shared step layout ────────────────────────────────────────
function StepShell({
  children,
  step,
  totalSteps,
}: {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white px-6 pb-10 pt-14 animate-fade-in">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step
                ? 'w-8 bg-indigo-400'
                : i < step
                ? 'w-4 bg-indigo-600/60'
                : 'w-4 bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// ── STEP 0 — WELCOME ─────────────────────────────────────────
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <StepShell step={0} totalSteps={4}>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        {/* Illustration */}
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-2">
            <TrendingUp size={52} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
            <Sparkles size={16} className="text-amber-900" />
          </div>
        </div>

        <div className="space-y-3 max-w-xs">
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            Selamat datang di<br />
            <span className="text-indigo-400">OmniWealth</span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Mari bangun kerajaan finansialmu. Setup hanya butuh 60 detik.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {['📊 Lacak aset', '💡 Insight AI', '🔒 Data lokal', '📱 PWA offline'].map((f) => (
            <span key={f} className="text-xs bg-white/[0.07] border border-white/10 rounded-full px-3 py-1 text-white/60">
              {f}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl py-4 font-bold text-base transition-all shadow-xl shadow-indigo-500/30"
      >
        Mulai Setup <ArrowRight size={18} />
      </button>
    </StepShell>
  );
}

// ── STEP 1 — INCOME ──────────────────────────────────────────
function StepIncome({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const handleInput = (raw: string) => {
    // Strip non-digits and store raw number string
    onChange(raw.replace(/\D/g, ''));
  };

  const isValid = parseInt(value || '0', 10) > 0;

  return (
    <StepShell step={1} totalSteps={4}>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-8 w-fit transition-colors">
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="flex-1 flex flex-col gap-6">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h2 className="text-2xl font-black">Pemasukan Bulanan</h2>
          <p className="text-white/40 text-sm">Berapa pemasukan rutin bulananmu? (Dalam IDR)</p>
        </div>

        {/* IDR Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">
            Rp
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={formatIDR(value)}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="0"
            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-xl font-black text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.09] transition-all"
          />
        </div>

        {/* Shortcut amounts */}
        <div className="grid grid-cols-3 gap-2">
          {[3_000_000, 5_000_000, 8_000_000, 10_000_000, 15_000_000, 20_000_000].map((amt) => (
            <button
              key={amt}
              onClick={() => onChange(String(amt))}
              className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                value === String(amt)
                  ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
                  : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]'
              }`}
            >
              {(amt / 1_000_000).toFixed(0)}Jt
            </button>
          ))}
        </div>

        <p className="text-white/20 text-xs text-center">
          Data disimpan hanya di perangkatmu. Tidak dikirim ke server.
        </p>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] rounded-2xl py-4 font-bold text-base transition-all shadow-xl shadow-indigo-500/30 mt-6"
      >
        Lanjut <ArrowRight size={18} />
      </button>
    </StepShell>
  );
}

// ── STEP 2 — BANK SETUP ──────────────────────────────────────
function StepBank({
  bankName,
  balance,
  onBankChange,
  onBalanceChange,
  onNext,
  onBack,
}: {
  bankName:        string;
  balance:         string;
  onBankChange:    (v: string) => void;
  onBalanceChange: (v: string) => void;
  onNext:  () => void;
  onBack:  () => void;
}) {
  const handleBalance = (raw: string) => {
    onBalanceChange(raw.replace(/\D/g, ''));
  };

  const isValid = bankName.trim().length > 0 && parseInt(balance || '0', 10) >= 0;

  return (
    <StepShell step={2} totalSteps={4}>
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-8 w-fit transition-colors">
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="flex-1 flex flex-col gap-5">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mb-4">
            <Landmark size={22} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-black">Rekening Utama</h2>
          <p className="text-white/40 text-sm">Di mana kamu menyimpan uangmu?</p>
        </div>

        {/* Quick-select bank grid */}
        <div className="grid grid-cols-4 gap-2">
          {BANK_OPTIONS.slice(0, 8).map((bank) => (
            <button
              key={bank.name}
              onClick={() => onBankChange(bank.name)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                bankName === bank.name
                  ? 'border-indigo-500/60 bg-indigo-600/20'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
              }`}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ backgroundColor: bank.color + '33', color: bank.color }}
              >
                {bank.icon}
              </span>
              <span className="text-[10px] text-white/50 font-medium">{bank.name}</span>
            </button>
          ))}
        </div>

        {/* Or type custom name */}
        <div>
          <label className="text-xs text-white/30 font-semibold mb-1.5 block uppercase tracking-wide">
            Atau tulis nama bank
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => onBankChange(e.target.value)}
            placeholder="Nama bank / e-wallet"
            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>

        {/* Initial balance */}
        <div>
          <label className="text-xs text-white/30 font-semibold mb-1.5 block uppercase tracking-wide">
            Saldo saat ini (IDR)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">Rp</div>
            <input
              type="text"
              inputMode="numeric"
              value={formatIDR(balance)}
              onChange={(e) => handleBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-base font-black text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] rounded-2xl py-4 font-bold text-base transition-all shadow-xl shadow-indigo-500/30 mt-6"
      >
        Lanjut <ArrowRight size={18} />
      </button>
    </StepShell>
  );
}

// ── STEP 3 — FINISH ──────────────────────────────────────────
function StepFinish({
  data,
  onFinish,
  onBack,
}: {
  data: OnboardingData;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleFinish = () => {
    setLoading(true);
    // Small delay for feel — store ops are sync
    setTimeout(() => {
      onFinish();
    }, 800);
  };

  return (
    <StepShell step={3} totalSteps={4}>
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-8 w-fit transition-colors">
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        {/* Success icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <CheckCircle2 size={44} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-1 -right-1 text-2xl">🎉</div>
        </div>

        <div className="space-y-2 max-w-xs">
          <h2 className="text-2xl font-black">Siap jelajahi!</h2>
          <p className="text-white/40 text-sm">Data kamu sudah dikonfigurasi. Yuk mulai tracking finansialmu.</p>
        </div>

        {/* Summary card */}
        <div className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4 text-left space-y-3">
          <SummaryRow label="Pemasukan bulanan" value={`Rp ${data.monthlyIncome.toLocaleString('id-ID')}`} />
          <SummaryRow label="Rekening" value={data.bankName} />
          <SummaryRow label="Saldo awal" value={`Rp ${data.initialBalance.toLocaleString('id-ID')}`} />
        </div>
      </div>

      <button
        onClick={handleFinish}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 active:scale-[0.98] rounded-2xl py-4 font-bold text-base transition-all shadow-xl shadow-indigo-500/30 mt-6"
      >
        {loading
          ? <><span className="animate-spin">⏳</span> Menyimpan…</>
          : <>🚀 Mulai Jelajahi Insight</>
        }
      </button>
    </StepShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

// ── MAIN WIZARD COMPONENT ─────────────────────────────────────
export function OnboardingWizard() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step,    setStep]    = useState(0);
  const [income,  setIncome]  = useState('');
  const [bank,    setBank]    = useState('');
  const [balance, setBalance] = useState('');

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleFinish = () => {
    completeOnboarding({
      monthlyIncome:  parseInt(income  || '0', 10),
      bankName:       bank  || 'Cash',
      initialBalance: parseInt(balance || '0', 10),
    });
  };

  switch (step) {
    case 0:
      return <StepWelcome onNext={goNext} />;
    case 1:
      return <StepIncome value={income} onChange={setIncome} onNext={goNext} onBack={goBack} />;
    case 2:
      return (
        <StepBank
          bankName={bank} balance={balance}
          onBankChange={setBank} onBalanceChange={setBalance}
          onNext={goNext} onBack={goBack}
        />
      );
    case 3:
      return (
        <StepFinish
          data={{
            monthlyIncome:  parseInt(income  || '0', 10),
            bankName:       bank  || 'Cash',
            initialBalance: parseInt(balance || '0', 10),
          }}
          onFinish={handleFinish}
          onBack={goBack}
        />
      );
    default:
      return null;
  }
}
