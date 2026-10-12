import React from 'react';

export const Performance: React.FC = () => {
  return (
    <div className="w-full px-1 sm:px-2 pb-24 space-y-3.5 animate-in fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>لوحة الأداء والإحصائيات المؤسسية</span>
        </h1>
        <span className="text-[10px] text-slate-400 font-sans font-bold uppercase">إحصائيات الصفقات والأرباح</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
        <div className="w-full glass-panel p-4 rounded-2xl text-center border border-emerald-500/20 bg-emerald-950/20 shadow-lg">
            <h3 className="text-slate-300 text-[11px] tracking-wider mb-1 font-bold">معدل الفوز التراكمي</h3>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">72.4%</p>
            <span className="text-[10px] text-emerald-400/90 font-sans font-bold mt-1 block">نسبة نجاح الصفقات</span>
        </div>
        <div className="w-full glass-panel p-4 rounded-2xl text-center border border-amber-500/20 bg-amber-950/20 shadow-lg">
            <h3 className="text-slate-300 text-[11px] tracking-wider mb-1 font-bold">صافي النقاط المحققة</h3>
            <p className="text-2xl sm:text-3xl font-black font-mono text-[#D4AF37]">+145.6</p>
            <span className="text-[10px] text-amber-400/90 font-sans font-bold mt-1 block">صافي ربح النقاط (Pips)</span>
        </div>
      </div>
      <div className="w-full glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <h3 className="text-white text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
            <span>الأصول الأكثر ربحية وكفاءة</span>
          </h3>
          <span className="text-[10px] font-sans text-slate-400 font-bold">أعلى أداء</span>
        </div>
        <div className="space-y-3">
            <div className="flex justify-between text-sm items-center border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-white font-mono font-bold">XAUUSD</span>
                  <span className="text-[10px] text-slate-400 font-sans">الذهب</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">+86.4 نقطة</span>
            </div>
            <div className="flex justify-between text-sm items-center border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-white font-mono font-bold">EURUSD</span>
                  <span className="text-[10px] text-slate-400 font-sans">اليورو</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">+42.7 نقطة</span>
            </div>
            <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  <span className="text-white font-mono font-bold">BTCUSD</span>
                  <span className="text-[10px] text-slate-400 font-sans">البيتكوين</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">+16.5 نقطة</span>
            </div>
        </div>
      </div>
    </div>
  );
};
