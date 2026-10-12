import React from "react";

export interface AnalysisData {
  supplyDemand?: boolean;
  bos?: boolean;
  choch?: boolean;
  orderBlocks?: boolean;
  fvg?: boolean;
  liquidity?: boolean;
  mtf?: boolean;
  trend?: string;
  structure?: string;
  bias?: string;
  [key: string]: any;
}

export interface AnalysisPanelProps {
  analysis?: AnalysisData;
  isConnected?: boolean;
}

export default function AnalysisPanel({ analysis, isConnected = true }: AnalysisPanelProps) {
  const items: [string, boolean | undefined][] = [
    ["العرض والطلب (Supply / Demand)", analysis?.supplyDemand],
    ["كسر الهيكل (BOS)", analysis?.bos],
    ["تغير السلوك السعري (CHOCH)", analysis?.choch],
    ["الكتل الترتيبية (Order Blocks)", analysis?.orderBlocks],
    ["فجوات القيمة العادلة (FVG)", analysis?.fvg],
    ["مناطق السيولة المؤسسية (Liquidity)", analysis?.liquidity],
    ["تحليل متعدد الأطر الزمنية (MTF)", analysis?.mtf],
  ];

  return (
    <section className="analysis-panel" dir="rtl">
      <header>
        <h2>
          <span>التحليل المؤسسي</span>
        </h2>
        <span>SMC</span>
      </header>

      {!isConnected && (
        <div className="mb-3 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs text-center font-bold">
          ⚠️ التحليل متوقف مؤقتاً — بانتظار الاتصال بالخادم
        </div>
      )}

      {items.map(([name, value]) => (
        <div className="analysis-row" key={name}>
          <span>{name}</span>
          <strong className={isConnected && value ? "active" : "waiting"}>
            {!isConnected ? "بانتظار الاتصال" : (value ? "مفعّل" : "قيد الانتظار")}
          </strong>
        </div>
      ))}
    </section>
  );
}
