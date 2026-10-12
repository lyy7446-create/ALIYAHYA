import React from 'react';
import { 
  Home, 
  BarChart2, 
  Zap, 
  Award, 
  Settings, 
  Compass,
  History
} from 'lucide-react';

export type TabType = 'home' | 'markets' | 'analysis' | 'signals' | 'performance' | 'history' | 'settings' | 'more';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  // requested structure:
  // HOME, MARKETS, SIGNALS, HISTORY, MORE
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'markets', label: 'الأسواق', icon: BarChart2 },
    { id: 'signals', label: 'الإشارات', icon: Zap },
    { id: 'history', label: 'السجل', icon: History },
    { id: 'more', label: 'المزيد', icon: Settings },
  ] as const;

  return (
    <nav 
      aria-label="التنقل الرئيسي"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#060913]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 transition-all"
      dir="rtl"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center justify-center w-full h-full cursor-pointer transition-all active:scale-95 select-none relative group"
            >
              <div
                className={`flex flex-col items-center justify-center transition-all duration-200 ${
                  isActive ? 'scale-105' : 'group-hover:scale-105'
                }`}
              >
                {/* Active Icon with Gold/Green Glow */}
                <div
                  className={`p-1 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                {/* Typography */}
                <span
                  className={`text-[10px] font-sans font-bold tracking-tight transition-colors duration-200 -mt-0.5 ${
                    isActive
                      ? 'text-[#D4AF37] font-black'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* Glowing Indicator Pill below active item */}
              {isActive && (
                <span className="absolute bottom-0.5 w-5 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
