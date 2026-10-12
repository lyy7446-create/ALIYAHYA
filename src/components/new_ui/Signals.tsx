import React from 'react';
import { TradingSignal } from '../../types';

interface SignalsProps {
  allSignals: TradingSignal[];
}

export const Signals: React.FC<SignalsProps> = ({ allSignals }) => {
  return (
    <div className="w-full px-1 sm:px-2 pb-24 space-y-3.5 animate-in fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>سجل وتاريخ الإشارات الصادرة</span>
        </h1>
        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">إجمالي الصفقات ({allSignals.length})</span>
      </div>
      <div className="space-y-2.5 w-full">
        {allSignals.map((signal) => {
          const isBuy = signal.type.includes('BUY');
          const typeArabic = signal.type.includes('BUY') ? 'شراء' : 'بيع';
          const statusArabic = 
            signal.status === 'Active' ? 'نشطة' :
            signal.status === 'Pending' ? 'معلقة' :
            signal.status === 'TP1' ? 'هدف 1 محقق' :
            signal.status === 'TP2' ? 'هدف 2 محقق' :
            signal.status === 'TP3' ? 'هدف 3 محقق' :
            signal.status === 'SL' ? 'ضرب الوقف' :
            signal.status === 'Cancelled' ? 'ملغاة' : 'منتهية';

          return (
            <div key={signal.id} className="w-full glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/[0.07] hover:border-slate-700 transition-all">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-white text-sm">{signal.market}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black font-sans uppercase ${isBuy ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                    {typeArabic}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    فريم {signal.timeframe || 'M15'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#D4AF37] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {signal.qualityScore}% دقة
                  </span>
                  <span className={`text-[10px] font-bold font-sans px-2 py-0.5 rounded ${
                    signal.status === 'Active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    signal.status === 'Pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    signal.status?.startsWith('TP') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {statusArabic}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] uppercase font-mono">
                <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                  <p className="text-slate-400 font-sans text-[9px]">الدخول</p>
                  <p className="font-bold text-white text-xs mt-0.5">{signal.entry.toFixed(signal.market === 'EURUSD' ? 5 : 2)}</p>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                  <p className="text-rose-400 font-sans text-[9px]">وقف الخسارة</p>
                  <p className="font-bold text-rose-400 text-xs mt-0.5">{signal.sl.toFixed(signal.market === 'EURUSD' ? 5 : 2)}</p>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                  <p className="text-emerald-400 font-sans text-[9px]">الهدف 1</p>
                  <p className="font-bold text-emerald-400 text-xs mt-0.5">{signal.tp1.toFixed(signal.market === 'EURUSD' ? 5 : 2)}</p>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                  <p className="text-emerald-400 font-sans text-[9px]">الهدف 2</p>
                  <p className="font-bold text-emerald-400 text-xs mt-0.5">{signal.tp2.toFixed(signal.market === 'EURUSD' ? 5 : 2)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {allSignals.length === 0 && (
          <div className="w-full glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
            لا توجد إشارات مسجلة حالياً
          </div>
        )}
      </div>
    </div>
  );
};
