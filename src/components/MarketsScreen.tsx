import React, { useState } from 'react';
import { MarketSymbol } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Search, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronLeft
} from 'lucide-react';

interface MarketItem {
  symbol: string;
  nameEn: string;
  nameAr: string;
  category: 'crypto' | 'forex' | 'indices';
  price: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  digits: number;
}

interface MarketsScreenProps {
  onSelectMarket: (symbol: MarketSymbol) => void;
  currentMarket: MarketSymbol;
  currentPrices: Record<string, number>;
}

export const MarketsScreen: React.FC<MarketsScreenProps> = ({
  onSelectMarket,
  currentMarket,
  currentPrices,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'forex' | 'indices'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // The 8 institutional assets requested in the prompt
  const marketList: MarketItem[] = [
    {
      symbol: 'XAUUSD',
      nameEn: 'Gold / US Dollar',
      nameAr: 'الذهب مقابل الدولار',
      category: 'forex',
      price: currentPrices['XAUUSD'] || 3812.50,
      changePercent: +1.42,
      high24h: 3824.80,
      low24h: 3792.10,
      volume: '$14.2B',
      digits: 2,
    },
    {
      symbol: 'EURUSD',
      nameEn: 'Euro / US Dollar',
      nameAr: 'اليورو مقابل الدولار',
      category: 'forex',
      price: currentPrices['EURUSD'] || 1.08450,
      changePercent: -0.28,
      high24h: 1.08820,
      low24h: 1.08310,
      volume: '$19.8B',
      digits: 5,
    },
    {
      symbol: 'GBPUSD',
      nameEn: 'British Pound / US Dollar',
      nameAr: 'الجنيه الإسترليني مقابل الدولار',
      category: 'forex',
      price: currentPrices['GBPUSD'] || 1.29800,
      changePercent: +0.35,
      high24h: 1.30150,
      low24h: 1.29420,
      volume: '$11.4B',
      digits: 5,
    },
    {
      symbol: 'USDJPY',
      nameEn: 'US Dollar / Japanese Yen',
      nameAr: 'الدولار الأمريكي مقابل الين الياباني',
      category: 'forex',
      price: currentPrices['USDJPY'] || 154.20,
      changePercent: -0.45,
      high24h: 155.10,
      low24h: 153.80,
      volume: '$16.1B',
      digits: 3,
    },
    {
      symbol: 'US30',
      nameEn: 'Dow Jones Industrial Average',
      nameAr: 'مؤشر داو جونز الصناعي 30',
      category: 'indices',
      price: currentPrices['US30'] || 43850.0,
      changePercent: +0.65,
      high24h: 44020.0,
      low24h: 43610.0,
      volume: '$8.9B',
      digits: 1,
    },
    {
      nameEn: 'Nasdaq 100 Index',
      symbol: 'NAS100',
      nameAr: 'مؤشر ناسداك 100 الأمريكي',
      category: 'indices',
      price: currentPrices['NAS100'] || 21120.0,
      changePercent: +1.18,
      high24h: 21250.0,
      low24h: 20950.0,
      volume: '$12.5B',
      digits: 1,
    },
    {
      symbol: 'BTCUSDT',
      nameEn: 'Bitcoin / Tether',
      nameAr: 'بيتكوين مقابل التيثر',
      category: 'crypto',
      price: currentPrices['BTCUSD'] || 87400.0,
      changePercent: +2.15,
      high24h: 88900.0,
      low24h: 85200.0,
      volume: '$28.4B',
      digits: 1,
    },
    {
      symbol: 'ETHUSDT',
      nameEn: 'Ethereum / Tether',
      nameAr: 'إيثيريوم مقابل التيثر',
      category: 'crypto',
      price: currentPrices['ETHUSDT'] || 2680.0,
      changePercent: +3.40,
      high24h: 2740.0,
      low24h: 2580.0,
      volume: '$14.1B',
      digits: 2,
    },
  ];

  // Filter list by category and search
  const filteredList = marketList.filter((item) => {
    if (activeTab === 'crypto' && item.category !== 'crypto') return false;
    if (activeTab === 'forex' && item.category !== 'forex') return false;
    if (activeTab === 'indices' && item.category !== 'indices') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.nameAr.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-4 text-right animate-in fade-in" dir="rtl">
      
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide flex items-center gap-2">
            <span>الأسواق</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              MARKETS
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            متابعة حية للأسعار، التغيرات اليومية ونسب السيولة في الأسواق العالمية
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن رمز أو زوج..."
            className="w-full py-2 pr-9 pl-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Tabs Filter Bar (Tabs: الكل, العملات الرقمية, العملات الأجنبية, المؤشرات) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/[0.06] overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'crypto', label: 'العملات الرقمية' },
          { id: 'forex', label: 'العملات الأجنبية' },
          { id: 'indices', label: 'المؤشرات' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Markets Table / Cards List */}
      <div className="space-y-2.5">
        {filteredList.map((item) => {
          const isPositive = item.changePercent >= 0;
          const isSelected = currentMarket === item.symbol || (item.symbol === 'BTCUSDT' && currentMarket === 'BTCUSD');

          return (
            <div
              key={item.symbol}
              onClick={() => {
                const mappedSymbol = item.symbol === 'BTCUSDT' ? 'BTCUSD' : item.symbol;
                onSelectMarket(mappedSymbol as any);
              }}
              className={`institutional-card rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer hover:border-slate-600 group ${
                isSelected
                  ? 'border-amber-500/50 bg-[#121b2d] shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                  : 'hover:bg-slate-900/70'
              }`}
            >
              {/* Asset Identity */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-xs text-amber-300 shrink-0 group-hover:border-amber-500/40 transition-colors">
                  {item.symbol.substring(0, 3)}
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black text-white font-mono tracking-wider">
                      {item.symbol}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        محدد
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block -mt-0.5">
                    {item.nameAr}
                  </span>
                </div>
              </div>

              {/* Price & Change % Display */}
              <div className="flex items-center gap-3 sm:gap-6">
                
                {/* 24h High/Low (hidden on small screens) */}
                <div className="hidden md:flex flex-col text-left font-mono text-[10.5px]">
                  <span className="text-slate-400">أعلى: <strong className="text-slate-200">{item.high24h.toFixed(item.digits)}</strong></span>
                  <span className="text-slate-400">أدنى: <strong className="text-slate-200">{item.low24h.toFixed(item.digits)}</strong></span>
                </div>

                {/* Price and Percentage */}
                <div className="text-left font-mono">
                  <span className="text-sm sm:text-base font-black text-slate-100 tabular-nums block">
                    {item.price.toFixed(item.digits)} $
                  </span>
                  
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {isPositive ? (
                      <ArrowUpRight size={13} className="text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={13} className="text-rose-400" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Open Chart CTA */}
                <button
                  className="w-8 h-8 rounded-xl bg-slate-800/80 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center text-slate-300 transition-all cursor-pointer shrink-0"
                  title="فتح الشارت للتحليل الفني"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
