import React from 'react';
import { BarChart2, Zap, AlertTriangle, Award, Settings, X } from 'lucide-react';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'analysis', label: 'التحليل', icon: BarChart2 },
    { id: 'trade', label: 'التنفيذ', icon: Zap },
    { id: 'alerts', label: 'التنبيهات', icon: AlertTriangle },
    { id: 'performance', label: 'الأداء', icon: Award },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="w-full max-w-md bg-[#0f172a] rounded-t-3xl p-6 animate-in slide-in-from-bottom">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">المزيد</h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-white">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-4 bg-[#1e293b] rounded-2xl gap-2 hover:bg-[#334155] transition-colors"
              >
                <Icon size={24} className="text-[#D4AF37]" />
                <span className="text-sm font-bold text-white">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
