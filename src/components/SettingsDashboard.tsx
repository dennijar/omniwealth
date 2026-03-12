// ============================================================
// OmniWealth – SettingsDashboard.tsx
// iOS-style settings panel with:
//   • Preferences:  Dark Mode toggle, Currency select
//   • Data:         Export JSON backup
//   • Danger Zone:  Reset All Data (with confirmation dialog)
//   • About:        App version info
// ============================================================

import { useState } from 'react';
import {
  Moon, Sun, DollarSign, Download, Trash2,
  Info, ChevronRight, Shield, RefreshCw,
  AlertTriangle, X, Check,
} from 'lucide-react';
import { useAppStore, type CurrencySymbol } from '../store/useAppStore';

// ── Reusable section header ───────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6 pb-1.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </p>
    </div>
  );
}

// ── Reusable settings row ─────────────────────────────────────
interface RowProps {
  icon:      React.ReactNode;
  iconBg:    string;
  label:     string;
  sublabel?: string;
  right?:    React.ReactNode;
  danger?:   boolean;
  onClick?:  () => void;
}

function SettingsRow({ icon, iconBg, label, sublabel, right, danger = false, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !right}
      className={`
        w-full flex items-center gap-3.5 px-4 py-3.5
        bg-white dark:bg-slate-800/60
        border-b border-slate-100 dark:border-slate-700/50
        last:border-b-0
        transition-colors duration-150
        ${onClick ? 'active:bg-slate-50 dark:active:bg-slate-700/50 cursor-pointer' : 'cursor-default'}
        ${danger ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}
      `}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>

      {/* Label */}
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-semibold leading-tight ${danger ? 'text-rose-500' : ''}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sublabel}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {right ?? (onClick && !danger && <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />)}
      </div>
    </button>
  );
}

// ── iOS-style toggle ──────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`
        relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
        ${enabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// ── Confirmation dialog ───────────────────────────────────────
function ResetConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={28} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Reset Semua Data?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Semua data rekening, transaksi, dan investasi akan <strong>dihapus permanen</strong> dan tidak bisa dipulihkan.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white rounded-2xl py-3.5 font-bold text-sm transition-all"
          >
            <Trash2 size={16} /> Ya, Hapus Semua
          </button>
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-[0.98] text-slate-700 dark:text-slate-200 rounded-2xl py-3.5 font-bold text-sm transition-all"
          >
            <X size={16} /> Batalkan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export function SettingsDashboard() {
  const darkMode      = useAppStore((s) => s.darkMode);
  const currency      = useAppStore((s) => s.currency);
  const setDarkMode   = useAppStore((s) => s.setDarkMode);
  const setCurrency   = useAppStore((s) => s.setCurrency);
  const exportData    = useAppStore((s) => s.exportData);
  const resetAllData  = useAppStore((s) => s.resetAllData);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [exported,        setExported]        = useState(false);

  const handleExport = () => {
    exportData();
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const handleReset = () => {
    setShowResetDialog(false);
    // Small delay so dialog can close visually
    setTimeout(() => resetAllData(), 150);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-10">

        {/* ── Page Title ─────────────────────────────────────── */}
        <div className="px-4 pt-8 pb-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pengaturan</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">OmniWealth v6.0</p>
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION: PREFERENCES
        ════════════════════════════════════════════════════ */}
        <SectionHeader title="Preferensi" />
        <div className="mx-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700/50">

          {/* Dark Mode toggle */}
          <SettingsRow
            icon={darkMode ? <Moon size={16} className="text-white" /> : <Sun size={16} className="text-white" />}
            iconBg={darkMode ? 'bg-indigo-500' : 'bg-amber-400'}
            label="Dark Mode"
            sublabel={darkMode ? 'Aktif — tampilan gelap' : 'Nonaktif — tampilan terang'}
            right={
              <Toggle
                enabled={darkMode}
                onToggle={() => setDarkMode(!darkMode)}
              />
            }
          />

          {/* Currency select */}
          <SettingsRow
            icon={<DollarSign size={16} className="text-white" />}
            iconBg="bg-emerald-500"
            label="Simbol Mata Uang"
            sublabel={`Tampilan: ${currency === 'Rp' ? 'Rupiah (Rp)' : 'US Dollar ($)'}`}
            right={
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 appearance-none focus:outline-none"
              >
                <option value="Rp">Rp</option>
                <option value="$">$</option>
              </select>
            }
          />
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION: DATA & BACKUP
        ════════════════════════════════════════════════════ */}
        <SectionHeader title="Data & Backup" />
        <div className="mx-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700/50">
          <SettingsRow
            icon={exported
              ? <Check size={16} className="text-white" />
              : <Download size={16} className="text-white" />
            }
            iconBg={exported ? 'bg-emerald-500' : 'bg-blue-500'}
            label="Export Data (JSON)"
            sublabel={exported ? 'File berhasil diunduh!' : 'Unduh semua data sebagai file backup'}
            onClick={handleExport}
          />
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION: DANGER ZONE
        ════════════════════════════════════════════════════ */}
        <SectionHeader title="Zona Berbahaya" />
        <div className="mx-3 rounded-2xl overflow-hidden shadow-sm border border-rose-200 dark:border-rose-900/40">
          <SettingsRow
            icon={<Trash2 size={16} className="text-white" />}
            iconBg="bg-rose-500"
            label="Reset Semua Data"
            sublabel="Hapus semua rekening, transaksi, dan investasi"
            danger
            onClick={() => setShowResetDialog(true)}
          />
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION: TENTANG APLIKASI
        ════════════════════════════════════════════════════ */}
        <SectionHeader title="Tentang" />
        <div className="mx-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700/50">
          <SettingsRow
            icon={<Shield size={16} className="text-white" />}
            iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
            label="OmniWealth"
            sublabel="Versi 6.0 · Local-first PWA · Data tersimpan di perangkatmu"
          />
          <SettingsRow
            icon={<Info size={16} className="text-white" />}
            iconBg="bg-slate-400"
            label="Data Privacy"
            sublabel="Semua data disimpan lokal. Tidak ada server, tidak ada cloud."
          />
          <SettingsRow
            icon={<RefreshCw size={16} className="text-white" />}
            iconBg="bg-teal-500"
            label="PWA Offline Ready"
            sublabel="App berjalan 100% offline setelah install pertama"
          />
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-slate-300 dark:text-slate-700 mt-8 px-4">
          OmniWealth © 2025 · Local-first Wealth Manager PWA
        </p>
      </div>

      {/* Reset confirmation dialog */}
      {showResetDialog && (
        <ResetConfirmDialog
          onConfirm={handleReset}
          onCancel={() => setShowResetDialog(false)}
        />
      )}
    </>
  );
}
