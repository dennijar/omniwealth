// ============================================================
// OmniWealth – TransactionModal
// Full-featured form to log income / expense / transfer
// ============================================================

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useFiatStore, TRANSACTION_CATEGORIES } from '../store/useFiatStore';
import { TransactionType } from '../types/fiat';
import { format } from 'date-fns';

interface TransactionModalProps {
  onClose: () => void;
  defaultType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ onClose, defaultType = 'EXPENSE' }) => {
  const bankAccounts = useFiatStore((s) => s.bankAccounts);
  const addTransaction = useFiatStore((s) => s.addTransaction);
  const setModalOpen = useAppStore((s) => s.setModalOpen);

  React.useEffect(() => {
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [setModalOpen]);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [bankId, setBankId] = useState(bankAccounts[0]?.id ?? '');
  const [toBankId, setToBankId] = useState('');
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[defaultType][0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (t: TransactionType) => {
    setType(t);
    setCategory(TRANSACTION_CATEGORIES[t][0]);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId || !amount || !category) return;
    setLoading(true);

    const result = await addTransaction({
      bank_account_id: bankId,
      type,
      category,
      amount: parseFloat(amount.replace(/[^0-9.]/g, '')),
      date: new Date(date).toISOString(),
      description: description || undefined,
      transfer_to_account_id: type === 'TRANSFER' ? toBankId : undefined,
    });

    setLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Transaction recorded successfully!' });
      setTimeout(() => onClose(), 1200);
    } else {
      setFeedback({ type: 'error', message: result.warning ?? 'Failed to record transaction.' });
    }
  };

  const typeConfig = {
    INCOME: { label: 'Income', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
    EXPENSE: { label: 'Expense', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40' },
    TRANSFER: { label: 'Transfer', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0F1729] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Log Transaction</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={16} className="text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 pb-8">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  type === t ? typeConfig[t].bg + ' ' + typeConfig[t].color + ' border' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {typeConfig[t].label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Amount (IDR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Bank Account */}
          <div className={`grid ${type === 'TRANSFER' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                {type === 'TRANSFER' ? 'From Account' : 'Bank Account'}
              </label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#0F1729]">
                    {acc.bank_name} {acc.account_number ? `(${acc.account_number.slice(-4)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {type === 'TRANSFER' && (
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">To Account</label>
                <select
                  value={toBankId}
                  onChange={(e) => setToBankId(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#0F1729]">Select account</option>
                  {bankAccounts.filter((a) => a.id !== bankId).map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[#0F1729]">
                      {acc.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
            >
              {TRANSACTION_CATEGORIES[type].map((cat) => (
                <option key={cat} value={cat} className="bg-[#0F1729]">{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-red-500/20 border border-red-500/40 text-red-400'
            }`}>
              {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {feedback.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !bankId || !amount}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              type === 'INCOME'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : type === 'EXPENSE'
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-blue-500 hover:bg-blue-400 text-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {loading ? 'Processing...' : `Record ${typeConfig[type].label}`}
          </button>
        </form>
      </div>
    </div>
  );
};
