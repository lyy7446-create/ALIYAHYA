import React, { useState, useEffect } from 'react';
import { TradingSignal, MarketSymbol } from '../types';
import { MARKET_BASES } from '../utils/marketEngine';
import { X, Check, ArrowUpRight, ArrowDownRight, Target, Shield, Zap, TrendingUp, DollarSign } from 'lucide-react';

interface EditLimitOrderModalProps {
  isOpen?: boolean;
  onClose: () => void;
  signal: TradingSignal | null;
  currentPrice: number;
  onSave: (updated: TradingSignal) => void;
  onActivateNow?: (id: string) => void;
  theme?: 'dark' | 'light';
}

export const EditLimitOrderModal: React.FC<EditLimitOrderModalProps> = ({
  isOpen = true,
  onClose,
  signal,
  currentPrice,
  onSave,
  onActivateNow,
  theme = 'dark',
}) => {
  if (!isOpen || !signal) return null;

  const marketMeta = MARKET_BASES[signal.market as MarketSymbol] || { digits: 2, step: 0.1 };
  const digits = marketMeta.digits || 2;
  const isBuy = signal.type.includes('BUY');

  const [entry, setEntry] = useState<number>(signal.entry);
  const [sl, setSl] = useState<number>(signal.sl);
  const [tp1, setTp1] = useState<number>(signal.tp1);
  const [tp2, setTp2] = useState<number>(signal.tp2 || signal.tp1);
  const [tp3, setTp3] = useState<number>(signal.tp3 || signal.tp2 || signal.tp1);

  // Synchronize initial values when signal changes
  useEffect(() => {
    if (signal) {
      setEntry(signal.entry);
      setSl(signal.sl);
      setTp1(signal.tp1);
      setTp2(signal.tp2 || signal.tp1);
      setTp3(signal.tp3 || signal.tp2 || signal.tp1);
    }
  }, [signal]);

  // Adjust values by delta pips/points
  const adjustValue = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    currentVal: number,
    deltaPips: number
  ) => {
    const factorMultiplier = signal.market === 'XAUUSD' ? 10.0 : 10000.0;
    const pipUnit = 1 / factorMultiplier;
    const nextVal = parseFloat((currentVal + deltaPips * pipUnit).toFixed(digits));
    setter(nextVal);
  };

  const handleSave = () => {
    const updated: TradingSignal = {
      ...signal,
      entry: parseFloat(entry.toFixed(digits)),
      sl: parseFloat(sl.toFixed(digits)),
      tp1: parseFloat(tp1.toFixed(digits)),
      tp2: parseFloat(tp2.toFixed(digits)),
      tp3: parseFloat(tp3.toFixed(digits)),
    };
    onSave(updated);
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark 
            ? 'bg-[#0f0f15] border-[#262638] text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#20202d] bg-[#14141c]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isBuy 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {isBuy ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-sans">تعديل مستويات الأمر المعلق</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  isBuy 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {signal.type}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {signal.market}
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                السعر المباشر الحالي: <span className="font-mono font-bold text-amber-400">{currentPrice.toFixed(digits)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Entry Price */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#12121b] border-[#1e1e2d]' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <Target size={14} className="text-amber-400" />
                <span>سعر الدخول المستهدف (Entry Price):</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(setEntry, entry, -10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700/40 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(setEntry, entry, +10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700/40 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  +10
                </button>
              </div>
            </div>
            <input
              type="number"
              step={marketMeta.step}
              value={entry}
              onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
              className={`w-full py-2 px-3 rounded-lg border font-mono font-bold text-sm text-center outline-none transition-all ${
                isDark 
                  ? 'bg-[#0b0b10] border-amber-500/40 text-amber-300 focus:border-amber-400' 
                  : 'bg-white border-amber-400 text-amber-700 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Stop Loss */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#12121b] border-[#1e1e2d]' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
                <Shield size={14} className="text-rose-400" />
                <span>وقف الخسارة (Stop Loss):</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(setSl, sl, -10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition-all cursor-pointer"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(setSl, sl, +10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition-all cursor-pointer"
                >
                  +10
                </button>
              </div>
            </div>
            <input
              type="number"
              step={marketMeta.step}
              value={sl}
              onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
              className={`w-full py-2 px-3 rounded-lg border font-mono font-bold text-sm text-center outline-none transition-all ${
                isDark 
                  ? 'bg-[#0b0b10] border-rose-500/40 text-rose-300 focus:border-rose-400' 
                  : 'bg-white border-rose-400 text-rose-700 focus:border-rose-500'
              }`}
            />
          </div>

          {/* Take Profit 1, 2, 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* TP1 */}
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12121b] border-[#1e1e2d]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-400">الهدف 1 (TP1)</span>
              </div>
              <input
                type="number"
                step={marketMeta.step}
                value={tp1}
                onChange={(e) => setTp1(parseFloat(e.target.value) || 0)}
                className={`w-full py-1.5 px-2 rounded-lg border font-mono font-bold text-xs text-center outline-none ${
                  isDark 
                    ? 'bg-[#0b0b10] border-emerald-500/30 text-emerald-300' 
                    : 'bg-white border-emerald-400 text-emerald-700'
                }`}
              />
            </div>

            {/* TP2 */}
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12121b] border-[#1e1e2d]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-400">الهدف 2 (TP2)</span>
              </div>
              <input
                type="number"
                step={marketMeta.step}
                value={tp2}
                onChange={(e) => setTp2(parseFloat(e.target.value) || 0)}
                className={`w-full py-1.5 px-2 rounded-lg border font-mono font-bold text-xs text-center outline-none ${
                  isDark 
                    ? 'bg-[#0b0b10] border-emerald-500/30 text-emerald-300' 
                    : 'bg-white border-emerald-400 text-emerald-700'
                }`}
              />
            </div>

            {/* TP3 */}
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12121b] border-[#1e1e2d]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-400">الهدف 3 (TP3)</span>
              </div>
              <input
                type="number"
                step={marketMeta.step}
                value={tp3}
                onChange={(e) => setTp3(parseFloat(e.target.value) || 0)}
                className={`w-full py-1.5 px-2 rounded-lg border font-mono font-bold text-xs text-center outline-none ${
                  isDark 
                    ? 'bg-[#0b0b10] border-emerald-500/30 text-emerald-300' 
                    : 'bg-white border-emerald-400 text-emerald-700'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
          isDark ? 'border-[#20202d] bg-[#14141c]' : 'border-slate-100 bg-slate-50'
        }`}>
          {onActivateNow && (
            <button
              type="button"
              onClick={() => onActivateNow(signal.id)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
            >
              <Zap size={14} className="text-yellow-300 fill-current animate-pulse" />
              <span>تفعيل فوري بسعر السوق ⚡</span>
            </button>
          )}

          <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isDark ? 'bg-[#1e1e2c] hover:bg-[#28283b] text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#e6c15c] text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Check size={14} className="stroke-[3]" />
              <span>حفظ التعديلات ✅</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
