import React from 'react';
import { MarketSymbol, TradingSignal } from '../../types';
import HomeScreen from '../HomeScreen';

interface HomeProps {
  market: MarketSymbol;
  setMarket: (market: MarketSymbol) => void;
  activeSignal: TradingSignal | null;
  allSignals: TradingSignal[];
  currentPrices: Record<string, number>;
  onSelectTab: (tab: any) => void;
  onGenerateRealSignal: () => void;
  selectedTimeframe?: string;
  derivApiToken?: string;
  isLiveConnected?: boolean;
  alertSettings?: any;
  onToggleAlert?: (key: string) => void;
  onUpdateAlertSettings?: (newSettings: any) => void;
}

export const Home: React.FC<HomeProps> = ({
  market,
  setMarket,
  activeSignal,
  allSignals = [],
  currentPrices,
  onSelectTab,
  onGenerateRealSignal,
  selectedTimeframe = 'M15',
  derivApiToken,
  isLiveConnected = true,
  alertSettings,
  onToggleAlert,
  onUpdateAlertSettings,
}) => {
  const currentPrice = currentPrices[market] || 0;
  
  // Format price based on symbol
  const formattedPrice = currentPrice 
    ? (market === 'BTCUSD' ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
       market === 'US30' ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) :
       market === 'XAUUSD' ? currentPrice.toFixed(2) :
       currentPrice.toFixed(4))
    : (market === 'XAUUSD' ? '2,785.40' : market === 'EURUSD' ? '1.0850' : '0.00');

  // Digits and formatting helper
  const formatVal = (val: number | string | undefined): string => {
    if (val === undefined || val === null) return '—';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return String(val);
    if (market === 'BTCUSD') {
      return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }
    if (market === 'US30') {
      return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    if (market === 'EURUSD' || market === 'GBPUSD') {
      return num.toFixed(4);
    }
    // XAUUSD or default
    return num.toFixed(2);
  };

  // Trade plan derivation
  const tradePlan = activeSignal ? {
    entry: formatVal(activeSignal.entry),
    sl: formatVal(activeSignal.sl),
    tp1: formatVal(activeSignal.tp1),
    tp2: formatVal(activeSignal.tp2),
    tp3: formatVal(activeSignal.tp3),
  } : {
    entry: currentPrice ? formatVal(currentPrice) : '2785.40',
    sl: currentPrice ? formatVal(market === 'XAUUSD' ? currentPrice - 6.5 : currentPrice * 0.996) : '2778.90',
    tp1: currentPrice ? formatVal(market === 'XAUUSD' ? currentPrice + 5.0 : currentPrice * 1.004) : '2790.40',
    tp2: currentPrice ? formatVal(market === 'XAUUSD' ? currentPrice + 12.0 : currentPrice * 1.009) : '2797.40',
    tp3: currentPrice ? formatVal(market === 'XAUUSD' ? currentPrice + 22.0 : currentPrice * 1.016) : '2807.40',
  };

  const signalData = activeSignal ? {
    direction: activeSignal.type,
    confidence: activeSignal.qualityScore || 94,
    reason: `كسر هيكل السوق واختراق السيولة مع تأكيد نموذج المؤسسات (${activeSignal.quality})`
  } : {
    direction: 'BUY',
    confidence: 94,
    reason: 'تمركز سيولة مؤسسية متوافقة مع الاتجاه الصاعد وفجوة FVG'
  };

  const [autoExecution, setAutoExecution] = React.useState<boolean>(() => {
    return localStorage.getItem('mm_vip_deriv_auto_execution') === 'true';
  });
  const [accountType, setAccountType] = React.useState<"DEMO" | "REAL">(() => {
    return (localStorage.getItem('mm_vip_deriv_account_type') as "DEMO" | "REAL") || (derivApiToken ? "REAL" : "DEMO");
  });

  const derivData = {
    connected: isLiveConnected,
    appId: "1089",
    apiToken: derivApiToken ? derivApiToken : "••••••••••••••••",
    accountType: accountType,
    autoExecution: autoExecution,
  };

  const handleSaveDeriv = (updated?: any) => {
    if (updated) {
      if (updated.autoExecution !== undefined) {
        setAutoExecution(updated.autoExecution);
        localStorage.setItem('mm_vip_deriv_auto_execution', String(updated.autoExecution));
      }
      if (updated.accountType) {
        setAccountType(updated.accountType);
        localStorage.setItem('mm_vip_deriv_account_type', updated.accountType);
      }
      if (updated.apiToken && onUpdateAlertSettings) {
        onUpdateAlertSettings({
          ...alertSettings,
          derivApiToken: updated.apiToken.includes('•••') ? (derivApiToken || '') : updated.apiToken,
        });
      }
    }
  };

  const alertsData = {
    inApp: alertSettings?.popup !== false,
    telegram: Boolean(alertSettings?.telegram && alertSettings?.telegramToken && alertSettings?.telegramChatId),
    whatsapp: Boolean(alertSettings?.whatsapp && (alertSettings?.whatsappNumber || alertSettings?.whatsappInstanceId)),
    email: Boolean(alertSettings?.email && alertSettings?.emailAddress),
  };

  // Filter and format real active and pending trades for the ActiveTrades component
  const activeTradesList = (allSignals || [])
    .filter(s => s && (s.status === 'Active' || s.status === 'Pending'))
    .slice(0, 8)
    .map(s => {
      const pnlPoints = s.points || 0;
      const pnlStr = pnlPoints > 0 ? `+${pnlPoints.toFixed(1)} pts` : `${pnlPoints.toFixed(1)} pts`;
      return {
        id: s.id,
        symbol: s.market,
        direction: s.type.includes('BUY') ? 'BUY' : 'SELL',
        entry: formatVal(s.entry),
        sl: formatVal(s.sl),
        tp1: formatVal(s.tp1),
        pnl: pnlStr,
        status: s.status,
        timeframe: s.timeframe || selectedTimeframe,
        points: s.points,
      };
    });

  // Fallback: If no trades are in state, display current active signal if valid
  if (activeTradesList.length === 0 && activeSignal) {
    const isBuy = activeSignal.type.includes('BUY');
    activeTradesList.push({
      id: activeSignal.id || 'current-active',
      symbol: activeSignal.market || market,
      direction: isBuy ? 'BUY' : 'SELL',
      entry: formatVal(activeSignal.entry),
      sl: formatVal(activeSignal.sl),
      tp1: formatVal(activeSignal.tp1),
      pnl: '+0.00 pts',
      status: activeSignal.status || 'Active',
      timeframe: activeSignal.timeframe || selectedTimeframe,
      points: activeSignal.points || 0,
    });
  }

  // Format real trading signals list for SignalsPanel
  const formattedSignalsList = (allSignals || []).slice(0, 6).map(sig => ({
    id: sig.id,
    symbol: sig.market,
    timeframe: sig.timeframe || selectedTimeframe,
    direction: sig.type.includes('BUY') ? 'BUY' : 'SELL',
    confidence: sig.qualityScore || 94,
    tp: formatVal(sig.tp1),
    sl: formatVal(sig.sl),
  }));

  // Ensure current active recommendation is present in the signals list
  if (formattedSignalsList.length === 0 && activeSignal) {
    formattedSignalsList.push({
      id: activeSignal.id || 'sig-current',
      symbol: activeSignal.market || market,
      timeframe: activeSignal.timeframe || selectedTimeframe,
      direction: activeSignal.type.includes('BUY') ? 'BUY' : 'SELL',
      confidence: activeSignal.qualityScore || 94,
      tp: formatVal(activeSignal.tp1),
      sl: formatVal(activeSignal.sl),
    });
  }

  return (
    <HomeScreen
      market={{
        symbol: market,
        price: formattedPrice,
        timeframe: selectedTimeframe
      }}
      analysis={{
        supplyDemand: true,
        bos: true,
        choch: Boolean(activeSignal?.qualityScore ? activeSignal.qualityScore >= 75 : true),
        orderBlocks: true,
        fvg: Boolean(activeSignal?.qualityScore ? activeSignal.qualityScore >= 88 : true),
        liquidity: true,
        mtf: Boolean(activeSignal?.qualityScore ? activeSignal.qualityScore >= 86 : true),
        trend: activeSignal?.type === 'SELL' ? 'هابط مؤسسي (Bearish)' : 'صاعد مؤسسي (Bullish)',
        structure: 'CHoCH + Order Block Verified',
        bias: activeSignal?.type || 'BUY'
      }}
      alerts={alertsData}
      onToggleAlert={onToggleAlert as any}
      trades={activeTradesList}
      signalsList={formattedSignalsList}
      signal={signalData}
      tradePlan={tradePlan}
      deriv={derivData}
      onSaveDeriv={handleSaveDeriv}
      onDerivExecutionToggle={() => {
        setAutoExecution(prev => {
          const next = !prev;
          localStorage.setItem('mm_vip_deriv_auto_execution', String(next));
          return next;
        });
      }}
      onDerivAccountTypeChange={(type) => {
        setAccountType(type);
        localStorage.setItem('mm_vip_deriv_account_type', type);
      }}
      onSelectMarket={(sym) => setMarket(sym as MarketSymbol)}
      onGenerateRealSignal={onGenerateRealSignal}
      onOpenAnalysis={() => onSelectTab('analysis')}
    />
  );
};
export default Home;
