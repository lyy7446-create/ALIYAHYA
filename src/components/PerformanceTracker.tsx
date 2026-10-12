import React, { useState } from 'react';
import { Award, Check, Clock, Shield, TrendingUp, AlertTriangle, Play, Pause, ChevronRight, Download, RefreshCw, Eye, X, Power, Target, Sparkles, Calendar, BarChart2, MessageSquare, Activity, History, Zap, Edit3, Lock, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, CartesianGrid } from 'recharts';
import { TradingSignal, MarketSymbol, AlertSettings } from '../types';
import { MARKET_BASES, formatTimeframeBadge } from '../utils/marketEngine';
import { EditLimitOrderModal } from './EditLimitOrderModal';

interface PerformanceTrackerProps {
  signals: TradingSignal[];
  currentPrices: Record<string, number>;
  onCloseSignalAtMarket: (id: string, closePrice: number) => void;
  onCancelSignal: (id: string) => void;
  onActivatePendingOrderNow?: (id: string) => void;
  onUpdateSignal?: (updatedSignal: TradingSignal) => void;
  onMoveToBreakeven?: (id: string) => void;
  onBookPartialProfit?: (id: string, percent: number) => void;
  alertSettings?: AlertSettings;
  theme?: 'dark' | 'light';
}

export const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({
  signals,
  currentPrices,
  onCloseSignalAtMarket,
  onCancelSignal,
  onActivatePendingOrderNow,
  onUpdateSignal,
  onMoveToBreakeven,
  onBookPartialProfit,
  alertSettings,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'charts'>('active');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedResultFilter, setSelectedResultFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'points'>('time');
  const [editingSignal, setEditingSignal] = useState<TradingSignal | null>(null);

  // Filter valid signals
  const validSignals = (signals || []).filter(s => s && s.id);

  // Separate into active and pending versus completed history
  const activeAndPending = validSignals.filter(s => s.status === 'Active' || s.status === 'Pending');
  const completedHistory = validSignals.filter(s => s.status !== 'Active' && s.status !== 'Pending' && s.status !== 'Cancelled');

  // Days of the week in Arabic (excluding weekend: Saturday & Sunday)
  const daysOfWeek = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // Filter completed trades by selected day and result filter
  const filteredCompletedTrades = completedHistory.filter(sig => {
    // Day filter
    if (selectedDayFilter !== 'ALL') {
      const tradeDay = sig.day || 'الإثنين';
      if (tradeDay !== selectedDayFilter) return false;
    }
    // Result filter
    if (selectedResultFilter === 'WIN') {
      const isWin = sig.status.startsWith('TP') || (sig.points || 0) >= 0;
      if (!isWin) return false;
    } else if (selectedResultFilter === 'LOSS') {
      const isLoss = sig.status === 'SL' && (sig.points || 0) < 0;
      if (!isLoss) return false;
    }
    return true;
  });

  // Order history by time (newest first) or points
  const completedHistorySorted = [...filteredCompletedTrades].sort((a, b) => {
    if (sortBy === 'points') {
      return (b.points || 0) - (a.points || 0);
    }
    return b.id.localeCompare(a.id);
  });
  
  // Show all matching completed trades of the week
  const completedHistoryToShow = completedHistorySorted;

  // Stats calculation for whole week
  const closedCount = completedHistory.length;
  const wins = completedHistory.filter(s => s.status.startsWith('TP') || (s.points || 0) >= 0).length;
  const losses = completedHistory.filter(s => s.status === 'SL' && (s.points || 0) < 0).length;
  const winRate = closedCount > 0 ? Math.round((wins / closedCount) * 100) : 100;

  // Filtered stats for current selection
  const filteredClosedCount = completedHistoryToShow.length;
  const filteredWins = completedHistoryToShow.filter(s => s.status.startsWith('TP') || (s.points || 0) >= 0).length;
  const filteredLosses = completedHistoryToShow.filter(s => s.status === 'SL' && (s.points || 0) < 0).length;
  const filteredWinRate = filteredClosedCount > 0 ? Math.round((filteredWins / filteredClosedCount) * 100) : 0;
  const filteredTotalNetPoints = completedHistoryToShow.reduce((sum, s) => sum + (s.points || 0), 0);

  // Points tracking
  const totalNetPoints = completedHistory.reduce((sum, s) => sum + (s.points || 0), 0);

  // Profit Factor calculation
  const grossProfit = completedHistory.filter(s => (s.points || 0) > 0).reduce((sum, s) => sum + (s.points || 0), 0);
  const grossLoss = Math.abs(completedHistory.filter(s => (s.points || 0) < 0).reduce((sum, s) => sum + (s.points || 0), 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'Max' : '0.00';

  // Calculate daily P&L data for recharts
  const dailyPL = daysOfWeek.map((day) => {
    // filter signals matching the day (with fallback to الإثنين if day is not defined)
    const daySignals = completedHistory.filter(s => (s.day || 'الإثنين') === day);
    const netPoints = daySignals.reduce((sum, s) => sum + (s.points || 0), 0);
    const winCount = daySignals.filter(s => s.status.startsWith('TP') || (s.points || 0) >= 0).length;
    const lossCount = daySignals.filter(s => s.status === 'SL' && (s.points || 0) < 0).length;
    return {
      name: day,
      points: parseFloat(netPoints.toFixed(2)),
      wins: winCount,
      losses: lossCount,
      trades: daySignals.length,
    };
  });

  // Highlight days statistics
  const bestDay = [...dailyPL].sort((a, b) => b.points - a.points)[0];
  const mostActiveDay = [...dailyPL].sort((a, b) => b.trades - a.trades)[0];
  const averagePLPerTrade = completedHistory.length > 0 ? (totalNetPoints / completedHistory.length).toFixed(2) : '0';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.points >= 0;
      return (
        <div className="bg-[#0e0e13]/95 border border-[#232332] p-2.5 rounded-lg shadow-xl text-right dir-rtl select-none">
          <p className="text-xs font-black text-slate-200 mb-1 flex items-center gap-1 justify-end">
            <span>{data.name}</span>
            <Calendar size={10} className="text-slate-400" />
          </p>
          <p className={`text-xs font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            صافي الربح: {isPositive ? '+' : ''}{data.points} نقطة
          </p>
          <div className="text-[10px] text-slate-400 mt-1 font-sans">
            <span>الصفقات المغلقة: {data.trades}</span>
            {data.trades > 0 && (
              <span className="block text-slate-500 text-[9px] mt-0.5">
                ({data.wins} فوز / {data.losses} خسارة)
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const shareToWhatsApp = (sig: TradingSignal) => {
    const digits = MARKET_BASES[sig.market]?.digits || 2;
    const textMsg = `🔔 *إشارة تداول ذكية جديدة (SMC Institutional)* 🚀\n\n` +
           `📈 *الأصل:* ${sig.market}\n` +
           `⚡ *النوع:* ${sig.type}\n` +
           `⭐ *الجودة:* ${sig.quality || 'A'} (${sig.qualityScore || 90}%)\n` +
           `💵 *سعر الدخول:* ${sig.entry.toFixed(digits)}\n` +
           `🛑 *وقف الخسارة (SL):* ${sig.sl.toFixed(digits)}\n\n` +
           `🎯 *الأهداف المستهدفة (Take Profit):*\n` +
           `🔹 الهدف الأول (TP1): ${sig.tp1.toFixed(digits)}\n` +
           `🔹 الهدف الثاني (TP2): ${sig.tp2.toFixed(digits)}\n` +
           `🔹 الهدف الثالث (TP3): ${sig.tp3.toFixed(digits)}\n\n` +
           `🛡️ *إدارة المخاطر:* مؤمن تلقائياً عبر نظام تتبع الأهداف وتأمين الدخول (Breakeven) من لوحة تحكم MM VIP.`;
    
    const targetPhone = alertSettings?.whatsappNumber && !alertSettings.whatsappNumber.includes('@') ? alertSettings.whatsappNumber.replace(/[^0-9]/g, '') : '';
    const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border border-[#1b1b22] rounded-xl overflow-hidden shadow-xl text-white" dir="rtl">
      {/* Header bar matching screenshot styling */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121217] border-b border-[#1b1b22]">
        <div className="flex items-center gap-2">
          <span className="p-1 px-1.5 bg-[#1e1e24] text-[10px] font-bold text-slate-300 rounded border border-[#2d2d3e]">سجل الأداء</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">متابع الصفقات والإشارات</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          الصّفقات: <span className="text-emerald-400 font-semibold">{closedCount}</span> | المفتوحة: <span className="text-blue-400 font-semibold">{activeAndPending.length}</span>
        </div>
      </div>

      {/* Tabs navigation switcher */}
      <div className="flex border-b border-[#1b1b22] bg-[#0c0c10] select-none shrink-0">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 text-[11px] font-black tracking-tight transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 border-l border-[#1b1b22]/40 ${
            activeTab === 'active'
              ? 'border-b-2 border-emerald-500 text-white bg-[#121217]/50 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-b border-transparent'
          }`}
        >
          <Activity size={12} className={activeTab === 'active' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
          الصفقات المفتوحة ({activeAndPending.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-[11px] font-black tracking-tight transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 border-l border-[#1b1b22]/40 ${
            activeTab === 'history'
              ? 'border-b-2 border-purple-500 text-white bg-[#121217]/50 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-b border-transparent'
          }`}
        >
          <History size={12} className={activeTab === 'history' ? 'text-purple-400' : 'text-slate-500'} />
          الصفقات المغلقة ({closedCount})
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex-1 py-2.5 text-[11px] font-black tracking-tight transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'charts'
              ? 'border-b-2 border-blue-500 text-white bg-[#121217]/50 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-b border-transparent'
          }`}
        >
          <BarChart2 size={12} className={activeTab === 'charts' ? 'text-blue-400' : 'text-slate-500'} />
          مخطط الأرباح
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {/* TAB 1: ACTIVE & PENDING OPEN TRADES */}
        {activeTab === 'active' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                مراقبة المراكز المفتوحة والأوامر المعلقة
              </h4>
            </div>

            {activeAndPending.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-sans">
                <Clock size={24} className="mx-auto text-slate-600 mb-2.5" />
                لا توجد صفقات مفتوحة أو معلقة حالياً.
                <p className="text-[10px] text-slate-600 mt-1">أرسل إشارة جديدة أو انتظر كسر البنية الهيكلية للماركت.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAndPending.map((sig) => {
                  const curPrice = currentPrices[sig.market] || sig.entry;
                  const meta = MARKET_BASES[sig.market] || { digits: 2 };
                  const digits = meta.digits;
                  const isShort = sig.type.toUpperCase().includes('SELL');

                  // Calculate floating points/pips
                  const dir = isShort ? -1 : 1;
                  const factorMultiplier = sig.market === 'XAUUSD' ? 10.0 : 10000.0;
                  const floatingPoints = parseFloat(((curPrice - sig.entry) * dir * factorMultiplier).toFixed(2));
                  const isProfit = floatingPoints >= 0;

                  // Calculate visual progress bar metric (distance from SL to TP3)
                  let progressPct = 50;
                  const totalRange = Math.abs(sig.sl - sig.tp3);
                  if (totalRange > 0) {
                    if (!isShort) {
                      progressPct = ((curPrice - sig.sl) / totalRange) * 100;
                    } else {
                      progressPct = ((sig.sl - curPrice) / totalRange) * 100;
                    }
                  }
                  progressPct = Math.max(0, Math.min(100, progressPct));

                  return (
                    <div
                      key={sig.id}
                      className={`p-3 rounded-lg border transition-all text-right ${
                        sig.status === 'Active'
                          ? 'bg-[#081224] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.18)] ring-1 ring-blue-500/20'
                          : 'bg-[#0d0d12]/90 border-[#1f1f2a]'
                      }`}
                    >
                      {/* Card Header Info */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1b1b26]/50">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            isShort ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          }`}>
                            {isShort ? 'SELL' : 'BUY'}
                          </span>
                          <span className="font-bold text-slate-200 text-xs">{sig.market === 'XAUUSD' ? 'GOLD Spot' : sig.market}</span>
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                            sig.status === 'Active'
                              ? 'bg-blue-500/25 text-blue-200 border border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            <Clock size={10} className={sig.status === 'Active' ? 'text-blue-300 animate-pulse' : 'text-indigo-400'} />
                            فريم {formatTimeframeBadge(sig.timeframe)}
                          </span>
                          <span className={`text-[8px] font-black px-1 py-0.1 rounded ${
                            sig.quality === 'A+' || !sig.quality || sig.quality.startsWith('A')
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' 
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/10'
                          }`}>
                            {sig.quality || 'A'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          sig.status === 'Active' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {sig.status === 'Active' ? '🔵 صفقة مفعّلة ونشطة' : '⏳ أمر معلق'}
                        </span>
                      </div>

                      {/* Prices & Float */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mb-2.5">
                        <div className="bg-[#121218]/80 p-1.5 rounded border border-[#1b1b22]">
                          <span className="text-slate-500 block text-[9px] mb-0.5 font-sans">سعر الدخول</span>
                          <span className="text-slate-200 font-bold text-xs">{sig.entry.toFixed(digits)}</span>
                        </div>
                        <div className="bg-[#121218]/80 p-1.5 rounded border border-[#1b1b22]">
                          <span className="text-slate-500 block text-[9px] mb-0.5 font-sans">السعر الحالي</span>
                          <span className="text-slate-200 font-bold text-xs">{curPrice.toFixed(digits)}</span>
                        </div>
                      </div>

                      {/* Smart Management Badges */}
                      {(sig.isSmartManaged || sig.hasMovedToBreakeven || (sig.partialProfitsBooked && sig.partialProfitsBooked > 0)) && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {sig.isSmartManaged && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/15">
                              🛡️ إدارة MM الذكية نشطة
                            </span>
                          )}
                          {sig.hasMovedToBreakeven && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                              🔒 تأمين الدخول (BE)
                            </span>
                          )}
                          {sig.partialProfitsBooked && sig.partialProfitsBooked > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                              💰 حجز أرباح {sig.partialProfitsBooked}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Horizontal Gauge Bar */}
                      {sig.status === 'Active' && (
                        <div className="bg-[#0b0b0e] p-2 rounded border border-[#171720] mb-2.5">
                          <div className="flex justify-between items-center text-[8px] text-slate-500 font-sans mb-1">
                            <span className="text-rose-400 font-semibold">وقف خسارة (SL)</span>
                            <span className="text-slate-400">سعر الدخول</span>
                            <span className="text-emerald-400 font-semibold">الهدف الثالث (TP3)</span>
                          </div>
                          <div className="h-1.5 bg-[#121218] rounded-full overflow-hidden relative border border-[#1e1e28]/60">
                            <div className="absolute left-0 top-0 bottom-0 bg-rose-500/10 w-[30%]" />
                            <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 w-[50%]" />
                            <div 
                              className={`absolute h-full transition-all duration-300 ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                            <div 
                              className={`absolute w-2 h-2 rounded-full border border-white -translate-x-1/2 -top-[1px] transition-all duration-300 ${isProfit ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              style={{ left: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                            <span className="text-rose-400 font-bold">{sig.sl.toFixed(digits)}</span>
                            <span className="text-slate-300 font-bold">{sig.entry.toFixed(digits)}</span>
                            <span className="text-emerald-400 font-bold">{sig.tp3.toFixed(digits)}</span>
                          </div>
                        </div>
                      )}

                      {/* Milestone checks */}
                      {sig.status === 'Active' && (
                        <div className="flex gap-1.5 mb-3 select-none text-[8px]">
                          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${
                            Boolean(sig.partialProfitsBooked && sig.partialProfitsBooked >= 50)
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold'
                              : 'bg-slate-500/5 text-slate-500 border border-slate-500/10'
                          }`}>
                            <Check size={8} /> هدف1: {sig.tp1.toFixed(digits)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${
                            Boolean(sig.partialProfitsBooked && sig.partialProfitsBooked >= 75)
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold'
                              : 'bg-slate-500/5 text-slate-500 border border-slate-500/10'
                          }`}>
                            <Check size={8} /> هدف2: {sig.tp2.toFixed(digits)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${
                            Boolean(sig.partialProfitsBooked && sig.partialProfitsBooked >= 100)
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold'
                              : 'bg-slate-500/5 text-slate-500 border border-slate-500/10'
                          }`}>
                            <Check size={8} /> هدف3: {sig.tp3.toFixed(digits)}
                          </span>
                        </div>
                      )}

                      {/* Real-time floating Points and Manual Close Actions */}
                      <div className="pt-2 border-t border-dashed border-[#1d1d28] space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-sans">
                          {sig.status === 'Active' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">الربح العائم:</span>
                              <span className={`font-mono font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}{floatingPoints} pips
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] font-bold">
                              <span>المسافة للدخول:</span>
                              <span className="bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                                {Math.abs(curPrice - sig.entry * 1).toFixed(digits)} ({parseFloat((Math.abs(curPrice - sig.entry) * factorMultiplier).toFixed(1))} pips)
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => shareToWhatsApp(sig)}
                            className="text-[9px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded flex items-center gap-1 font-sans transition-colors cursor-pointer select-none"
                            title="مشاركة على واتساب"
                          >
                            <MessageSquare size={9} />
                            <span>مشاركة</span>
                          </button>
                        </div>

                        {/* Action Buttons Matrix */}
                        {sig.status === 'Pending' ? (
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              onClick={() => setEditingSignal(sig)}
                              className="text-[9.5px] font-bold bg-[#171724] hover:bg-[#202032] text-amber-300 border border-amber-500/30 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer shadow-sm"
                              title="تعديل مستويات الأمر المعلق (السعر، الاستوب، الأهداف)"
                            >
                              <Edit3 size={11} className="text-amber-400" />
                              <span>تعديل</span>
                            </button>

                            {onActivatePendingOrderNow && (
                              <button
                                onClick={() => onActivatePendingOrderNow(sig.id)}
                                className="text-[9.5px] font-bold bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer shadow-sm"
                                title="تفعيل الصفقة فوراً بالسعر الحالي دون انتظار الملامسة"
                              >
                                <Zap size={11} className="text-yellow-300 fill-current" />
                                <span>تفعيل فوري</span>
                              </button>
                            )}

                            <button
                              onClick={() => onCancelSignal(sig.id)}
                              className="text-[9.5px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer"
                              title="إلغاء هذا الأمر المعلق"
                            >
                              <X size={11} />
                              <span>إلغاء</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            {onMoveToBreakeven && (
                              <button
                                onClick={() => onMoveToBreakeven(sig.id)}
                                disabled={sig.hasMovedToBreakeven}
                                className={`text-[9px] font-bold px-1.5 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer ${
                                  sig.hasMovedToBreakeven
                                    ? 'bg-cyan-500/10 text-cyan-400/60 border border-cyan-500/20 cursor-default'
                                    : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                                }`}
                                title="نقل وقف الخسارة إلى نقطة الدخول +5 نقاط لتأمين الصفقة بنسبة 100%"
                              >
                                <Lock size={10} className="text-cyan-400" />
                                <span>{sig.hasMovedToBreakeven ? 'الدخول مؤمن' : 'تأمين الدخول'}</span>
                              </button>
                            )}

                            {onBookPartialProfit && (
                              <button
                                onClick={() => onBookPartialProfit(sig.id, 50)}
                                disabled={Boolean(sig.partialProfitsBooked && sig.partialProfitsBooked >= 50)}
                                className={`text-[9px] font-bold px-1.5 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer ${
                                  Boolean(sig.partialProfitsBooked && sig.partialProfitsBooked >= 50)
                                    ? 'bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20 cursor-default'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                }`}
                                title="حجز 50% من أرباح الصفقة وتأمين الباقي"
                              >
                                <DollarSign size={10} className="text-emerald-400" />
                                <span>حجز 50%</span>
                              </button>
                            )}

                            <button
                              onClick={() => onCloseSignalAtMarket(sig.id, curPrice)}
                              className="text-[9.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 font-sans transition-all cursor-pointer"
                              title="إغلاق الصفقة فورياً وتصفيتها بسعر السوق الحالي"
                            >
                              <Power size={11} className="text-amber-400" />
                              <span>تصفية فورية</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORIC CLOSED LOGS - FULL WEEKLY TRADES VIEW */}
        {activeTab === 'history' && (
          <div className="p-3 space-y-3">
            {/* Weekly Days Bar Selector */}
            <div className="bg-[#0e0e14] p-2 rounded-xl border border-[#1d1d28] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-sans">
                  <Calendar size={12} className="text-[#D4AF37]" />
                  <span>تصفية صفقات الأسبوع حسب اليوم:</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-[#161620] px-2 py-0.5 rounded border border-[#252535]">
                  إجمالي الأسبوع: <strong className="text-emerald-400">{closedCount}</strong> صفقة
                </span>
              </div>

              {/* Day filter chips */}
              <div className="flex flex-wrap gap-1.5 select-none pt-1">
                <button
                  onClick={() => setSelectedDayFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    selectedDayFilter === 'ALL'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 border border-purple-400'
                      : 'bg-[#14141c] text-slate-400 hover:text-slate-200 border border-[#222230] hover:bg-[#1a1a24]'
                  }`}
                >
                  <span>كامل الأسبوع</span>
                  <span className="font-mono text-[9px] opacity-80">({closedCount})</span>
                </button>

                {daysOfWeek.map((day) => {
                  const countForDay = completedHistory.filter(s => (s.day || 'الإثنين') === day).length;
                  const pointsForDay = completedHistory
                    .filter(s => (s.day || 'الإثنين') === day)
                    .reduce((sum, s) => sum + (s.points || 0), 0);
                  const isPos = pointsForDay >= 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDayFilter(day)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        selectedDayFilter === day
                          ? 'bg-[#D4AF37] text-black shadow-md font-black border border-amber-300'
                          : 'bg-[#14141c] text-slate-400 hover:text-slate-200 border border-[#222230] hover:bg-[#1a1a24]'
                      }`}
                    >
                      <span>{day}</span>
                      <span className={`font-mono text-[9px] ${selectedDayFilter === day ? 'text-black' : isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ({countForDay})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Secondary filter & sort strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a1a24] text-[10px]">
                {/* Result filters */}
                <div className="flex items-center gap-1 font-sans">
                  <span className="text-slate-500 ml-1">النتيجة:</span>
                  <button
                    onClick={() => setSelectedResultFilter('ALL')}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all ${
                      selectedResultFilter === 'ALL'
                        ? 'bg-[#222230] text-white border border-slate-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setSelectedResultFilter('WIN')}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all ${
                      selectedResultFilter === 'WIN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-500 hover:text-emerald-400'
                    }`}
                  >
                    الرابحة (TP)
                  </button>
                  <button
                    onClick={() => setSelectedResultFilter('LOSS')}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all ${
                      selectedResultFilter === 'LOSS'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-500 hover:text-rose-400'
                    }`}
                  >
                    الخاسرة (SL)
                  </button>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="text-slate-500">الترتيب:</span>
                  <button
                    onClick={() => setSortBy(sortBy === 'time' ? 'points' : 'time')}
                    className="px-2 py-0.5 bg-[#171722] hover:bg-[#1f1f2e] text-slate-300 rounded border border-[#2b2b3d] font-mono text-[9px] font-bold transition-all"
                  >
                    {sortBy === 'time' ? '🕒 الأحدث أولاً' : '📈 الأعلى نقاطاً'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filtered Overview Stat Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
              <div className="bg-[#101017] p-2 rounded-lg border border-[#1b1b26]">
                <span className="text-slate-500 text-[9px] block">الصفقات المعروضة</span>
                <span className="font-mono text-xs font-black text-white">{filteredClosedCount} صفقات</span>
              </div>
              <div className="bg-[#101017] p-2 rounded-lg border border-[#1b1b26]">
                <span className="text-slate-500 text-[9px] block">معدل الفوز (Win Rate)</span>
                <span className="font-mono text-xs font-black text-emerald-400">{filteredWinRate}%</span>
              </div>
              <div className="bg-[#101017] p-2 rounded-lg border border-[#1b1b26]">
                <span className="text-slate-500 text-[9px] block">صافي النقاط (Pips)</span>
                <span className={`font-mono text-xs font-black ${filteredTotalNetPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {filteredTotalNetPoints >= 0 ? '+' : ''}{filteredTotalNetPoints.toFixed(1)} Pips
                </span>
              </div>
              <div className="bg-[#101017] p-2 rounded-lg border border-[#1b1b26]">
                <span className="text-slate-500 text-[9px] block">الرابحة / الخاسرة</span>
                <span className="font-mono text-xs font-bold text-slate-300">
                  <span className="text-emerald-400">{filteredWins}W</span> / <span className="text-rose-400">{filteredLosses}L</span>
                </span>
              </div>
            </div>

            {/* List of completed trades for the selected weekly view */}
            {completedHistoryToShow.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-sans bg-[#0c0c11] rounded-xl border border-[#1b1b26] p-4">
                <Clock size={24} className="mx-auto text-slate-600 mb-2.5" />
                لا توجد صفقات تطابق هذا التصنيف في سجل الأسبوع.
              </div>
            ) : (
              <div className="bg-[#0d0d12] rounded-xl border border-[#1b1b24] overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto pr-0.5">
                  <table className="w-full text-right border-collapse">
                    <thead className="sticky top-0 z-10 bg-[#121218] border-b border-[#1f1f2a]">
                      <tr className="text-slate-400 text-[10px] font-bold uppercase font-sans">
                        <th className="py-2.5 px-3 text-right">الأصل والصفقة والتوقيت</th>
                        <th className="py-2.5 px-3 text-center hidden sm:table-cell">تنفيذ السعر</th>
                        <th className="py-2.5 px-3 text-center">النتيجة والهدف</th>
                        <th className="py-2.5 px-3 text-left">النقاط الصافية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#15151c]/80 font-mono text-xs">
                      {completedHistoryToShow.map((sig) => {
                        const isShort = sig.type.toUpperCase().includes('SELL');
                        const isWin = sig.status.startsWith('TP') || (sig.points || 0) >= 0;
                        const digits = MARKET_BASES[sig.market]?.digits || 2;
                        const closePriceVal = sig.closePrice !== undefined ? sig.closePrice : sig.entry;
                        return (
                          <tr key={sig.id} className="hover:bg-[#14141c] transition-colors group">
                            <td className="py-2.5 px-3 font-sans text-right">
                              <div className="flex items-center gap-1.5 justify-start">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                  isShort ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                }`}>
                                  {isShort ? 'SELL' : 'BUY'}
                                </span>
                                <span className="font-bold text-slate-200 text-[11px]">{sig.market === 'XAUUSD' ? 'GOLD Spot' : sig.market}</span>
                                <span className="text-[8px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                  فريم {formatTimeframeBadge(sig.timeframe)}
                                </span>
                                <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  {sig.quality || 'A+'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                                <span className="bg-[#181824] px-1.5 py-0.2 rounded text-slate-300 font-bold font-sans text-[9px] border border-[#262638]">
                                  {sig.day || 'الإثنين'}
                                </span>
                                <span className="text-slate-400">{sig.time}</span>
                                <span className="sm:hidden text-slate-700">•</span>
                                <span className="sm:hidden text-slate-300">
                                  {sig.entry.toFixed(digits)} ➔ <span className="text-amber-400 font-bold">{closePriceVal.toFixed(digits)}</span>
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center hidden sm:table-cell font-mono text-[11px] text-slate-400">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{sig.entry.toFixed(digits)}</span>
                                <span className="text-slate-600">➔</span>
                                <span className="text-amber-400 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">{closePriceVal.toFixed(digits)}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded ${
                                isWin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                {sig.status === 'SL' 
                                  ? ((sig.points || 0) >= 0 ? 'تأمين ربح (SL)' : 'وقف الخسارة') 
                                  : sig.status === 'TP1' ? 'الهدف 1' 
                                  : sig.status === 'TP2' ? 'الهدف 2' 
                                  : 'الهدف 3'}
                              </span>
                            </td>
                            <td className={`py-2.5 px-3 text-left font-bold font-mono text-xs ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              <span className={`inline-block px-2 py-0.5 rounded ${isWin ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                {isWin ? '+' : ''}{sig.points.toFixed(1)} Pips
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DAILY P&L CHART WITH RECHARTS */}
        {activeTab === 'charts' && (
          <div className="p-3 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                مخطط صافي الأرباح والخسائر اليومي للأسبوع الحالي
              </h4>
              <span className="text-[9px] font-black tracking-tight font-sans text-slate-300 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded select-none">
                أسبوع تداول نشط
              </span>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className="w-full h-[180px] bg-[#0c0c10]/40 rounded-xl border border-[#1b1b22]/80 p-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPL} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" opacity={0.15} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#888', fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} 
                  />
                  <ReferenceLine y={0} stroke="#1f2026" strokeWidth={1.5} />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {dailyPL.map((entry, index) => {
                      const isPositive = entry.points >= 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isPositive ? 'url(#greenGradientPT)' : 'url(#redGradientPT)'} 
                        />
                      );
                    })}
                  </Bar>
                  <defs>
                    <linearGradient id="greenGradientPT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="redGradientPT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Compact analytical statistics cards */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[#0d0d12]/90 border border-[#1b1b22] p-2.5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" /> أفضل يوم أداء:
                </span>
                <span className={`font-mono font-bold text-xs mt-1 ${bestDay && bestDay.points > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {bestDay && bestDay.points > 0 ? `${bestDay.name} (+${bestDay.points})` : 'لا توجد أرباح بعد'}
                </span>
              </div>
              <div className="bg-[#0d0d12]/90 border border-[#1b1b22] p-2.5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1">
                  <Target size={11} className="text-blue-400" /> اليوم الأكثر نشاطًا:
                </span>
                <span className="font-mono font-bold text-xs text-blue-400 mt-1">
                  {mostActiveDay && mostActiveDay.trades > 0 ? `${mostActiveDay.name} (${mostActiveDay.trades} صفقات)` : 'لا توجد صفقات'}
                </span>
              </div>
              <div className="bg-[#0d0d12]/90 border border-[#1b1b22] p-2.5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1">
                  <TrendingUp size={11} className="text-purple-400" /> متوسط ربح الصفقة:
                </span>
                <span className={`font-mono font-bold text-xs mt-1 ${parseFloat(averagePLPerTrade) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {parseFloat(averagePLPerTrade) >= 0 ? '+' : ''}{averagePLPerTrade} نقطة
                </span>
              </div>
              <div className="bg-[#0d0d12]/90 border border-[#1b1b22] p-2.5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1">
                  <Calendar size={11} className="text-indigo-400" /> أيام تداول فعالة:
                </span>
                <span className="font-mono font-bold text-xs text-indigo-400 mt-1">
                  {dailyPL.filter(d => d.trades > 0).length} أيام من 7
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Summary Panel (Persistent at bottom) */}
      <div className="mt-auto bg-[#101015] border-t border-[#1b1b22] text-xs shrink-0 select-none">
        {/* TOTAL Row */}
        <div className="grid grid-cols-3 py-2 px-4 border-b border-[#1b1b22] font-semibold text-slate-300">
          <div className="text-right">المجموع الكلي</div>
          <div className="text-center text-emerald-500 tracking-wider">صافي الأرباح</div>
          <div className={`text-left font-mono font-bold ${totalNetPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalNetPoints >= 0 ? '+' : ''}{totalNetPoints.toFixed(2)}
          </div>
        </div>

        {/* Win Rate Row */}
        <div className="grid grid-cols-3 py-2.5 px-4 bg-[#0a0a0c]">
          <div className="font-bold text-slate-400 uppercase font-sans text-[10px] flex items-center justify-start text-right">نسبة النجاح</div>
          <div className="text-center font-bold text-blue-400">{wins} فوز / {losses} خسارة</div>
          <div className="text-left">
            <span className={`inline-block px-2.5 py-0.5 rounded font-mono font-black border ${
              winRate >= 70 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
            }`}>
              {winRate}%
            </span>
          </div>
        </div>

        {/* Profit Factor / Statistics Row */}
        <div className="grid grid-cols-2 py-2 px-4 bg-[#07070a] border-t border-[#15151c] text-[10px] text-slate-500 font-sans">
          <div className="text-right">عامل الربحية: <span className="text-slate-300 font-bold">{profitFactor}</span></div>
          <div className="text-left">نظام المنصة البيئي الذكي v4.0</div>
        </div>
      </div>

      {/* Edit Limit Order Modal */}
      {editingSignal && (
        <EditLimitOrderModal
          isOpen={Boolean(editingSignal)}
          onClose={() => setEditingSignal(null)}
          signal={editingSignal}
          currentPrice={currentPrices[editingSignal.market] || editingSignal.entry}
          onSave={(updated) => {
            if (onUpdateSignal) onUpdateSignal(updated);
            setEditingSignal(null);
          }}
          onActivateNow={(id) => {
            if (onActivatePendingOrderNow) onActivatePendingOrderNow(id);
            setEditingSignal(null);
          }}
          theme={theme}
        />
      )}
    </div>
  );
};
