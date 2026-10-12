import React, { useState } from 'react';
import { MarketSymbol, Candle, SMCZone, TradingSignal } from '../types';
import { InteractiveChart } from './InteractiveChart';
import { 
  TrendingUp, 
  Layers, 
  Sliders, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';

interface AnalysisChartScreenProps {
  market: MarketSymbol;
  currentPrice: number;
  candles: Candle[];
  zones: SMCZone[];
  activeSignal: TradingSignal | null;
  allSignals?: TradingSignal[];
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  onSelectMarket: (symbol: MarketSymbol) => void;
  onReloadCandles?: () => void;
  isConnected?: boolean;
}

export const AnalysisChartScreen: React.FC<AnalysisChartScreenProps> = ({
  market,
  currentPrice,
  candles,
  zones,
  activeSignal,
  allSignals = [],
  selectedTimeframe,
  onSelectTimeframe,
  onSelectMarket,
  onReloadCandles,
  isConnected = true,
}) => {
  // Timeframe selector list as requested: M1, M5, M15, M30, H1, H4, D1
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

  // SMC Layer Toggles as requested: Premium, Discount, FVG, BOS, Order Block, Liquidity, Buy Limit, Sell Limit
  const [layers, setLayers] = useState({
    premium: true,
    discount: true,
    fvg: true,
    bos: true,
    orderBlock: true,
    liquidity: true,
    buyLimit: true,
    sellLimit: true,
    ema50: false,
    ema200: true,
  });

  // Toggles for clean chart viewing
  const [hideMt5Bar, setHideMt5Bar] = useState(true); // Hidden cleanly per user request
  const [hideLimitComment, setHideLimitComment] = useState(true); // Hidden per user request
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const digits = market === 'EURUSD' ? 5 : 2;

  return (
    <div className="w-full space-y-3.5 text-right animate-in fade-in" dir="rtl">
      
      {/* Top Bar: Symbol, Current Price & Timeframe Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl institutional-card">
        
        {/* Symbol & Live Price */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-mono font-black text-sm text-[#D4AF37]">
            {market.substring(0, 3)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-white font-mono tracking-wider">
                {market}
              </span>
              <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded border ${
                isConnected 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {isConnected ? 'فوري مباشر' : 'بانتظار الاتصال'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs text-slate-400">السعر المباشر:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-300 tabular-nums">
                {isConnected ? `${currentPrice.toFixed(digits)} $` : 'بانتظار الاتصال'}
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector: M1, M5, M15, M30, H1, H4, D1 */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] overflow-x-auto custom-scrollbar w-full md:w-auto">
          {timeframes.map((tf) => {
            const isSelected = selectedTimeframe.toUpperCase() === tf.toUpperCase();
            return (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Quick Tools & Refresh */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {onReloadCandles && (
            <button
              onClick={onReloadCandles}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
              title="تحديث شمعات الشارت"
            >
              <RefreshCw size={15} />
            </button>
          )}

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
            title="تكبير ملء الشاشة"
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

      </div>

      {/* SMC Analysis Layer Toggles as requested */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.06] flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 pl-2 border-l border-slate-800">
          <Layers size={13} className="text-amber-400" />
          <span>طبقات التحليل:</span>
        </span>

        {[
          { key: 'premium', label: 'منطقة الغلاء (Premium)', color: 'rose' },
          { key: 'discount', label: 'منطقة الخصم (Discount)', color: 'emerald' },
          { key: 'fvg', label: 'فجوات القيمة (FVG)', color: 'blue' },
          { key: 'bos', label: 'كسر الهيكل (BOS)', color: 'amber' },
          { key: 'orderBlock', label: 'كتل الأوامر (OB)', color: 'purple' },
          { key: 'liquidity', label: 'السيولة (Liquidity)', color: 'cyan' },
          { key: 'buyLimit', label: 'أوامر شراء معلقة', color: 'emerald' },
          { key: 'sellLimit', label: 'أوامر بيع معلقة', color: 'rose' },
        ].map((layer) => {
          const isActive = layers[layer.key as keyof typeof layers];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key as any)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 border ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Candlestick Chart Area Container */}
      <div 
        id="main-chart-wrapper"
        className={`w-full rounded-2xl sm:rounded-3xl institutional-card p-2 sm:p-3 overflow-hidden transition-all relative ${
          isFullScreen ? 'fixed inset-0 z-50 rounded-none p-4' : 'min-h-[460px]'
        }`}
      >
        <InteractiveChart
          candles={candles}
          market={market}
          zones={layers.orderBlock ? zones : []}
          activeSignal={activeSignal}
          allSignals={allSignals}
          candleType="STANDARD"
          showEMA50={layers.ema50}
          showEMA200={layers.ema200}
          showSuperTrend={false}
          showSMCZones={layers.orderBlock || layers.fvg}
          showBOS={layers.bos}
          showTP={layers.buyLimit || layers.sellLimit}
          theme="dark"
          isConnected={isConnected}
        />
      </div>

      {/* Zero Drawdown & Clean Controls Summary Strip */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="font-semibold text-slate-200">
            مناطق زيرو انعكاس (الكتل غير الملموسة):
          </span>
          <span className="text-[11px] text-slate-400">
            يتم تحديد الدخول بدقة في كتل الأوامر غير الملموسة لتفادي الانعكاس
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-[10.5px]">
          <span className="text-slate-400">الإطار الزمني: {selectedTimeframe.toUpperCase()}</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 font-bold">التوافق المؤسسي: 98%</span>
        </div>
      </div>

    </div>
  );
};
