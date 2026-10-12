import React, { useState } from 'react';
import { 
  Bell, 
  Sliders, 
  Cpu, 
  User, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Volume2, 
  Send, 
  RefreshCw,
  Clock,
  Layers,
  Info
} from 'lucide-react';
import { AlertSettings } from '../types';

interface SettingsScreenProps {
  alertSettings: AlertSettings;
  onUpdateAlertSettings: (newSettings: AlertSettings) => void;
  defaultTimeframe: string;
  onChangeDefaultTimeframe: (tf: string) => void;
  candleCount: number;
  onChangeCandleCount: (count: number) => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  onResetPlatform?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  alertSettings,
  onUpdateAlertSettings,
  defaultTimeframe,
  onChangeDefaultTimeframe,
  candleCount,
  onChangeCandleCount,
  isAiEnabled,
  onToggleAi,
  onResetPlatform,
}) => {
  const [activeSection, setActiveSection] = useState<
    'alerts' | 'analysis' | 'account' | 'subscription' | 'help'
  >('alerts');

  const [telegramToken, setTelegramToken] = useState(alertSettings.telegramToken || '');
  const [telegramChatId, setTelegramChatId] = useState(alertSettings.telegramChatId || '');
  const [derivApiToken, setDerivApiToken] = useState(alertSettings.derivApiToken || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSaveSettings = () => {
    onUpdateAlertSettings({
      ...alertSettings,
      telegram: true,
      telegramToken,
      telegramChatId,
      derivApiToken,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleValidateToken = async () => {
    if (!derivApiToken) return;
    setIsValidating(true);
    setValidationMsg(null);
    try {
      const response = await fetch('/api/deriv/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: derivApiToken }),
      });
      const data = await response.json();
      if (data.success) {
        setValidationMsg({ type: 'success', text: 'تم التحقق من صحة الرمز بنجاح!' });
      } else {
        setValidationMsg({ type: 'error', text: data.error || 'فشل التحقق من الرمز.' });
      }
    } catch (e) {
      setValidationMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-right animate-in fade-in" dir="rtl">
      
      {/* Screen Header */}
      <div className="pb-3 border-b border-white/[0.08]">
        <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide flex items-center gap-2">
          <span>الإعدادات</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            SETTINGS
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          تخصيص تنبيهات التداول، محرك الذكاء الاصطناعي المؤسسي، وحساب المستخدم
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/[0.06] overflow-x-auto custom-scrollbar">
        {[
          { id: 'alerts', label: 'إعدادات التنبيهات', icon: Bell },
          { id: 'analysis', label: 'إعدادات التحليل', icon: Sliders },
          { id: 'account', label: 'إدارة الحساب والملف', icon: User },
          { id: 'subscription', label: 'إدارة الاشتراك', icon: CreditCard },
          { id: 'help', label: 'مركز المساعدة', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSection === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: إعدادات التنبيهات */}
      {activeSection === 'alerts' && (
        <div className="space-y-4">
          <div className="institutional-card rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <Bell size={16} className="text-amber-400" />
              <span>قنوات وتفضيلات التنبيهات</span>
            </h3>

            {/* Toggles List */}
            <div className="space-y-3">
              {[
                { key: 'popup', label: 'إشعارات الشاشة الفورية (Popups)', desc: 'عرض نافذة منبثقة عند تشكل فرصة زيرو انعكاس' },
                { key: 'alertOnSignal', label: 'تنبيه الأوامر المعلقة (Limit Orders)', desc: 'إشعار لحظي عند تحديد منطقة دخول مؤسسية جديدة' },
                { key: 'alertOnTP', label: 'تنبيه تحقيق الأهداف (Take Profit)', desc: 'إشعار فوري عند ملامسة TP1 أو TP2 أو TP3' },
                { key: 'alertOnSL', label: 'تنبيه وقف الخسارة (Stop Loss)', desc: 'إشعار عند ضرب مستوى الحماية' },
              ].map((item) => {
                const checked = (alertSettings as any)[item.key] ?? true;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      onUpdateAlertSettings({
                        ...alertSettings,
                        [item.key]: !checked,
                      });
                    }}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{item.label}</span>
                      <span className="text-[10.5px] text-slate-400">{item.desc}</span>
                    </div>

                    <div className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${checked ? 'bg-amber-500 justify-start' : 'bg-slate-700 justify-end'}`}>
                      <div className="w-4 h-4 rounded-full bg-slate-950 shadow-sm" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Telegram Setup Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1629] to-[#070b16] border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <Send size={15} className="text-sky-400" />
                <span className="text-xs font-bold text-slate-100">
                  ربط وتفعيل بوت Telegram الآلي (قناة التوصيات الخاصة)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Telegram Bot Token:</label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="مثال: 7123456789:AAH..."
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Chat ID أو معرف القناة:</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="مثال: -100123456789"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Deriv API Token Field */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Deriv API Token (PAT):</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={derivApiToken}
                    onChange={(e) => setDerivApiToken(e.target.value)}
                    placeholder="أدخل الرمز هنا..."
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleValidateToken}
                    disabled={isValidating}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-all"
                  >
                    {isValidating ? 'جاري التحقق...' : 'تحقق'}
                  </button>
                </div>
                {validationMsg && (
                  <p className={`text-[10px] mt-1 ${validationMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {validationMsg.text}
                  </p>
                )}
              </div>

              <button
                onClick={handleSaveSettings}
                className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSaved ? <Check size={14} /> : <Send size={14} />}
                <span>{isSaved ? 'تم الحفظ والربط بنجاح ✓' : 'حفظ الإعدادات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: إعدادات التحليل */}
      {activeSection === 'analysis' && (
        <div className="space-y-4">
          <div className="institutional-card rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <Sliders size={16} className="text-amber-400" />
              <span>إعدادات التحليل وخوارزميات صانع السوق</span>
            </h3>

            {/* الفريم الافتراضي */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block">الفريم الافتراضي (Default Timeframe):</span>
                <span className="text-[10.5px] text-slate-400">الإطار الزمني الأساسي لتحميل وتدقيق كتل الأوامر</span>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                {['M5', 'M15', 'M30', 'H1', 'H4'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => onChangeDefaultTimeframe(tf.toLowerCase())}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      defaultTimeframe.toUpperCase() === tf
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* عدد الشموع للتحليل */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block">عدد الشموع للتحليل (Candle Depth):</span>
                <span className="text-[10.5px] text-slate-400">عمق الشموع السابقة لفحص كسر الهيكل BOS وتراكم السيولة</span>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                {[50, 90, 150].map((count) => (
                  <button
                    key={count}
                    onClick={() => onChangeCandleCount(count)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      candleCount === count
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {count} شمعة
                  </button>
                ))}
              </div>
            </div>

            {/* تفعيل الذكاء الاصطناعي */}
            <div
              onClick={onToggleAi}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">تفعيل محرك الذكاء الاصطناعي (AI Confluence Engine):</span>
                  <span className="text-[10.5px] text-slate-400">تقييم قوة الإشارة وحساب مستويات الإبطال ومسح السيولة تلقائياً</span>
                </div>
              </div>

              <div className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${isAiEnabled ? 'bg-emerald-500 justify-start' : 'bg-slate-700 justify-end'}`}>
                <div className="w-4 h-4 rounded-full bg-slate-950 shadow-sm" />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 3: إدارة الحساب والملف الشخصي */}
      {activeSection === 'account' && (
        <div className="space-y-4">
          <div className="institutional-card rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <User size={16} className="text-amber-400" />
              <span>الملف الشخصي وإدارة الحساب المؤسسي</span>
            </h3>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/50 flex items-center justify-center font-mono font-black text-base text-amber-300">
                VIP
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">متداول مؤسسي معتمد</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    نشط (Active)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">ID: #MM-INSTITUTIONAL-7782</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">البريد الإلكتروني المرتبط:</span>
                <span className="font-mono text-slate-200">trader.vip@institutional.org</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">نوع الترخيص:</span>
                <span className="font-bold text-amber-300">AI MM VIP Enterprise Lifetime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: إدارة الاشتراك */}
      {activeSection === 'subscription' && (
        <div className="space-y-4">
          <div className="institutional-card rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <CreditCard size={16} className="text-amber-400" />
              <span>إدارة الاشتراك والترخيص المؤسسي</span>
            </h3>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141d33] via-[#0e1628] to-[#141d33] border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">خطة الاشتراك الحالية:</span>
                <span className="text-xs font-mono font-black text-[#D4AF37]">INSTITUTIONAL VIP UNLIMITED</span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                وصول مدى الحياة (Lifetime License)
              </div>
              <p className="text-[11px] text-slate-400">
                يشمل وصولاً كاملاً لإشارات الذهب، الفوركس، المؤشرات، ومحرك زيرو انعكاس وتنبيهات التيليجرام.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: مركز المساعدة وتسجيل الخروج */}
      {activeSection === 'help' && (
        <div className="space-y-4">
          <div className="institutional-card rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <HelpCircle size={16} className="text-amber-400" />
              <span>مركز المساعدة ودليل مفاهيم SMC / ICT</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <strong className="text-amber-300 block mb-1">ما هي صفقات زيرو انعكاس (Zero Drawdown)؟</strong>
                هي صفقات يتم وضع أوامرها المعلقة (Limit) داخل مناطق طلب أو عرض غير ملموسة إطلاقاً (Fresh / Unmitigated Order Blocks) بعد حدوث سحب كامل للسيولة، مما يجعل السعر يرتد فورياً بدون أي انعكاس سلبي.
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <strong className="text-amber-300 block mb-1">كيف تضمن أفضل عائد للمخاطرة (1:6+)؟</strong>
                عبر الدخول القناص في مناطق الخصم العميقة وتحديد وقف خسارة رقمي صغير جداً لا يتعدى 15-20 نقطة في الذهب مع استهداف سيولة القمم البعيدة.
              </div>
            </div>

            {/* Logout / Reset Action */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-slate-400">إعادة تعيين أو تسجيل الخروج:</span>
              <button
                onClick={() => {
                  if (onResetPlatform) {
                    onResetPlatform();
                  }
                }}
                className="py-2 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span>تسجيل الخروج / إعادة ضبط</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
