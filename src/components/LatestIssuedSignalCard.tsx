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
  Sparkles,
  Radio,
  Eye,
  Copy,
  Check
} from 'lucide-react';

interface LatestIssuedSignalCardProps {
  signal: TradingSignal | null;
  market: MarketSymbol;
  currentPrice?: number;
  onSelectSignal: (signal: TradingSignal) => void;
  onGenerateRealSignal?: () => void;
  isAnalyzing?: boolean;
}

export const LatestIssuedSignalCard: React.FC<LatestIssuedSignalCardProps> = ({
  signal,
  market,
  currentPrice,
  onSelectSignal,
  onGenerateRealSignal,
  isAnalyzing = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!signal) return;
    const text = `🎯 توصية جديدة صادرة AI MM VIP\nالرمز: ${signal.market}\nالنوع: ${signal.type}\nالدخول: ${signal.zoneMax ? `${signal.zoneMax} - ${signal.zoneMin}` : signal.entry}\nالهدف 1: ${signal.tp1}\nالهدف 2: ${signal.tp2}\nالهدف 3: ${signal.tp3}\nوقف الخسارة: ${signal.sl}\nمنطقة زيرو انعكاس`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // If no signal is currently issued by the system, show the active radar state with on-demand real analysis trigger
  if (!signal) {
    return (
      <div className="w-full institutional-card-gold rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden transition-all text-right">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Radio size={20} className="animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider">
                  رادار التوصيات المؤسسية الحية
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  SCANNING
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                النظام يراقب سيولة {market} لحظة بلحظة لاصطياد مناطق زيرو انعكاس غير ملموسة (Zero Drawdown).
              </p>
            </div>
          </div>

          <button
            onClick={() => onGenerateRealSignal?.()}
            disabled={isAnalyzing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Zap size={14} className="fill-current" />
            <span>{isAnalyzing ? 'جاري الفحص المباشر...' : 'فحص فوري وإصدار توصية حقيقية ⚡'}</span>
          </button>

        </div>
      </div>
    );
  }

  // When a real signal is issued, render this prominent luxury single card
  const isBuy = signal.type.includes('BUY');
  const digits = signal.market === 'EURUSD' ? 5 : 2;

  let statusBadgeText = 'توصية معلقة (Pending)';
  let statusBadgeStyle = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  if (signal.status === 'Active') {
    statusBadgeText = 'مفعلة قيد التداول';
    statusBadgeStyle = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  } else if (signal.status.startsWith('TP')) {
    statusBadgeText = `حققت الأهداف (${signal.status})`;
    statusBadgeStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
  } else if (signal.status === 'SL') {
    statusBadgeText = 'ضربت وقف الخسارة';
    statusBadgeStyle = 'bg-rose-500/15 border-rose-500/30 text-rose-300';
  }

  // Calculate distance from current price to entry
  const curP = currentPrice || signal.entry;
  const pipsDiff = Math.abs(curP - signal.entry) * (signal.market === 'XAUUSD' ? 10 : (signal.market === 'EURUSD' ? 10000 : 1));

  return (
    <div 
      onClick={() => onSelectSignal(signal)}
      className={`w-full institutional-card-gold rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 cursor-pointer group text-right ${
        isBuy ? 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] border-emerald-500/30' : 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] border-rose-500/30'
      }`}
    >
      {/* Background Subtle Ambience */}
      <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 ${
        isBuy ? 'bg-emerald-500/15' : 'bg-rose-500/15'
      }`} />

      {/* Header Banner: New Signal Issued Alert Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 mb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-wider flex items-center gap-1">
              <Sparkles size={15} className="text-amber-400 animate-pulse" />
              <span>أحدث توصية صادرة من النظام</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Zero Reflection • SMC
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              (يبعد السعر {pipsDiff.toFixed(1)} نقطة عن نقطة الدخول)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[11px]">
          <span className={`px-2.5 py-0.5 rounded-lg border font-bold ${statusBadgeStyle}`}>
            {statusBadgeText}
          </span>
          <span className="text-slate-400 flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
            <Clock size={12} />
            <span>{signal.time}</span>
          </span>
        </div>
      </div>

      {/* Main Signal Overview Grid */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        
        {/* Left/Right: Asset, Order Type & Strength */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-base text-amber-400 shadow-inner shrink-0">
            {signal.market.substring(0, 3)}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-wider">
                {signal.market}
              </span>
              
              <span
                className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono flex items-center gap-1 border shadow-sm ${
                  isBuy
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                }`}
              >
                {isBuy ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span>{signal.type}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-amber-300">
                قوة الإشارة: {signal.quality || 'A+'} ({signal.qualityScore || 98}%)
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-400">
                كتلة أوامر عذراء SMC
              </span>
            </div>
          </div>
        </div>

        {/* Targets & Entry Levels Box: Entry, TP1, TP2, TP3, SL */}
        <div className="w-full xl:w-auto grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
          
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/25 text-right sm:text-center">
            <span className="text-[9.5px] text-amber-300/80 block font-sans font-bold">منطقة الدخول (Entry)</span>
            <span className="text-xs sm:text-sm font-black text-amber-300 tabular-nums">
              {signal.zoneMax ? `${signal.zoneMax.toFixed(digits)} – ${signal.zoneMin?.toFixed(digits)}` : signal.entry.toFixed(digits)}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9.5px] text-slate-400 block font-sans">الهدف TP 1</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
              {signal.tp1.toFixed(digits)}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9.5px] text-slate-400 block font-sans">الهدف TP 2</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
              {signal.tp2.toFixed(digits)}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9.5px] text-slate-400 block font-sans">الهدف TP 3</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
              {signal.tp3.toFixed(digits)}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 col-span-2 sm:col-span-1">
            <span className="text-[9.5px] text-rose-300 block font-sans font-bold">الوقف (SL)</span>
            <span className="text-xs sm:text-sm font-bold text-rose-400 tabular-nums">
              {signal.sl.toFixed(digits)}
            </span>
          </div>

        </div>

      </div>

      {/* Footer Strip with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 mt-3.5 border-t border-white/[0.06] text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'تم نسخ التوصية' : 'نسخ التوصية'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateRealSignal?.();
            }}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Zap size={13} className="text-amber-400" />
            <span>{isAnalyzing ? 'جاري الفحص...' : 'فحص وإصدار توصية أخرى ⚡'}</span>
          </button>

          <span className="text-emerald-400 font-mono font-bold text-[11px] hidden sm:inline mr-auto">
            عائد للمخاطرة 1:6+
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 text-amber-400 font-bold group-hover:text-amber-300 transition-colors">
          <span>عرض تفاصيل التحليل بالكامل والشارت</span>
          <ChevronLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>

    </div>
  );
};
