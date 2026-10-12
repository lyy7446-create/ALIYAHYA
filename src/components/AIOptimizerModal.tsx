import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Sliders, 
  ArrowUpRight, 
  X,
  Brain,
  History,
  Activity,
  Award
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/marketEngine';

export interface StrategyParams {
  atrMultiplier: number;
  trailingStopPips: number;
  riskRewardRatio: number;
  smcZoneSensitivity: string;
  qualityFilterMinScore: number;
}

export interface AIOptimizerResult {
  optimizedParams: StrategyParams;
  expectedImprovementWinRate: string;
  expectedProfitFactorIncrease: string;
  recommendedRiskPerTrade: string;
  detailedReportArabic: string;
  learnings: string[];
}

export interface OptimizationLog {
  id: string;
  timestamp: string;
  winRateBefore: string;
  expectedWinRate: string;
  appliedParams: StrategyParams;
}

interface AIOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSignals: any[];
  currentStats: {
    winRate: string;
    totalPips: number;
    profitFactor: string;
    totalTrades: number;
  };
  currentParams: StrategyParams;
  onApplyOptimizedParams: (newParams: StrategyParams) => void;
}

export const AIOptimizerModal: React.FC<AIOptimizerModalProps> = ({
  isOpen,
  onClose,
  currentSignals,
  currentStats,
  currentParams,
  onApplyOptimizedParams,
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');
  const [optimizationResult, setOptimizationResult] = useState<AIOptimizerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<OptimizationLog[]>([
    {
      id: 'opt-1',
      timestamp: 'اليوم، 09:15 ص',
      winRateBefore: '68.5%',
      expectedWinRate: '76.3%',
      appliedParams: {
        atrMultiplier: 1.65,
        trailingStopPips: 22,
        riskRewardRatio: 2.2,
        smcZoneSensitivity: 'المتوازنة المتقدمة (Balanced SMC)',
        qualityFilterMinScore: 78
      }
    }
  ]);
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setErrorMsg(null);
    setOptimizationResult(null);
    setAppliedSuccessMsg(false);

    setOptimizationProgress('جاري فحص وتفريغ سجل الصفقات السابقة...');
    await new Promise((r) => setTimeout(r, 600));

    setOptimizationProgress('جاري تحليل أسباب انزلاق السعر وضرب وقف الخسارة (SL)...');
    await new Promise((r) => setTimeout(r, 800));

    setOptimizationProgress('إرسال البيانات إلى محرك Gemini للتعلم الآلي واستخراج أفضل المعلمات...');

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/gemini/auto-optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signals: currentSignals,
          currentParams,
          stats: currentStats,
        }),
      });

      const json = await response.json();
      if (json && json.success && json.data) {
        setOptimizationResult(json.data);
      } else {
        setErrorMsg(json?.error || 'حدث خطأ أثناء إجراء التحسين الذاتي بالذكاء الاصطناعي');
      }
    } catch (e: any) {
      console.error('Optimization error:', e);
      setErrorMsg('تعذر الاتصال بخادم الذكاء الاصطناعي، يرجى المحاولة لاحقاً');
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress('');
    }
  };

  const handleApply = () => {
    if (!optimizationResult) return;
    onApplyOptimizedParams(optimizationResult.optimizedParams);

    // Add to history log
    const newLog: OptimizationLog = {
      id: `opt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      winRateBefore: `${currentStats.winRate}%`,
      expectedWinRate: optimizationResult.expectedImprovementWinRate,
      appliedParams: optimizationResult.optimizedParams,
    };
    setLogs([newLog, ...logs]);

    setAppliedSuccessMsg(true);
    setTimeout(() => {
      setAppliedSuccessMsg(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 overflow-y-auto dir-rtl font-sans">
      <div className="relative w-full max-w-4xl bg-[#0d0d14] border border-[#232332] rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#1b1b26] bg-[#12121c]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                  محرك التحسين الذاتي والتطوير الآلي المستمر
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gemini AI ML Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                يقوم بجمع بيانات تداولاتك، تحليل نقاط القوة والضعف، وإعادة معايرة المعلمات فترات متكررة لتوليد أقصى عائد مع أقل مخاطرة.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1f1f2e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Performance Snapshot Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#13131d] p-3.5 rounded-xl border border-[#1f1f2d]">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">إجمالي الصفقات المحللة</span>
              <span className="text-lg font-bold text-white font-mono mt-0.5">{currentStats.totalTrades} صفقة</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">نسبة النجاح الحالية</span>
              <span className="text-lg font-bold text-amber-400 font-mono mt-0.5">{currentStats.winRate}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">صافي النقاط (Pips)</span>
              <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5">+{currentStats.totalPips}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">معامل الربح الفعلي</span>
              <span className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{currentStats.profitFactor}</span>
            </div>
          </div>

          {/* Trigger Optimization Action Box */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-right w-full md:w-auto">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>إعادة معايرة الاستراتيجية وتطوير أداء النموذج</span>
              </div>
              <p className="text-xs text-slate-300">
                يقوم خوارزم الذكاء الاصطناعي بتوليد نموذج محسّن أوتوماتيكياً يتكيف مع تقلبات السوق الحالية.
              </p>
            </div>

            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg whitespace-nowrap ${
                isOptimizing
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98]'
              }`}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>جاري تحليل وتطوير النموذج...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>تشغيل التحسين والتطبيق الآلي</span>
                </>
              )}
            </button>
          </div>

          {/* Loading Progress Bar */}
          {isOptimizing && (
            <div className="p-4 bg-[#141420] border border-amber-500/30 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>{optimizationProgress}</span>
                <span className="font-mono">محرك Gemini active...</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full w-3/4 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Success Applied Banner */}
          {appliedSuccessMsg && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تمت معايرة المعلمات بنجاح وتطبيقها على كافة المؤشرات واستراتيجية التداول المباشرة!</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Results Comparison Grid */}
          {optimizationResult && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Expected Gains Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">نسبة النجاح المتوقعة</span>
                    <p className="text-base font-bold text-emerald-400">{optimizationResult.expectedImprovementWinRate}</p>
                  </div>
                </div>

                <div className="bg-cyan-950/20 border border-cyan-500/30 p-3.5 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">تحسن معامل الربحية</span>
                    <p className="text-base font-bold text-cyan-400">{optimizationResult.expectedProfitFactorIncrease}</p>
                  </div>
                </div>

                <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">المخاطرة الموصى بها لكل صفقة</span>
                    <p className="text-base font-bold text-amber-400">{optimizationResult.recommendedRiskPerTrade}</p>
                  </div>
                </div>
              </div>

              {/* Parameter Comparison Table */}
              <div className="bg-[#12121c] border border-[#1e1e2d] rounded-2xl overflow-hidden">
                <div className="p-3.5 bg-[#171725] border-b border-[#1e1e2d] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>مقارنة المعلمات الحالية مقابل معلمات الذكاء الاصطناعي المحسنة</span>
                  </div>
                  <span className="text-[10px] text-amber-400/90 font-mono">Auto Tuning Active</span>
                </div>

                <div className="divide-y divide-[#1b1b26] text-xs">
                  {/* ATR Multiplier */}
                  <div className="p-3 grid grid-cols-3 items-center hover:bg-[#161622] transition-colors">
                    <span className="text-slate-300 font-medium">معامل نطاق الوقف (ATR Buffer)</span>
                    <span className="text-slate-400 font-mono text-center">{currentParams.atrMultiplier}x</span>
                    <span className="text-emerald-400 font-mono font-bold text-left flex items-center justify-end gap-1">
                      <span>{optimizationResult.optimizedParams.atrMultiplier}x</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>

                  {/* Trailing Stop */}
                  <div className="p-3 grid grid-cols-3 items-center hover:bg-[#161622] transition-colors">
                    <span className="text-slate-300 font-medium">تتبع الوقف المتحرك (Trailing Stop)</span>
                    <span className="text-slate-400 font-mono text-center">{currentParams.trailingStopPips} Pips</span>
                    <span className="text-emerald-400 font-mono font-bold text-left flex items-center justify-end gap-1">
                      <span>{optimizationResult.optimizedParams.trailingStopPips} Pips</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>

                  {/* Risk Reward Ratio */}
                  <div className="p-3 grid grid-cols-3 items-center hover:bg-[#161622] transition-colors">
                    <span className="text-slate-300 font-medium">معدل العائد إلى الخطر (R:R Ratio)</span>
                    <span className="text-slate-400 font-mono text-center">1:{currentParams.riskRewardRatio}</span>
                    <span className="text-emerald-400 font-mono font-bold text-left flex items-center justify-end gap-1">
                      <span>1:{optimizationResult.optimizedParams.riskRewardRatio}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>

                  {/* SMC Zone Sensitivity */}
                  <div className="p-3 grid grid-cols-3 items-center hover:bg-[#161622] transition-colors">
                    <span className="text-slate-300 font-medium">حساسية مناطق SMC والعرض والطلب</span>
                    <span className="text-slate-400 font-mono text-center">{currentParams.smcZoneSensitivity || 'المتوازنة'}</span>
                    <span className="text-amber-300 font-bold text-left">{optimizationResult.optimizedParams.smcZoneSensitivity}</span>
                  </div>

                  {/* Quality Score Cutoff */}
                  <div className="p-3 grid grid-cols-3 items-center hover:bg-[#161622] transition-colors">
                    <span className="text-slate-300 font-medium">الحد الأدنى لجودة التوصية المقبولة</span>
                    <span className="text-slate-400 font-mono text-center">{currentParams.qualityFilterMinScore}%</span>
                    <span className="text-emerald-400 font-mono font-bold text-left flex items-center justify-end gap-1">
                      <span>{optimizationResult.optimizedParams.qualityFilterMinScore}%</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Learnings Bullet List */}
              {optimizationResult.learnings && optimizationResult.learnings.length > 0 && (
                <div className="bg-[#12121c] border border-[#1e1e2d] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>أبرز ملاحظات التعلم الآلي ونقاط التطوير المستخلصة:</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {optimizationResult.learnings.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#161622] p-2.5 rounded-lg border border-[#1d1d2b]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Technical Arabic Report */}
              <div className="bg-[#12121c] border border-[#1e1e2d] rounded-xl p-4 space-y-2 text-xs leading-relaxed text-slate-300">
                <div className="font-bold text-white mb-2 text-sm">تفاصيل التقرير الفني المباشر من الذكاء الاصطناعي:</div>
                <div className="whitespace-pre-line text-slate-300 font-sans leading-6">
                  {optimizationResult.detailedReportArabic}
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>تطبيق المعلمات المحسنة فوراً على نظام التداول والمخطط</span>
              </button>

            </div>
          )}

          {/* Historical Optimization Cycles Log */}
          <div className="space-y-3 pt-2 border-t border-[#1b1b26]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>سجل دورات التحسين والتكيف الذاتي السابقة</span>
              </div>
              <span className="text-[10px] text-slate-500">{logs.length} دورات مسجلة</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="p-3 bg-[#12121a] border border-[#1b1b26] rounded-xl text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.timestamp}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        مكتملة
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      معامل ATR: {log.appliedParams.atrMultiplier}x • الوقف المتحرك: {log.appliedParams.trailingStopPips} نقطة • جودة: {log.appliedParams.qualityFilterMinScore}%
                    </p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-slate-400 text-[10px] block">نسبة النجاح المتوقعة</span>
                    <span className="text-emerald-400 font-bold">{log.expectedWinRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#1b1b26] bg-[#0a0a10] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>نظام الذكاء الاصطناعي متصل ومستعد للتطوير المستمر 24/7</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#181824] hover:bg-[#222233] text-slate-300 font-medium transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
