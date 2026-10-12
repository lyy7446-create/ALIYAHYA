import React from 'react';
import { Shield, BookOpen, Layers, Zap, Landmark, Compass, X, Check } from 'lucide-react';

interface SMCExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SMCExplainModal: React.FC<SMCExplainModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0d0d12] border border-[#22222d] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-slate-100 font-sans">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#121217] border-b border-[#1b1b22]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 px-1.5 bg-[#1e1e24] text-[10px] font-bold text-slate-300 rounded border border-[#2d2d3e]">SMC / ICT AUDIT</div>
            <h3 className="font-bold text-sm tracking-wide uppercase text-white flex items-center gap-1.5">
              <Landmark size={15} className="text-emerald-400" /> دليل المفاهيم الذكية للمؤسسات المالية
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors border border-transparent hover:border-[#20202a] bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content body layout */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-sm leading-relaxed text-right" dir="rtl">
          
          <div className="p-4 bg-[#121217] rounded-xl border border-[#1b1b22]">
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              يقوم هذا المؤشر الفني (<span className="text-white font-bold">AI MM VIP Institutional</span>) بعمل محاكاة رقمية متقدمة لخوارزمية تداول الأسواق التي تستخدمها البنوك والمؤسسات الكبرى للتداول على الذهب والفوركس. يعتمد النظام على تتبع مستمر للسيولة ومناطق التجميع والتحكم بالأسعار.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: BOS */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <Compass size={14} />
                <span>BOS (Break of Structure) / كسر الهيكل</span>
              </div>
              <p className="text-[11px] text-slate-400">
                يحدث كسر الهيكل الهيكلي في الاتجاه الصاعد عندما يتجاوز الإغلاق القمة السابقة (Higher High)، أو في الاتجاه الهابط بتجاوز القاع السابق (Lower Low)، وهو ما يؤكد استمرار الاتجاه العام.
              </p>
            </div>

            {/* Box 2: CHOCH */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs mb-1">
                <Zap size={14} />
                <span>CHoCH (Change of Character) / تغير الطبيعة</span>
              </div>
              <p className="text-[11px] text-slate-400">
                هو الإشارة الأولى والمنعطف الرئيسي الذي يوضح حدوث انعكاس محتمل للاتجاه، ويتم التعبير عنه عند كسر أول قاع فرعي صاعد، أو تصفية قمة فرعية هابطة أخيرة.
              </p>
            </div>

            {/* Box 3: Order Blocks */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                <Landmark size={14} />
                <span>Order Blocks (OB) / كتل أوامر البنوك</span>
              </div>
              <p className="text-[11px] text-slate-400">
                هي آخر شمعة هابطة قبل تحرك هائل صاعد للأعلى (Bullish OB)، أو آخر شمعة صاعدة قبل هبوط مدوي للأسفل (Bearish OB). حيث تترك المؤسسات خلفها مستويات شراء معلقة غير منفذة.
              </p>
            </div>

            {/* Box 4: FVG */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
                <Layers size={14} />
                <span>Fair Value Gap (FVG) / الفجوة العادلة للقيمة</span>
              </div>
              <p className="text-[11px] text-slate-400">
                يتم رصد الفجوة السعرية ذات القيمة العادلة كحالة عدم توازن وعرض متسارع تترك مساحة شاغرة بين ذيل الشمعة الأولى والذيل المقابل للشمعة الثالثة. يسعى السعر دوماً للعودة لملء هذا الفراغ.
              </p>
            </div>

            {/* Box 5: Liquidity Sweep */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <Check size={14} />
                <span>Liquidity Sweep / صيد وسحب السيولة</span>
              </div>
              <p className="text-[11px] text-slate-400">
                تقوم خوارزميات البنوك بتحريك السعر عمداً فوق القمم المزدوجة أو تحت القيعان لتفعيل أوامر وقف الخسارة (Stops) للمتداولين الصغار لتجميع كميات هائلة قبل دفع السعر في الاتجاه الحقيقي.
              </p>
            </div>

            {/* Box 6: Breaker Blocks */}
            <div className="p-3.5 bg-[#0f0f13] border border-[#1d1d26] rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-1">
                <Compass size={14} />
                <span>Breaker Blocks / كتل الكسر والدعم العكسي</span>
              </div>
              <p className="text-[11px] text-slate-400">
                عبارة عن منطقة كتل أوامر (Order Block) تسببت في حدوث كسر هيكل سعرى فعال، ثم تم كسرها لاحقاً بواسطة حركة مضادة عنيفة؛ فتتحول لدعم أو مقامة عكسية بالغة الأهمية.
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors rounded-xl border border-emerald-500/15 flex items-start gap-3">
            <span className="p-1 px-2.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg leading-normal mt-1">نصيحة VIP</span>
            <div>
              <h5 className="font-bold text-white text-xs mb-1">تداول كالمحترفين وبانضباط صارم!</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ينصح دوماً بالانتظار حتى يدخل السعر إلى مناطق العرض أو الطلب وتأكيد كسر الهيكل مع الاتجاه العام للمؤشر (Best TF: M15) لضمان جودة صفقة قياسية (Quality A+) بنسبة مكافأة إلى مخاطرة ممتازة.
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions bar */}
        <div className="flex items-center justify-end px-5 py-3 bg-[#111116] border-t border-[#1b1b22]">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition-all"
          >
            حسناً، فهمت الاستراتيجية
          </button>
        </div>

      </div>
    </div>
  );
};
