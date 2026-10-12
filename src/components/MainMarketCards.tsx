import React from 'react';
import { MarketSymbol } from '../types';
import { TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import { MARKET_BASES } from '../utils/marketEngine';

interface MarketData {
  symbol: MarketSymbol;
  displayName: string;
  nameAr: string;
  price: number;
  changePercent: number;
  marketStatus: string;
  statusType: 'bullish' | 'bearish' | 'neutral';
  digits: number;
}

interface MainMarketCardsProps {
  currentMarket: MarketSymbol;
  onSelectMarket: (symbol: MarketSymbol) => void;
  currentPrices: Record<string, number>;
}

export const MainMarketCards: React.FC<MainMarketCardsProps> = ({
  currentMarket,
  onSelectMarket,
  currentPrices,
}) => {
  const getDynamicChange = (sym: string, curPrice: number, baseFallback: number): number => {
    const base = MARKET_BASES[sym as MarketSymbol]?.base || baseFallback;
    if (!curPrice || !base) return 0.0;
    return Number((((curPrice - base) / base) * 100).toFixed(2));
  };

  const xauPrice = currentPrices['XAUUSD'] || MARKET_BASES['XAUUSD'].base;
  const eurPrice = currentPrices['EURUSD'] || MARKET_BASES['EURUSD'].base;
  const us30Price = currentPrices['US30'] || MARKET_BASES['US30'].base;
  const btcPrice = currentPrices['BTCUSD'] || MARKET_BASES['BTCUSD'].base;

  // 4 Primary Markets strictly as requested: XAUUSD, EURUSD, US30, BTC
  const markets: MarketData[] = [
    {
      symbol: 'XAUUSD',
      displayName: 'XAUUSD',
      nameAr: 'الذهب مقابل الدولار',
      price: xauPrice,
      changePercent: getDynamicChange('XAUUSD', xauPrice, 3812.50),
      marketStatus: xauPrice >= (MARKET_BASES['XAUUSD']?.base || 3812.50) ? 'Bullish Order Flow' : 'Discount Zone',
      statusType: xauPrice >= (MARKET_BASES['XAUUSD']?.base || 3812.50) ? 'bullish' : 'bearish',
      digits: 2,
    },
    {
      symbol: 'EURUSD',
      displayName: 'EURUSD',
      nameAr: 'اليورو مقابل الدولار',
      price: eurPrice,
      changePercent: getDynamicChange('EURUSD', eurPrice, 1.08450),
      marketStatus: eurPrice >= (MARKET_BASES['EURUSD']?.base || 1.08450) ? 'Bullish Structure' : 'Bearish BOS',
      statusType: eurPrice >= (MARKET_BASES['EURUSD']?.base || 1.08450) ? 'bullish' : 'bearish',
      digits: 5,
    },
    {
      symbol: 'US30' as any,
      displayName: 'US30',
      nameAr: 'مؤشر داو جونز الصناعي',
      price: us30Price,
      changePercent: getDynamicChange('US30', us30Price, 43850.0),
      marketStatus: 'Institutional Liquidity',
      statusType: us30Price >= (MARKET_BASES['US30']?.base || 43850.0) ? 'bullish' : 'bearish',
      digits: 1,
    },
    {
      symbol: 'BTCUSD',
      displayName: 'BTC',
      nameAr: 'بيتكوين مقابل الدولار',
      price: btcPrice,
      changePercent: getDynamicChange('BTCUSD', btcPrice, 87400.0),
      marketStatus: 'Liquidity Sweep',
      statusType: btcPrice >= (MARKET_BASES['BTCUSD']?.base || 87400.0) ? 'bullish' : 'bearish',
      digits: 1,
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {markets.map((item) => {
          const isSelected = currentMarket === item.symbol;
          const isPositive = item.changePercent >= 0;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectMarket(item.symbol)}
              className={`relative p-3 sm:p-3.5 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? 'bg-gradient-to-b from-[#141e33] to-[#0c1322] border-2 border-amber-500/60 shadow-[0_0_20px_rgba(212,175,55,0.18)] scale-[1.01]'
                  : 'bg-[#0a0f1d]/80 hover:bg-[#0e1629] border border-white/[0.08] hover:border-slate-700 shadow-md'
              }`}
            >
              {/* Active Selection Glow Pill / Indicator */}
              {isSelected && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-amber-300">نشط</span>
                </div>
              )}

              {/* Symbol & Name */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-white font-mono tracking-wider">
                    {item.displayName}
                  </span>
                  {item.symbol === 'XAUUSD' && (
                    <span className="text-[10px] text-amber-400">⚡</span>
                  )}
                </div>
                {!isSelected && (
                  <span className="text-[10px] text-slate-400 font-sans truncate max-w-[80px]">
                    {item.nameAr.split(' ')[0]}
                  </span>
                )}
              </div>

              {/* Price display in clean tabular-nums */}
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-100 tabular-nums">
                  {item.price.toFixed(item.digits)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">$</span>
              </div>

              {/* Change % and Market Status */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] mt-1.5">
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingDown size={12} className="text-rose-400 shrink-0" />
                  )}
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </div>

                <span className="text-[9.5px] font-medium text-slate-400 truncate max-w-[95px] text-left" dir="ltr">
                  {item.marketStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
