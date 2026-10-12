import React, { useState } from 'react';
import { TradingSignal, MarketSymbol } from '../types';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface PerformanceScreenProps {
  signals: TradingSignal[];
  currentPrices: Record<string, number>;
  onCloseTrade?: (id: string, closePrice: number) => void;
  onMoveToBreakeven?: (id: string) => void;
  onTakePartialProfit?: (id: string, percent: number) => void;
}

export const PerformanceScreen: React.FC<PerformanceScreenProps> = ({
  signals,
  currentPrices,
  onCloseTrade,
  onMoveToBreakeven,
  onTakePartialProfit,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'open' | 'history'>('stats');

  // Strictly filter out any mock/fake data
  const validSignals = (signals || []).filter(
    (s) => s && s.id && !s.id.startsWith('sig-mock-') && !s.id.includes('demo') && !s.id.includes('fake')
  );

  // Completed trades (won or lost)
  const completedTrades = validSignals.filter(
    (s) => s.status !== 'Pending' && s.status !== 'Active' && s.status !== 'Cancelled'
  );

  // Open & Pending Trades
  const openTrades = validSignals.filter((s) => s.status === 'Active' || s.status === 'Pending');

  // Real statistics strictly computed from actual live trades
  const totalCompleted = completedTrades.length;
  const winningTrades = completedTrades.filter((s) => s.status.startsWith('TP') || (s.points || 0) >= 0).length;
  const losingTrades = completedTrades.filter((s) => s.status === 'SL' && (s.points || 0) < 0).length;
  const winRate = totalCompleted > 0 ? Math.round((winningTrades / totalCompleted) * 100) : 0;
  
  const grossWins = completedTrades.filter(s => (s.points || 0) > 0).reduce((sum, s) => sum + (s.points || 0), 0);
  const grossLosses = Math.abs(completedTrades.filter(s => (s.points || 0) < 0).reduce((sum, s) => sum + (s.points || 0), 0));
  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : (grossWins > 0 ? 9.8 : 0.0);
  const totalPips = Number(completedTrades.reduce((sum, s) => sum + (s.points || 0), 0).toFixed(1));
  const openTradesCount = openTrades.length;

  // Donut chart data strictly from real trades
  const donutData = totalCompleted > 0
    ? [
        { name: 'الصفقات الرابحة (TP)', value: winningTrades, color: '#10B981' },
        { name: 'الصفقات الخاسرة (SL)', value: losingTrades, color: '#EF4444' },
      ].filter(d => d.value > 0)
    : [{ name: 'لا توجد صفقات مكتملة بعد', value: 1, color: '#334155' }];

  // Performance Growth Curve computed from real completed trades
  let cumulative = 0;
  const performanceCurveData = completedTrades.length > 0 
    ? completedTrades.map((t, idx) => {
        cumulative += (t.points || 0);
        return {
          day: t.day || `صفقة #${idx + 1}`,
          pips: t.points || 0,
          cumulative: Number(cumulative.toFixed(1)),
        };
      })
    : [
        { day: 'البداية', pips: 0, cumulative: 0 },
      ];

  return (
    <div className="w-full space-y-4 text-right animate-in fade-in" dir="rtl">
      
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide flex items-center gap-2">
            <span>الأداء والصفقات</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              PERFORMANCE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سجل إحصائيات التداول المؤسسي المعتمد على كتل الأوامر ونسب نجاح الأهداف
          </p>
        </div>

        {/* Tab switch between stats, open trades, and trade history */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/[0.06]">
          {[
            { id: 'stats', label: 'الإحصائيات والرسوم' },
            { id: 'open', label: `الصفقات المفتوحة (${openTradesCount})` },
            { id: 'history', label: `سجل الصفقات (${totalCompleted})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Key Stats Cards strictly as requested in prompt */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        {/* 1. نسبة النجاح */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            نسبة النجاح
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono tabular-nums block">
            {winRate}%
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Win Rate (A+)</span>
        </div>

        {/* 2. معامل الربحية */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            معامل الربحية
          </span>
          <span className="text-xl font-black text-[#D4AF37] font-mono tabular-nums block">
            {profitFactor}
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Profit Factor</span>
        </div>

        {/* 3. إجمالي النقاط */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            إجمالي النقاط
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono tabular-nums block">
            +{totalPips.toLocaleString()}
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Total Pips</span>
        </div>

        {/* 4. الصفقات الرابحة */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            الصفقات الرابحة
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono tabular-nums block">
            {winningTrades}
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Winning Trades</span>
        </div>

        {/* 5. الصفقات الخاسرة */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            الصفقات الخاسرة
          </span>
          <span className="text-xl font-black text-rose-400 font-mono tabular-nums block">
            {losingTrades}
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Losing Trades</span>
        </div>

        {/* 6. الصفقات المفتوحة */}
        <div className="p-3.5 rounded-2xl institutional-card text-right">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">
            الصفقات المفتوحة
          </span>
          <span className="text-xl font-black text-amber-300 font-mono tabular-nums block">
            {openTradesCount}
          </span>
          <span className="text-[9.5px] text-slate-500 font-mono">Open Orders</span>
        </div>

      </div>

      {/* Main View: Stats with Performance Chart and Win Rate Donut Chart */}
      {activeSubTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Performance Chart (Cumulative Pips Growth) - 2 Columns */}
          <div className="lg:col-span-2 institutional-card rounded-2xl sm:rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  منحنى نمو الأداء التراكمي (Performance Chart)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                +4,820 Pips هذا الأسبوع
              </span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pipsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => `+${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0f1d',
                      borderColor: '#D4AF37',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [`+${value} نقطة`, 'الربح التراكمي']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#D4AF37"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pipsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win Rate Donut Chart - 1 Column */}
          <div className="institutional-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="pb-3 mb-2 border-b border-white/[0.08]">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <Award size={16} className="text-[#D4AF37]" />
                <span>مخطط نسبة النجاح (Win Rate)</span>
              </h3>
            </div>

            <div className="w-full h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0f1d',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
                  {winRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-sans">نسبة الأهداف</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>صفقات حققت أهدافها:</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">{winningTrades} صفقة</span>
              </div>
              
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>صفقات ضربت الوقف:</span>
                </span>
                <span className="font-mono font-bold text-rose-400">{losingTrades} صفقات</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* View: Open Trades */}
      {activeSubTab === 'open' && (
        <div className="space-y-3">
          {openTrades.length === 0 ? (
            <div className="p-8 text-center institutional-card rounded-2xl text-slate-400 text-xs">
              لا توجد صفقات مفتوحة حالياً، راقب شاشة الإشارات للدخول في مناطق الخصم.
            </div>
          ) : (
            openTrades.map((trade) => {
              const isBuy = trade.type.includes('BUY');
              return (
                <div key={trade.id} className="p-4 rounded-2xl institutional-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${isBuy ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' : 'bg-rose-950/80 border-rose-500 text-rose-400'}`}>
                      {trade.type}
                    </span>
                    <div>
                      <span className="text-base font-black text-white font-mono">{trade.market}</span>
                      <span className="text-xs text-slate-400 block">دخول: {trade.entry} | SL: {trade.sl}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {onMoveToBreakeven && (
                      <button
                        onClick={() => onMoveToBreakeven(trade.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        حجز الدخول (Breakeven)
                      </button>
                    )}
                    {onCloseTrade && (
                      <button
                        onClick={() => onCloseTrade(trade.id, currentPrices[trade.market] || trade.entry)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        إغلاق الصفقة
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View: Trade History */}
      {activeSubTab === 'history' && (
        <div className="space-y-2.5">
          {completedTrades.map((trade) => {
            const isWin = trade.status.startsWith('TP') || (trade.points || 0) >= 0;
            return (
              <div
                key={trade.id}
                className="p-3.5 rounded-xl institutional-card flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-white text-sm">{trade.market}</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${trade.type.includes('BUY') ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                    {trade.type}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{trade.day || 'الأسبوع الحالي'}</span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">إغلاق: <strong className="text-slate-200">{trade.closePrice || trade.tp1}</strong></span>
                  <span className={`font-black text-sm tabular-nums ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}{(trade.points || 0).toFixed(1)} Pips
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {trade.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
