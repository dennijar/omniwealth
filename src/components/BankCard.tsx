// ============================================================
// OmniWealth – BankCard Component
// Live balance card per bank account
// ============================================================

import React from 'react';
import { Trash2, CreditCard, Landmark } from 'lucide-react';
import { BankAccount } from '../types/fiat';
import { formatIDR, formatCompact } from '../utils/format';
import { useFiatStore } from '../store/useFiatStore';

interface BankCardProps {
  account: BankAccount;
  isSelected?: boolean;
  onClick?: () => void;
}

export const BankCard: React.FC<BankCardProps> = ({ account, isSelected, onClick }) => {
  const getBalanceByBank = useFiatStore((s) => s.getBalanceByBank);
  const removeBankAccount = useFiatStore((s) => s.removeBankAccount);
  const balance = getBalanceByBank(account.id);
  const isNegative = balance < 0;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove ${account.bank_name} account? All related transactions will be deleted.`)) {
      removeBankAccount(account.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 w-64 rounded-2xl p-5 cursor-pointer transition-all duration-200 select-none
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]' : 'hover:scale-[1.01]'}`}
      style={{ background: `linear-gradient(135deg, ${account.color}DD 0%, ${account.color}99 100%)` }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm backdrop-blur-sm">
            {account.icon.length === 1 ? account.icon : <span className="text-lg">{account.icon}</span>}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{account.bank_name}</p>
            <p className="text-white/60 text-xs">{account.currency}</p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/50 flex items-center justify-center transition-colors"
        >
          <Trash2 size={13} className="text-white/70" />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-3">
        <p className="text-white/50 text-xs mb-0.5">Current Balance</p>
        <p className={`text-white font-bold text-xl leading-tight ${isNegative ? 'text-red-300' : ''}`}>
          {formatCompact(balance)}
        </p>
        <p className="text-white/40 text-xs mt-0.5">{formatIDR(balance)}</p>
      </div>

      {/* Account Number */}
      {account.account_number && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/20">
          <CreditCard size={12} className="text-white/50" />
          <p className="text-white/50 text-xs font-mono">{account.account_number}</p>
        </div>
      )}
      {!account.account_number && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/20">
          <Landmark size={12} className="text-white/50" />
          <p className="text-white/50 text-xs">Cash Account</p>
        </div>
      )}
    </div>
  );
};
