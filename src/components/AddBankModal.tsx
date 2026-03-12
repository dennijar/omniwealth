// ============================================================
// OmniWealth – AddBankModal
// Form to create a new Bank Account
// ============================================================

import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useFiatStore, BANK_OPTIONS } from '../store/useFiatStore';
import { useAppStore } from '../store/useAppStore';
import { Currency } from '../types/fiat';

interface AddBankModalProps {
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR'];

export const AddBankModal: React.FC<AddBankModalProps> = ({ onClose }) => {
  const addBankAccount = useFiatStore((s) => s.addBankAccount);
  const setModalOpen = useAppStore((s) => s.setModalOpen);

  React.useEffect(() => {
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [setModalOpen]);

  const [selectedBank, setSelectedBank] = useState(BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBankAccount({
      bank_name: selectedBank.name,
      account_number: accountNumber || undefined,
      initial_balance: parseFloat(initialBalance) || 0,
      currency,
      color: selectedBank.color,
      icon: selectedBank.icon,
    });
    setSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0F1729] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Add Bank Account</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={16} className="text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Bank Selection Grid */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Select Bank</label>
            <div className="grid grid-cols-5 gap-2">
              {BANK_OPTIONS.map((bank) => (
                <button
                  key={bank.name}
                  type="button"
                  onClick={() => setSelectedBank(bank)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    selectedBank.name === bank.name
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: bank.color + '99' }}
                  >
                    {bank.icon.length === 1 ? bank.icon : bank.icon}
                  </div>
                  <span className="text-white/60 text-xs truncate w-full text-center">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Account Number (Optional)</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="xxxx-xxxx-xxxx"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
            />
          </div>

          {/* Initial Balance + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Initial Balance</label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                required
                min="0"
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0F1729]">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview Card */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${selectedBank.color}AA 0%, ${selectedBank.color}66 100%)` }}
          >
            <div>
              <p className="text-white font-bold">{selectedBank.name}</p>
              <p className="text-white/60 text-sm">
                {parseFloat(initialBalance) > 0
                  ? new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0 }).format(parseFloat(initialBalance))
                  : `${currency} 0`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
              {selectedBank.icon}
            </div>
          </div>

          {/* Success State */}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-medium">
              <CheckCircle size={16} />
              Bank account added successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={success}
            className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm transition-all disabled:opacity-40"
          >
            Add Bank Account
          </button>
        </form>
      </div>
    </div>
  );
};
