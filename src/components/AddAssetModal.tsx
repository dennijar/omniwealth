// ============================================================
// OmniWealth – AddAssetModal.tsx
// Form modal for adding a new investment asset
// ============================================================

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useMarketStore } from '../store/useMarketStore';
import type { AssetClass, CreateAssetPayload } from '../types/market';
import { ASSET_CLASS_CONFIG } from '../store/useMarketStore';
import { useAppStore } from '../store/useAppStore';

interface Props {
  onClose: () => void;
  onAdded?: () => void;
}

const SECTOR_OPTIONS: Record<AssetClass, string[]> = {
  STOCK:       ['Financials', 'Technology', 'Telecommunications', 'Consumer', 'Energy', 'Healthcare', 'Other'],
  CRYPTO:      ['Layer 1', 'Layer 2', 'DeFi', 'Exchange Token', 'NFT/Gaming', 'Stablecoin', 'Other'],
  REAL_ESTATE: ['Residential', 'Commercial', 'Land', 'Industrial', 'Other'],
  COMMODITY:   ['Gold', 'Silver', 'Oil', 'Agricultural', 'Other'],
  MUTUAL_FUND: ['Equity Fund', 'Fixed Income', 'Money Market', 'Balanced Fund', 'Other'],
};

const CRYPTO_EXAMPLES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB',
  ADA: 'Cardano', DOGE: 'Dogecoin', MATIC: 'Polygon', LINK: 'Chainlink',
};

export const AddAssetModal: React.FC<Props> = ({ onClose, onAdded }) => {
  const addAsset       = useMarketStore((s) => s.addAsset);
  const syncMarketData = useMarketStore((s) => s.syncMarketData);
  const setModalOpen   = useAppStore((s) => s.setModalOpen);

  React.useEffect(() => {
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [setModalOpen]);

  const [form, setForm] = useState<{
    name: string;
    symbol: string;
    asset_class: AssetClass;
    quantity: string;
    average_buy_price: string;
    manual_valuation: string;
    sector: string;
    currency: string;
  }>({
    name:              '',
    symbol:            '',
    asset_class:       'STOCK',
    quantity:          '',
    average_buy_price: '',
    manual_valuation:  '',
    sector:            '',
    currency:          'IDR',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsManual  = form.asset_class === 'REAL_ESTATE' || form.asset_class === 'MUTUAL_FUND';
  const needsSymbol  = form.asset_class === 'STOCK' || form.asset_class === 'CRYPTO';
  const cfg          = ASSET_CLASS_CONFIG[form.asset_class];
  const sectors      = SECTOR_OPTIONS[form.asset_class];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())            return setError('Asset name is required.');
    if (!form.quantity || isNaN(parseFloat(form.quantity)) || parseFloat(form.quantity) <= 0)
      return setError('Valid quantity is required.');
    if (!form.average_buy_price || isNaN(parseFloat(form.average_buy_price)) || parseFloat(form.average_buy_price) <= 0)
      return setError('Valid average buy price is required.');

    const payload: CreateAssetPayload = {
      name:              form.name.trim(),
      symbol:            form.symbol.trim().toUpperCase() || undefined,
      asset_class:       form.asset_class,
      quantity:          parseFloat(form.quantity),
      average_buy_price: parseFloat(form.average_buy_price),
      manual_valuation:  form.manual_valuation ? parseFloat(form.manual_valuation) : undefined,
      sector:            form.sector || undefined,
      currency:          form.currency,
    };

    setLoading(true);
    await addAsset(payload);
    await syncMarketData();
    setLoading(false);
    onAdded?.();
    onClose();
  };

  const inputCls = `
    w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5
    text-white text-sm placeholder-white/20 outline-none
    focus:border-indigo-500/50 focus:bg-white/8 transition-all
  `;

  const labelCls = 'block text-white/50 text-xs font-medium mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0F1729] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: cfg.color + '22' }}>
              <Plus size={16} style={{ color: cfg.color }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Add Investment Asset</h3>
              <p className="text-white/30 text-xs">Enrich your portfolio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide">

          {/* Asset Class Tabs */}
          <div>
            <label className={labelCls}>Asset Class</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(ASSET_CLASS_CONFIG) as AssetClass[]).map((cls) => {
                const c = ASSET_CLASS_CONFIG[cls];
                const active = form.asset_class === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => { set('asset_class', cls); set('sector', ''); set('symbol', ''); }}
                    className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                      active
                        ? 'border-current text-white'
                        : 'border-white/10 text-white/30 hover:border-white/20'
                    }`}
                    style={active ? { borderColor: c.color, backgroundColor: c.color + '22', color: c.color } : {}}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name + Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Asset Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. Apple Inc."
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            {needsSymbol && (
              <div>
                <label className={labelCls}>
                  Symbol
                  {form.asset_class === 'CRYPTO' && (
                    <span className="ml-1 text-white/25">(BTC, ETH…)</span>
                  )}
                  {form.asset_class === 'STOCK' && (
                    <span className="ml-1 text-white/25">(BBCA.JK…)</span>
                  )}
                </label>
                <input
                  className={inputCls}
                  placeholder={form.asset_class === 'CRYPTO' ? 'BTC' : 'BBCA.JK'}
                  value={form.symbol}
                  onChange={(e) => set('symbol', e.target.value.toUpperCase())}
                />
                {/* Crypto quick-fill */}
                {form.asset_class === 'CRYPTO' && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(CRYPTO_EXAMPLES).slice(0, 6).map(([sym, name]) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => { set('symbol', sym); set('name', name); }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity + Avg Buy Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                className={inputCls}
                type="number"
                step="any"
                min="0"
                placeholder={form.asset_class === 'CRYPTO' ? '0.05' : '100'}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Avg Buy Price (IDR) *</label>
              <input
                className={inputCls}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 8200"
                value={form.average_buy_price}
                onChange={(e) => set('average_buy_price', e.target.value)}
              />
            </div>
          </div>

          {/* Manual Valuation (REAL_ESTATE / MUTUAL_FUND) */}
          {needsManual && (
            <div>
              <label className={labelCls}>
                Current Valuation (IDR)
                <span className="ml-1 text-white/25">– manual appraisal / NAV</span>
              </label>
              <input
                className={inputCls}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 1850000000"
                value={form.manual_valuation}
                onChange={(e) => set('manual_valuation', e.target.value)}
              />
            </div>
          )}

          {/* Sector */}
          <div>
            <label className={labelCls}>Sector</label>
            <select
              className={inputCls + ' cursor-pointer'}
              value={form.sector}
              onChange={(e) => set('sector', e.target.value)}
            >
              <option value="">Select sector…</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${cfg.color}CC, ${cfg.color}88)` }}
          >
            {loading ? 'Syncing market data…' : 'Add Asset & Sync Prices'}
          </button>
        </form>
      </div>
    </div>
  );
};
