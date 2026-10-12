import React from "react";

export interface SignalDetailsProps {
  signal?: {
    symbol?: string;
    direction?: string;
    confidence?: number | string;
    entry?: number | string;
    sl?: number | string;
    tp1?: number | string;
    tp2?: number | string;
    tp3?: number | string;
  };
  analysis?: {
    bos?: boolean;
    choch?: boolean;
    supply?: boolean;
    demand?: boolean;
    fvg?: boolean;
    liquidity?: boolean;
  };
}

export default function SignalDetails({ signal, analysis }: SignalDetailsProps) {
  const isBuy = signal?.direction?.toUpperCase().includes("BUY");
  const isSell = signal?.direction?.toUpperCase().includes("SELL");
  const dirClass = isBuy ? "buy" : isSell ? "sell" : "";

  return (
    <section className="signal-details" dir="rtl">
      <header>
        <h2>{signal?.symbol ?? "XAUUSD"}</h2>
        <strong className={dirClass}>{signal?.direction ?? "BUY"}</strong>
        <span>{signal?.confidence ?? 95}%</span>
      </header>

      <div className="levels">
        <div>
          <span>ENTRY</span>
          <b>{signal?.entry ?? "—"}</b>
        </div>
        <div>
          <span>SL</span>
          <b>{signal?.sl ?? "—"}</b>
        </div>
        <div>
          <span>TP1</span>
          <b>{signal?.tp1 ?? "—"}</b>
        </div>
        <div>
          <span>TP2</span>
          <b>{signal?.tp2 ?? "—"}</b>
        </div>
        <div>
          <span>TP3</span>
          <b>{signal?.tp3 ?? "—"}</b>
        </div>
      </div>

      <div className="smc-details">
        <p>BOS: {analysis?.bos ? "✓" : "—"}</p>
        <p>CHOCH: {analysis?.choch ? "✓" : "—"}</p>
        <p>Supply: {analysis?.supply ? "✓" : "—"}</p>
        <p>Demand: {analysis?.demand ? "✓" : "—"}</p>
        <p>FVG: {analysis?.fvg ? "✓" : "—"}</p>
        <p>Liquidity: {analysis?.liquidity ? "✓" : "—"}</p>
      </div>
    </section>
  );
}

export { SignalDetails };
