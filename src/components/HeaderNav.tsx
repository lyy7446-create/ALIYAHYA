import React, { useState } from 'react';
import { 
  Bell, 
  Menu, 
  X, 
  Activity, 
  Volume2, 
  VolumeX, 
  Sliders, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { MarketSymbol } from '../types';

interface HeaderNavProps {
  currentMarket: MarketSymbol;
  isLiveConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCalibration: () => void;
  onOpenAlertSettings: () => void;
  onSelectTab: (tab: 'home' | 'markets' | 'analysis' | 'signals' | 'performance' | 'settings') => void;
  activeTab: string;
  unreadAlertsCount?: number;
  alertLogs?: string[];
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentMarket,
  isLiveConnected,
  soundEnabled,
  onToggleSound,
  onOpenCalibration,
  onOpenAlertSettings,
  onSelectTab,
  activeTab,
  unreadAlertsCount = 0,
  alertLogs = [],
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#060913]/90 backdrop-blur-xl border-b border-white/[0.07] px-2 sm:px-4 py-2 transition-all">
        <div className="w-full flex items-center justify-between gap-3">
          
          {/* Right Section (in RTL): Menu Button & MM Logo Brand Lockup */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-all cursor-pointer shadow-sm active:scale-95"
              title="القائمة الرئيسية"
              aria-label="القائمة الرئيسية"
            >
              <Menu size={18} />
            </button>

            {/* MM Luxury Institutional Logo */}
            <div 
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              {/* Luxury Gold MM Badge */}
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-yellow-600/30 border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.25)] group-hover:border-[#D4AF37] transition-all">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  {/* Miniature Crown Indicator */}
                  <span className="text-[10px] text-amber-300 leading-none drop-shadow-[0_0_4px_#D4AF37]">👑</span>
                </div>
                <span className="font-mono font-black text-sm tracking-tighter text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]">
                  MM
                </span>
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-wider gold-gradient-text font-mono">
                    AI MM VIP
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-widest hidden xs:inline-block">
                    PRO
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-wider -mt-0.5 font-sans">
                  لوحة التداول المؤسسي
                </span>
              </div>
            </div>
          </div>

          {/* Left Section (in RTL): Live Status, Sound, Calibration & Notifications */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Market Connection Status Badge: LIVE or WAITING */}
            {isLiveConnected ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10.5px] font-black text-emerald-400 font-sans tracking-wider">
                  مباشر
                </span>
                <span className="text-[9px] text-slate-400 font-mono hidden md:inline-block border-r border-slate-700/80 pr-1.5 mr-0.5">
                  {currentMarket}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-[10.5px] font-black text-amber-400 font-sans tracking-wider">
                  بانتظار الاتصال
                </span>
                <span className="text-[9px] text-slate-400 font-mono hidden md:inline-block border-r border-slate-700/80 pr-1.5 mr-0.5">
                  {currentMarket}
                </span>
              </div>
            )}

            {/* Price Calibration / Broker Matching Button */}
            <button
              onClick={onOpenCalibration}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-amber-300 text-xs font-medium transition-all cursor-pointer"
              title="معايرة السعر مع وسيطك (Zero Delay)"
            >
              <Sliders size={13} className="text-amber-400" />
              <span className="text-[11px] font-semibold hidden md:inline">معايرة السعر</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                soundEnabled 
                  ? 'bg-slate-900/80 border-slate-700 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'كتم التنبيهات الصوتية' : 'تفعيل التنبيهات الصوتية'}
              aria-label="التحكم بالصوت"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative w-8.5 h-8.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
                title="تنبيهات وإشعارات النظام المؤسسي"
                aria-label="الإشعارات"
              >
                <Bell size={16} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotificationsOpen && (
                <div 
                  className="absolute left-0 mt-2 w-80 sm:w-88 rounded-2xl bg-[#0a0f1d] border border-amber-500/20 shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      <span className="text-xs font-bold text-slate-100">سجل إشعارات السوق المباشر</span>
                    </div>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white text-xs p-1 rounded-md"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pl-1">
                    {alertLogs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                        <Activity size={20} className="text-slate-500" />
                        <span>لا توجد تنبيهات جديدة في الوقت الحالي</span>
                      </div>
                    ) : (
                      alertLogs.slice(0, 15).map((log, idx) => (
                        <div 
                          key={idx}
                          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed hover:border-slate-700 transition-colors"
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        onOpenAlertSettings();
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders size={12} />
                      <span>تخصيص تنبيهات Telegram & الهاتف</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Slide-out Navigation Drawer for Quick Institutional Access */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-start animate-in fade-in" dir="rtl">
          <div className="w-72 sm:w-80 h-full bg-[#070b16] border-l border-white/[0.08] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right">
            
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <span className="font-mono font-black text-xs text-amber-400">MM</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 font-mono">AI MM VIP</h3>
                    <p className="text-[10px] text-slate-400 font-sans">المنظومة المؤسسية الذكية</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="mt-5 space-y-1.5">
                {[
                  { id: 'home', label: 'الرئيسية (لوحة التحكم)', icon: '🏛️' },
                  { id: 'markets', label: 'الأسواق والأسعار', icon: '📊' },
                  { id: 'analysis', label: 'الرسم والتحليل الفني', icon: '📈' },
                  { id: 'signals', label: 'أحدث الإشارات المؤسسية', icon: '⚡' },
                  { id: 'performance', label: 'الأداء والصفقات', icon: '🏆' },
                  { id: 'settings', label: 'الإعدادات والتنبيهات', icon: '⚙️' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id as any);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <ChevronLeft size={14} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>عضوية المؤسسات:</span>
                  <span className="text-amber-400 font-sans">اشتراك VIP نشط</span>
                </div>
                <p className="text-[10px] text-slate-400">منهجية صانع السوق SMC + ICT الذكية</p>
              </div>
            </div>

          </div>
          
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}
    </>
  );
};
