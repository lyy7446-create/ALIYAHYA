import React from 'react';
import { TradingSignal, MarketSymbol } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Clock, 
  Target, 
  Zap, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface LatestSignalsSectionProps {
  signals: TradingSignal[];
  onSelectSignal: (signal: TradingSignal) => void;
  onOpenAllSignals?: () => void;
}

export const LatestSignalsSection: React.FC<LatestSignalsSectionProps> = ({
  signals,
  onSelectSignal,
  onOpenAllSignals,
}) => {
  // Filter out any mock/fake signals
  const realSignals = (signals || []).filter(
    (s) => s && s.id && !s.id.startsWith('sig-mock-') && !s.id.includes('demo') && !s.id.includes('fake')
  );

  const displayList = realSignals;

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 rounded-full bg-gradient-to-b from-amber-400 to-[#D4AF37]" />
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>سجل التوصيات الصادرة</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {displayList.length} صفقة
            </span>
          </h3>
        </div>

        {onOpenAllSignals && (
          <button
            onClick={onOpenAllSignals}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>عرض كل الصفقات</span>
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {displayList.length === 0 ? (
        <div className="p-8 text-center institutional-card rounded-2xl border border-white/[0.06] text-slate-400 text-xs space-y-2">
          <Target size={28} className="mx-auto text-amber-400/60 animate-pulse" />
          <p className="font-bold text-slate-300">لا توجد توصيات سابقة بعد</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            يقوم النظام بإصدار التوصيات الحقيقية تلقائياً كلما توافرت شروط كسر الهيكل وكتل الأوامر غير الملموسة (Zero Drawdown).
          </p>
        </div>
      ) : (
      /* Grid of Institutional Signal Cards */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {displayList.map((sig) => {
          const isBuy = sig.type.includes('BUY');
          const isSell = sig.type.includes('SELL');

          // Status translation & badge
          let statusText = 'قيد الانتظار';
          let statusColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
          if (sig.status === 'Active') {
            statusText = 'مفعلة مباشرة';
            statusColor = 'text-sky-300 bg-sky-500/15 border-sky-500/30';
          } else if (sig.status.startsWith('TP')) {
            statusText = `حقق الهدف (${sig.status})`;
            statusColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
          } else if (sig.status === 'SL') {
            statusText = 'وقف خسارة';
            statusColor = 'text-rose-300 bg-rose-500/15 border-rose-500/30';
          }

          const digits = sig.market === 'EURUSD' ? 5 : 2;

          return (
            <div
              key={sig.id}
              onClick={() => onSelectSignal(sig)}
              className={`institutional-card rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer hover:border-slate-600 relative overflow-hidden group hover:scale-[1.008] ${
                isBuy ? 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
              }`}
            >
              {/* Top Row: Symbol, Direction, Strength & Time */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black font-mono tracking-wider text-white">
                    {sig.market}
                  </span>
                  
                  {/* BUY / SELL Badge with exact colors */}
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono tracking-wider flex items-center gap-1 border ${
                      isBuy
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-rose-950/70 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    }`}
                  >
                    {isBuy ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{sig.type}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Signal Strength Badge */}
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    قوة {sig.quality || 'A+'} ({sig.qualityScore || 98}%)
                  </span>
                  
                  {/* Status */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusColor}`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {/* Entry Zone Row */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 mb-3 flex items-center justify-between text-right">
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 block">
                    منطقة الدخول (Entry Zone):
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-amber-300 tabular-nums">
                    {sig.zoneMax ? `${sig.zoneMax.toFixed(digits)} – ${sig.zoneMin?.toFixed(digits)}` : `${sig.entry.toFixed(digits)}`}
                  </span>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[10px] text-slate-400 block">العائد للمخاطرة</span>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    R:R 1:6+
                  </span>
                </div>
              </div>

              {/* Targets (TP1, TP2, TP3) & SL Grid */}
              <div className="grid grid-cols-4 gap-2 mb-3 text-center font-mono">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[9.5px] text-slate-400 block font-sans">TP 1</span>
                  <span className="text-[11.5px] font-bold text-emerald-400 tabular-nums">
                    {sig.tp1.toFixed(digits)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[9.5px] text-slate-400 block font-sans">TP 2</span>
                  <span className="text-[11.5px] font-bold text-emerald-400 tabular-nums">
                    {sig.tp2.toFixed(digits)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[9.5px] text-slate-400 block font-sans">TP 3</span>
                  <span className="text-[11.5px] font-bold text-emerald-400 tabular-nums">
                    {sig.tp3.toFixed(digits)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20">
                  <span className="text-[9.5px] text-rose-300 block font-sans">SL (الوقف)</span>
                  <span className="text-[11.5px] font-bold text-rose-400 tabular-nums">
                    {sig.sl.toFixed(digits)}
                  </span>
                </div>
              </div>

              {/* Footer: Time & Action Hint */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 font-mono">
                  <Clock size={12} className="text-slate-500" />
                  <span>{sig.time}</span>
                  <span className="text-slate-600">·</span>
                  <span>{sig.timeframe || '15M'}</span>
                </div>

                <div className="flex items-center gap-1 text-amber-400 font-bold group-hover:text-amber-300 transition-colors">
                  <span>تفاصيل التحليل المؤسسي</span>
                  <ChevronLeft size={13} className="group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>

            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
