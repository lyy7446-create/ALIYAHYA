import React from "react";
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Target, ShieldAlert } from "lucide-react";

export interface ActiveTradeItem {
  id: string | number;
  symbol: string;
  direction?: "BUY" | "SELL" | string;
  entry: number | string;
  sl: number | string;
  tp1: number | string;
  pnl?: number | string;
  status: "Active" | "Pending" | string;
  timeframe?: string;
  points?: number;
}

export interface ActiveTradesProps {
  trades?: ActiveTradeItem[];
}

export default function ActiveTrades({ trades = [] }: ActiveTradesProps) {
  return (
    <section className="active-trades" dir="rtl">
      <div className="active-trades-header">
        <div className="title">
          <Activity className="icon" />
          <span>الصفقات النشطة (Active Trades)</span>
        </div>
        <span className="count-badge">
          {trades.length} {trades.length === 1 ? "صفقة" : "صفقات"}
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="empty-trades">
          <Clock className="w-6 h-6 text-slate-500 mb-1.5 animate-pulse" />
          <p className="text-xs font-bold text-slate-300">لا توجد صفقات نشطة حالياً</p>
          <span className="text-[11px] text-slate-500 font-mono">في انتظار اقتناص مناطق السيولة وكسر الهيكل</span>
        </div>
      ) : (
        <div className="trades-list">
          {trades.map((trade) => {
            const isBuy = trade.direction?.toUpperCase().includes("BUY");
            const isSell = trade.direction?.toUpperCase().includes("SELL");
            const pnlNum = typeof trade.pnl === "number" ? trade.pnl : parseFloat(trade.pnl?.toString() || "0");
            const isProfit = !isNaN(pnlNum) && pnlNum > 0;
            const isLoss = !isNaN(pnlNum) && pnlNum < 0;

            const directionClass = isBuy ? "buy" : isSell ? "sell" : "";

            return (
              <article className="trade-card" key={trade.id}>
                <header>
                  <div className="symbol-wrap">
                    <strong>{trade.symbol}</strong>
                    {trade.timeframe && (
                      <small className="timeframe-badge">{trade.timeframe}</small>
                    )}
                  </div>
                  <span className={`direction-badge ${directionClass}`}>
                    {isBuy && <ArrowUpRight className="w-3.5 h-3.5 inline ml-0.5 stroke-[3]" />}
                    {isSell && <ArrowDownRight className="w-3.5 h-3.5 inline ml-0.5 stroke-[3]" />}
                    {trade.direction}
                  </span>
                </header>

                <div className="trade-details-grid">
                  <div className="detail-item">
                    <span className="label">Entry:</span>
                    <strong className="val">{trade.entry}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">SL:</span>
                    <strong className="val text-rose-400">{trade.sl}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">TP1:</span>
                    <strong className="val text-emerald-400">{trade.tp1}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">P/L:</span>
                    <strong className={`val font-mono ${isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-300"}`}>
                      {trade.pnl ?? "+0.00"}
                    </strong>
                  </div>
                  <div className="detail-item status-col">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${trade.status?.toLowerCase()}`}>
                      {trade.status}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
