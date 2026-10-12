import React from "react";
import { Zap, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";

export interface SignalItem {
  id: string | number;
  symbol: string;
  timeframe?: string;
  direction?: "BUY" | "SELL" | string;
  confidence?: number | string;
  tp?: number | string;
  sl?: number | string;
}

export interface SignalsPanelProps {
  signals?: SignalItem[];
  onGenerateRealSignal?: () => void;
  onOpenAnalysis?: () => void;
}

export default function SignalsPanel({ 
  signals = [],
  onGenerateRealSignal,
  onOpenAnalysis 
}: SignalsPanelProps) {
  return (
    <section className="signals-panel" dir="rtl">
      <div className="signals-panel-header">
        <div className="title">
          <Zap className="icon" />
          <span>إشارات التداول الذكية (Trading Signals)</span>
        </div>
        <div className="flex items-center gap-2">
          {onGenerateRealSignal && (
            <button
              onClick={onGenerateRealSignal}
              className="text-[10.5px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors py-0.5 px-2 rounded-lg bg-amber-500/10 border border-amber-500/25 active:scale-95 cursor-pointer"
              title="تحديث الإشارات الذكية"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>تحديث فوري</span>
            </button>
          )}
          <span className="count-badge">
            {signals.length} {signals.length === 1 ? "إشارة" : "إشارات"}
          </span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="empty-signals">
          <Compass className="w-6 h-6 text-slate-500 mb-1.5 animate-spin-slow" />
          <p className="text-xs font-bold text-slate-300">لا توجد إشارات جديدة حالياً</p>
          <span className="text-[11px] text-slate-500 font-mono">
            جاري مسح كتل السيولة وفجوات FVG لإصدار إشارات فائقة الدقة
          </span>
        </div>
      ) : (
        <div className="signals-list">
          {signals.map((signal) => {
            const isBuy = signal.direction?.toUpperCase().includes("BUY");
            const isSell = signal.direction?.toUpperCase().includes("SELL");
            const dirClass = isBuy ? "buy" : isSell ? "sell" : "";

            return (
              <article className="signal-item" key={signal.id}>
                <div className="symbol-col">
                  <strong>{signal.symbol}</strong>
                  <small>{signal.timeframe || "M15"}</small>
                </div>

                <div className={`direction-col ${dirClass}`}>
                  <span className="dir-text">{signal.direction}</span>
                  {isBuy && <ArrowUpRight className="dir-icon stroke-[3]" />}
                  {isSell && <ArrowDownRight className="dir-icon stroke-[3]" />}
                </div>

                <div className="confidence-col">
                  <span className="conf-badge">{signal.confidence}%</span>
                </div>

                <div className="targets-col">
                  <span className="tp-line">
                    <b className="label">TP:</b> {signal.tp}
                  </span>
                  <span className="sl-line">
                    <b className="label">SL:</b> {signal.sl}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
