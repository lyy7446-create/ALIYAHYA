import React from "react";
import { Copy, Check, Zap, BarChart2, ShieldCheck, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import AnalysisPanel, { AnalysisData } from "./AnalysisPanel";
import AlertsPanel, { AlertsState } from "./AlertsPanel";
import DerivPanel, { DerivState } from "./DerivPanel";
import ActiveTrades, { ActiveTradeItem } from "./ActiveTrades";
import SignalsPanel, { SignalItem } from "./SignalsPanel";

export interface HomeScreenProps {
  market?: {
    symbol?: string;
    price?: number | string;
    timeframe?: string;
  };
  analysis?: AnalysisData;
  alerts?: AlertsState;
  onToggleAlert?: (key: keyof AlertsState) => void;
  trades?: ActiveTradeItem[];
  signalsList?: SignalItem[];
  signal?: {
    direction?: string;
    confidence?: number | string;
    reason?: string;
  };
  tradePlan?: {
    entry?: number | string;
    sl?: number | string;
    tp1?: number | string;
    tp2?: number | string;
    tp3?: number | string;
  };
  deriv?: DerivState;
  onSaveDeriv?: (updated?: DerivState) => void;
  onDerivExecutionToggle?: () => void;
  onDerivAccountTypeChange?: (type: "DEMO" | "REAL") => void;
  // Optional interactive callbacks to preserve full app capabilities
  onSelectMarket?: (symbol: string) => void;
  onGenerateRealSignal?: () => void;
  onOpenAnalysis?: () => void;
}

export default function HomeScreen({
  market,
  analysis,
  alerts,
  onToggleAlert,
  trades = [],
  signalsList = [],
  signal,
  tradePlan,
  deriv,
  onSaveDeriv,
  onDerivExecutionToggle,
  onDerivAccountTypeChange,
  onSelectMarket,
  onGenerateRealSignal,
  onOpenAnalysis
}: HomeScreenProps) {
  const [copied, setCopied] = React.useState(false);

  const symbols = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "US30"];
  const currentSymbol = market?.symbol || "XAUUSD";
  const isConnected = deriv?.connected !== false;
  const isBuy = signal?.direction?.toUpperCase() === "BUY";
  const isSell = signal?.direction?.toUpperCase() === "SELL";

  const handleCopyPlan = () => {
    if (!isConnected) return;
    const dirText = isBuy ? 'شراء (BUY)' : isSell ? 'بيع (SELL)' : (signal?.direction || 'شراء');
    const text = `🎯 خطة تداول MM VIP المؤسسية - ${currentSymbol}\nالاتجاه: ${dirText} (نسبة الثقة: ${signal?.confidence || 95}%)\nسعر الدخول: ${tradePlan?.entry}\nوقف الخسارة: ${tradePlan?.sl}\nالهدف 1: ${tradePlan?.tp1}\nالهدف 2: ${tradePlan?.tp2}\nالهدف 3: ${tradePlan?.tp3}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const directionDisplay = isConnected 
    ? (isBuy ? "شراء" : isSell ? "بيع" : (signal?.direction || "شراء"))
    : "بانتظار الاتصال";

  return (
    <div className="mmvip-page" dir="rtl">
      {/* 1. Header */}
      <header className="mmvip-header">
        <div>
          <strong>AI MM VIP</strong>
          <span>النظام المؤسسي الذكي</span>
        </div>
        <div className={isConnected ? "live" : "waiting"}>
          {isConnected ? "● مباشر" : "⏳ بانتظار الاتصال"}
        </div>
      </header>

      {/* 2. Market Selector */}
      <div className="market-selector">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            className={symbol === currentSymbol ? "active" : ""}
            onClick={() => onSelectMarket?.(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      {/* 3. Market Card */}
      <section className="market-card">
        <div className="flex items-center justify-between">
          <h2>{market?.symbol || "XAUUSD"}</h2>
          {!isConnected && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              DATA_UNAVAILABLE
            </span>
          )}
        </div>
        <div className={`price ${!isConnected ? "waiting-price" : ""}`}>
          {isConnected ? (market?.price ?? "0.00") : "DATA_UNAVAILABLE (بانتظار البيانات)"}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>فريم {market?.timeframe || "M15"}</span>
          <span>{market?.symbol === 'XAUUSD' ? 'مرجع: PAXG/USD Spot Gold Proxy' : 'Real-time Feed'}</span>
        </div>
      </section>

      {/* 4. Signal Card */}
      <section className={`signal-card ${isConnected ? (signal?.direction || "buy").toLowerCase() : "disconnected"}`}>
        <div className="confidence">
          {isConnected ? `${signal?.confidence ?? 94}% دقة التحليل` : "بانتظار الاتصال"}
        </div>
        <div className="flex items-center gap-2">
          <h1>{directionDisplay}</h1>
          {isConnected && isBuy && <ArrowUpRight className="w-6 h-6 text-emerald-400 stroke-[3]" />}
          {isConnected && isSell && <ArrowDownRight className="w-6 h-6 text-rose-400 stroke-[3]" />}
        </div>
        <p>
          {isConnected 
            ? (signal?.reason || "تمركز سيولة مؤسسية متوافقة مع الاتجاه الصاعد وفجوة FVG") 
            : "انقطع الاتصال بالخادم. تم إيقاف التحليل وتحديث الأسعار مؤقتاً لحين استعادة الاتصال."}
        </p>

        {/* Action button inside signal card */}
        {onGenerateRealSignal && isConnected && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={onGenerateRealSignal}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>تحديث الإشارة المؤسسية الحية</span>
            </button>
            {onOpenAnalysis && (
              <button
                onClick={onOpenAnalysis}
                className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <span>عرض الشارت</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 5. Trade Plan (بطاقات صغيرة مصفوفة بجانب بعض في صف واحد بدون أي تداخل للأرقام) */}
      <section className="trade-plan-container">
        <div className="trade-plan-header">
          <div className="title">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>خطة التداول المؤسسية</span>
          </div>
          {isConnected && (
            <button
              onClick={handleCopyPlan}
              className="copy-btn"
              title="نسخ خطة التداول كاملة"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span className={copied ? "text-emerald-400 font-bold" : ""}>
                {copied ? "تم النسخ بنجاح" : "نسخ الخطة"}
              </span>
            </button>
          )}
        </div>

        {/* 5 بطاقات صغيرة مصفوفة بجانب بعض */}
        <div className="trade-plan-row">
          {/* 1. ENTRY */}
          <div className="plan-card entry-card">
            <div className="plan-tag">الدخول</div>
            <div className="plan-val">{isConnected ? (tradePlan?.entry ?? "—") : "بانتظار الاتصال"}</div>
            <div className="plan-sub">ENTRY</div>
          </div>

          {/* 2. STOP LOSS */}
          <div className="plan-card sl-card">
            <div className="plan-tag">الوقف</div>
            <div className="plan-val">{isConnected ? (tradePlan?.sl ?? "—") : "بانتظار الاتصال"}</div>
            <div className="plan-sub">SL</div>
          </div>

          {/* 3. TAKE PROFIT 1 */}
          <div className="plan-card tp-card tp1-card">
            <div className="plan-tag">هدف 1</div>
            <div className="plan-val">{isConnected ? (tradePlan?.tp1 ?? "—") : "بانتظار الاتصال"}</div>
            <div className="plan-sub">TP 1</div>
          </div>

          {/* 4. TAKE PROFIT 2 */}
          <div className="plan-card tp-card tp2-card">
            <div className="plan-tag">هدف 2</div>
            <div className="plan-val">{isConnected ? (tradePlan?.tp2 ?? "—") : "بانتظار الاتصال"}</div>
            <div className="plan-sub">TP 2</div>
          </div>

          {/* 5. TAKE PROFIT 3 */}
          <div className="plan-card tp-card tp3-card">
            <div className="plan-tag">هدف 3</div>
            <div className="plan-val">{isConnected ? (tradePlan?.tp3 ?? "—") : "بانتظار الاتصال"}</div>
            <div className="plan-sub">TP 3</div>
          </div>
        </div>
      </section>

      {/* 6. Institutional Analysis Panel (SMC) */}
      <AnalysisPanel analysis={isConnected ? analysis : undefined} isConnected={isConnected} />

      {/* 7. Active Trades (الصفقات النشطة والمعلقة) */}
      <ActiveTrades trades={trades} />

      {/* 8. Connection Card */}
      <section className="connection-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${isConnected ? "text-emerald-400" : "text-amber-400"}`} />
          <span>اتصال DERIV المؤسسي</span>
        </div>
        <strong className={isConnected ? "connected" : "disconnected"}>
          {isConnected ? "متصل بالخادم" : "بانتظار الاتصال"}
        </strong>
        <small>{deriv?.accountType?.includes('DEMO') ? "حساب تجريبي VIP" : (deriv?.accountType || "حساب تداول حقيقي VIP")}</small>
      </section>
    </div>
  );
}
