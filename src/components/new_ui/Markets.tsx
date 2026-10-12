import React from 'react';
import { MarketSymbol } from '../../types';

interface MarketsProps {
  currentMarket: MarketSymbol;
  setMarket: (market: MarketSymbol) => void;
  currentPrices: Record<string, number>;
}

export const Markets: React.FC<MarketsProps> = ({ currentMarket, setMarket, currentPrices }) => {
  const markets: MarketSymbol[] = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'US30', 'NAS100'];

  return (
    <div className="w-full px-1 sm:px-2 pb-24 space-y-3.5 animate-in fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>الأسواق المتاحة</span>
        </h1>
        <span className="text-[10px] text-slate-400 font-sans font-bold uppercase">الأسواق المؤسسية المعتمدة</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full">
        {markets.map((symbol) => (
          <button
            key={symbol}
            onClick={() => setMarket(symbol)}
            className={`w-full glass-panel p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all border text-right cursor-pointer select-none ${
              currentMarket === symbol 
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)] bg-gradient-to-r from-amber-500/10 to-slate-900/90' 
                : 'border-white/[0.06] hover:border-slate-700 bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                currentMarket === symbol
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-white/5 text-slate-400'
              }`}>
                {symbol.substring(0, 3)}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-white text-sm font-mono">{symbol}</h3>
                  {currentMarket === symbol && (
                    <span className="text-[9px] font-sans text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">نشط</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-sans">
                  {symbol === 'XAUUSD' ? 'الذهب مقابل الدولار الأمريكي' : 
                   symbol === 'EURUSD' ? 'اليورو مقابل الدولار الأمريكي' :
                   symbol === 'GBPUSD' ? 'الجنيه الإسترليني مقابل الدولار' :
                   symbol === 'BTCUSD' ? 'البيتكوين مقابل الدولار' : 
                   symbol === 'US30' ? 'مؤشر داو جونز الصناعي' : 
                   symbol === 'NAS100' ? 'مؤشر ناسداك التكنولوجي' : 'أزواج العملات العالمية'}
                </p>
              </div>
            </div>
            <div className="text-left font-mono">
              <p className="font-black text-white text-sm tabular-nums">
                {currentPrices[symbol] ? currentPrices[symbol].toFixed(symbol === 'EURUSD' ? 5 : 2) : '0.00'}
              </p>
              <p className="text-[10px] text-emerald-400 font-bold font-mono">+0.12%</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
