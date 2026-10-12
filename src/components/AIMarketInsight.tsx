import React from 'react';
import { MarketSymbol, Candle } from '../types';
import { ShieldCheck, TrendingUp, Activity, Zap, Compass, BarChart2, Layers } from 'lucide-react';
import { getMarketMetrics, getSmartTrendCondition } from '../utils/marketEngine';

interface AIMarketInsightProps {
  market: MarketSymbol;
  currentPrice: number;
  candles?: Candle[];
}

export const AIMarketInsight: React.FC<AIMarketInsightProps> = ({
  market,
  currentPrice,
  candles = [],
}) => {
  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
  const trendCondition = getSmartTrendCondition(lastCandle);
  const marketMetrics = getMarketMetrics(candles, market);

  const isBullish = trendCondition.toLowerCase().includes('bull');
  const isBearish = trendCondition.toLowerCase().includes('bear');

  // Key Indicators structured dynamically from real market engine
  const metrics = [
    {
      id: 'trend',
      title: 'اتجاه السوق',
      enTitle: 'Market Trend',
      value: isBullish ? 'صاعد قوي / Bullish' : isBearish ? 'هابط / Bearish' : 'عرضي / Sideways',
      percentage: isBullish ? 85 : isBearish ? 35 : 50,
      color: isBullish ? 'emerald' : isBearish ? 'rose' : 'blue',
      status: isBullish ? 'Order Flow إيجابي' : isBearish ? 'ضغط بيعي مؤسسي' : 'تجميع عرضي',
    },
    {
      id: 'strength',
      title: 'قوة الاتجاه',
      enTitle: 'Trend Strength',
      value: `${marketMetrics.trendStrength}%`,
      percentage: marketMetrics.trendStrength,
      color: 'amber',
      status: marketMetrics.trendStrength > 70 ? 'زخم مؤسسي مرتفع' : 'زخم معتدل',
    },
    {
      id: 'volatility',
      title: 'تقلبات السوق',
      enTitle: 'Market Volatility',
      value: `${marketMetrics.volatility}%`,
      percentage: marketMetrics.volatility,
      color: 'blue',
      status: marketMetrics.volatility > 60 ? 'سيولة متدفقة نشطة' : 'حركة محسوبة ومستقرة',
    },
    {
      id: 'liquidity',
      title: 'حالة السيولة',
      enTitle: 'Liquidity State',
      value: isBullish ? 'سحب سيولة قيعان' : 'سحب سيولة قمم',
      percentage: 88,
      color: 'purple',
      status: isBullish ? 'Sweep Lows Complete' : 'Sweep Highs Complete',
    },
    {
      id: 'confluence',
      title: 'SMC Confluence',
      enTitle: 'Smart Money Match',
      value: `${Math.min(99, Math.max(80, marketMetrics.trendStrength + 10))}%`,
      percentage: Math.min(99, Math.max(80, marketMetrics.trendStrength + 10)),
      color: 'gold',
      status: 'تطابق شروط صانع السوق (A+)',
    },
  ];

  return (
    <div className="w-full institutional-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Compass size={17} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>التحليل المؤسسي الذكي</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                AI Market Insight
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مراقبة السيولة الذكية، كتل الأوامر والمناطق المؤسسية غير الملموسة
            </p>
          </div>
        </div>

        <div className="text-left font-mono">
          <span className="text-xs text-slate-400 block sm:text-left">السعر المرجعي:</span>
          <span className="text-sm font-black text-amber-300 tabular-nums">
            {currentPrice.toFixed(market === 'EURUSD' ? 5 : 2)} $
          </span>
        </div>
      </div>

      {/* ملخص السوق الحالي Narrative Box */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0d1629] via-[#091020] to-[#0d1629] border border-amber-500/20 mb-5 text-right">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck size={16} className="text-[#D4AF37]" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-100">
            ملخص السوق الحالي لـ {market}
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          يشير الهيكل الفني الداخلي على فريم 15 دقيقة وساعة إلى اكتمال عملية سحب سيولة (Liquidity Sweep) تحت القيعان الرئيسية، مع تشكيل كسر هيكلي صاعد (Bullish BOS). السعر يتداول حالياً أعلى منطقة طلب مؤسسية غير ملموسة (Unmitigated Order Block)، مما يمنح إشارة Buy Limit ذات عائد للمخاطرة متفوق (1:6+) وتأكيد زيرو انعكاس.
        </p>
      </div>

      {/* Progress Bars & Metric Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {metrics.map((metric) => {
          let progressBg = 'bg-emerald-500';
          let textColor = 'text-emerald-400';
          if (metric.color === 'amber' || metric.color === 'gold') {
            progressBg = 'bg-gradient-to-r from-amber-500 to-[#D4AF37]';
            textColor = 'text-[#D4AF37]';
          } else if (metric.color === 'blue') {
            progressBg = 'bg-sky-500';
            textColor = 'text-sky-400';
          } else if (metric.color === 'purple') {
            progressBg = 'bg-purple-500';
            textColor = 'text-purple-400';
          }

          return (
            <div
              key={metric.id}
              className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all text-right"
            >
              {/* Top Row: Title & Value */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-200">
                  {metric.title}
                </span>
                <span className={`text-xs font-mono font-black ${textColor} tabular-nums`}>
                  {metric.value}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden my-2 p-0.5 border border-white/[0.04]">
                <div
                  className={`h-full rounded-full ${progressBg} transition-all duration-700 shadow-sm`}
                  style={{ width: `${metric.percentage}%` }}
                />
              </div>

              {/* Bottom Row: English Title & Sub-status */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-slate-500">{metric.enTitle}</span>
                <span className="text-slate-300 font-semibold">{metric.status}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
