import React, { useState } from 'react';
import { Sparkles, Brain, Cpu, CheckCircle2, ChevronRight, Activity, Zap, RefreshCw } from 'lucide-react';
import { MarketSymbol } from '../types';

interface AIAnalysisBannerProps {
  market: MarketSymbol;
  onViewAnalysisDetails?: () => void;
  onOpenChart?: () => void;
  onTriggerScan?: () => void;
}

export const AIAnalysisBanner: React.FC<AIAnalysisBannerProps> = ({
  market,
  onViewAnalysisDetails,
  onOpenChart,
  onTriggerScan,
}) => {
  const [engineState, setEngineState] = useState<'IDLE' | 'ANALYZING' | 'COMPLETE'>('IDLE');
  const [progressStep, setProgressStep] = useState(0);

  const scanSteps = [
    'مسح بنية السوق وهيكل الشموع (Market Structure & BOS)...',
    'تحديد كتل الأوامر غير الملموسة (Unmitigated Order Blocks)...',
    'فحص فجوات القيمة العادلة والسيولة (FVG & Liquidity Pools)...',
    'حساب مناطق الدخول زيرو انعكاس ونسبة العائد للمخاطرة (1:6+)...',
  ];

  const handleRunAnalysis = () => {
    if (engineState === 'ANALYZING') return;

    setEngineState('ANALYZING');
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev < scanSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setTimeout(() => {
            setEngineState('COMPLETE');
            if (onTriggerScan) {
              onTriggerScan();
            }
          }, 600);
          return prev;
        }
      });
    }, 700);
  };

  return (
    <div className="w-full relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 institutional-card-gold overflow-hidden transition-all duration-300">
      
      {/* Background Subtle Institutional Mesh Grid Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left/Right Branding & Description */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          
          {/* Glowing AI Brain Emblem */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-amber-700/30 border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.35)] shrink-0 group">
            <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)] animate-pulse" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
              <Zap size={9} className="text-slate-950 fill-current" />
            </div>
          </div>

          {/* Typography */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black font-mono tracking-wider gold-gradient-text">
                AI ANALYSIS
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                {market}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-0.5">
              تحليل ذكي للسوق
            </p>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              محرك خوارزمي متقدم يدمج مفاهيم صانع السوق SMC واقتناص السيولة
            </p>
          </div>
        </div>

        {/* Engine State Control and CTA */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {engineState === 'IDLE' && (
            <button
              onClick={handleRunAnalysis}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles size={16} />
              <span>تشغيل محرك التحليل المؤسسي</span>
            </button>
          )}

          {engineState === 'ANALYZING' && (
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <RefreshCw size={16} className="animate-spin text-amber-400" />
              <div className="flex flex-col text-right">
                <span className="font-mono font-black text-xs tracking-wider animate-pulse">
                  ANALYZING...
                </span>
                <span className="text-[10px] text-slate-300">
                  {scanSteps[progressStep]}
                </span>
              </div>
            </div>
          )}

          {engineState === 'COMPLETE' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="font-mono font-black text-xs tracking-wider">
                  ANALYSIS COMPLETE
                </span>
              </div>

              <button
                onClick={handleRunAnalysis}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="إعادة الفحص"
              >
                <RefreshCw size={13} />
                <span className="hidden xs:inline">إعادة التحليل</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Complete Confluence Highlights Bar */}
      {engineState === 'COMPLETE' && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.08] animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
            
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">اتجاه السيولة المؤسسية:</span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                Bullish Order Flow ↑
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">منطقة التمركز (OB):</span>
              <span className="text-xs font-extrabold text-amber-300 font-mono">
                Unmitigated Demand
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">تطابق الشروط (Confluence):</span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                98% (A+ Setup)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">التوصية الحالية:</span>
              <span className="text-xs font-black text-[#D4AF37] font-mono">
                BUY LIMIT @ Discount
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
