import React, { useState } from 'react';
import { TradingSignal } from '../types';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  TrendingUp, 
  BarChart2,
  Clock,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface SignalDetailModalProps {
  signal: TradingSignal | null;
  onClose: () => void;
  onOpenChart?: (market: string) => void;
  onAddToWatchlist?: (signal: TradingSignal) => void;
  isWatchlisted?: boolean;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({
  signal,
  onClose,
  onOpenChart,
  onAddToWatchlist,
  isWatchlisted = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedToWatchlist, setSavedToWatchlist] = useState(isWatchlisted);

  if (!signal) return null;

  const isBuy = signal.type.includes('BUY');
  const digits = signal.market === 'EURUSD' ? 5 : 2;

  const handleCopy = () => {
    const text = `🎯 إشارة تداول مؤسسية AI MM VIP\nالزوج: ${signal.market}\nالنوع: ${signal.type}\nمنطقة الدخول: ${signal.zoneMax ? `${signal.zoneMax} - ${signal.zoneMin}` : signal.entry}\nالهدف 1: ${signal.tp1}\nالهدف 2: ${signal.tp2}\nالهدف 3: ${signal.tp3}\nوقف الخسارة: ${signal.sl}\nالعائد للمخاطرة: 1:6+\nمنهجية: صانع السوق SMC + زيرو انعكاس`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWatchlist = () => {
    setSavedToWatchlist(!savedToWatchlist);
    if (onAddToWatchlist) {
      onAddToWatchlist(signal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className="relative w-full max-w-xl institutional-card rounded-2xl sm:rounded-3xl border border-amber-500/30 shadow-2xl p-5 sm:p-6 my-auto text-right">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#D4AF37]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-mono">
                  {signal.market}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono flex items-center gap-1 border ${
                    isBuy
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                      : 'bg-rose-950/80 border-rose-500 text-rose-400'
                  }`}
                >
                  {isBuy ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{signal.type}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                تفاصيل الإشارة والتحليل المؤسسي الفائق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Trade Levels Overview Grid */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-right">
              <span className="text-[10px] text-slate-400 block font-sans">منطقة الدخول (Entry)</span>
              <span className="text-xs font-black text-amber-300 tabular-nums">
                {signal.zoneMax ? `${signal.zoneMax.toFixed(digits)} – ${signal.zoneMin?.toFixed(digits)}` : signal.entry.toFixed(digits)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-sans">الهدف الأول TP1</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {signal.tp1.toFixed(digits)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-sans">الهدف الثاني TP2</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {signal.tp2.toFixed(digits)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-sans">الهدف الثالث TP3</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {signal.tp3.toFixed(digits)}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-sans">وقف الخسارة (SL):</span>
              <span className="font-bold text-rose-400 tabular-nums">
                {signal.sl.toFixed(digits)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-sans">العائد للمخاطرة (R:R):</span>
              <span className="font-black text-emerald-400">1:6+</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-sans">القوة:</span>
              <span className="font-bold text-amber-300">{signal.quality || 'A+'} (98%)</span>
            </div>
          </div>
        </div>

        {/* قسم: تحليل الذكاء الاصطناعي (Strictly as specified in user prompt) */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0b1222] to-[#070b16] border border-amber-500/20 mb-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
            <Layers size={16} className="text-amber-400" />
            <h4 className="text-sm font-bold text-slate-100">
              تحليل الذكاء الاصطناعي المؤسسي
            </h4>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">اتجاه السوق:</strong> صاعد بقوة مع تدفق أوامر شرائية مؤسسية (Bullish Institutional Order Flow) على الفريمات المتوسطة والكبيرة.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">السيولة:</strong> استهداف وتصفية أحواض سيولة البيع العميقة الواقعة تحت أدنى قيعان الجلسة السابقة.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">Order Block:</strong> ارتكاز مباشر على كتلة أوامر غير ملموسة (Unmitigated Bullish Order Block) تتوافق مع منطقة الخصم المؤسسية (Discount Zone).
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">Fair Value Gap:</strong> استجابة وتعبئة متوازنة لفجوة القيمة العادلة (FVG Imbalance)، مما يؤكد انتهاء التصحيح وبدء الانطلاق.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">BOS:</strong> تأكيد كسر هيكل السوق الصاعد (Break of Structure) بإغلاق شموع زخم قوية أعلى القمة السابقة.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">Liquidity Sweep:</strong> اكتمال سحب سيولة ستوبات المتداولين الأفراد (Retail Liquidity Sweep) لضمان صفقة زيرو انعكاس فورية.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-slate-100 font-semibold">مناطق الدخول:</strong> تمركز دقيق للأوامر المعلقة (Limit) داخل حيز غير ملموس: <span className="font-mono font-bold text-amber-300">{signal.zoneMax ? `${signal.zoneMax} – ${signal.zoneMin}` : signal.entry}</span>.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
              <p>
                <strong className="text-rose-300 font-semibold">مستوى الإبطال:</strong> يتم إلغاء سيناريو الشراء بالكامل في حال كسر وثبات السعر بإغلاق شمعة أسفل مستوى <span className="font-mono font-bold text-rose-400">{signal.sl}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: إضافة إلى المتابعة & نسخ & الشارت */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          
          {/* زر: إضافة إلى المتابعة (As requested) */}
          <button
            onClick={handleWatchlist}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              savedToWatchlist
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
          >
            {savedToWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            <span>{savedToWatchlist ? 'تمت الإضافة للمتابعة ✓' : 'إضافة إلى المتابعة'}</span>
          </button>

          {/* Copy Trade Button */}
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ الصفقة'}</span>
          </button>

          {/* Open Chart View Button */}
          {onOpenChart && (
            <button
              onClick={() => {
                onClose();
                onOpenChart(signal.market);
              }}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <BarChart2 size={16} />
              <span>عرض بالشارت التفاعلي</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
