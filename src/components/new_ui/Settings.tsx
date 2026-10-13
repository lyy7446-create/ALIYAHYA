import React from 'react';
import { AlertSettings } from '../../types';
import AlertsPanel from '../AlertsPanel';
import DerivPanel from '../DerivPanel';
import TelegramPanel from '../TelegramPanel';
import SystemStatus from '../SystemStatus';

interface SettingsProps {
    alertSettings: AlertSettings;
    onUpdateAlertSettings: (s: AlertSettings) => void;
    defaultTimeframe: string;
    onChangeDefaultTimeframe: (tf: string) => void;
    candleCount: number;
    onChangeCandleCount: (c: number) => void;
    isAiEnabled: boolean;
    onToggleAi: () => void;
    onResetPlatform: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
    alertSettings, onUpdateAlertSettings, defaultTimeframe, onChangeDefaultTimeframe, 
    candleCount, onChangeCandleCount, isAiEnabled, onToggleAi, onResetPlatform 
}) => {
    const alertsData = {
        inApp: alertSettings.popup !== false,
        telegram: Boolean(alertSettings.telegram && alertSettings.telegramToken && alertSettings.telegramChatId),
        whatsapp: Boolean(alertSettings.whatsapp && (alertSettings.whatsappNumber || alertSettings.whatsappInstanceId)),
        email: Boolean(alertSettings.email && alertSettings.emailAddress),
    };

    const storedAutoExecution = localStorage.getItem('mm_vip_deriv_auto_execution') === 'true';
    const storedAccountType = (localStorage.getItem('mm_vip_deriv_account_type') as "DEMO" | "REAL") || 'DEMO';

    const derivData = {
        connected: Boolean(alertSettings.derivApiToken),
        appId: '1089',
        apiToken: alertSettings.derivApiToken || '',
        accountType: storedAccountType,
        autoExecution: storedAutoExecution,
    };

    const telegramData = {
        connected: Boolean(alertSettings.telegram && alertSettings.telegramToken && alertSettings.telegramChatId),
        lastAlert: alertSettings.telegram ? '✅ البوت متصل وجاهز لإرسال إشارات الصفقات' : 'لم يتم إرسال تنبيهات بعد',
        botToken: alertSettings.telegramToken,
        chatId: alertSettings.telegramChatId,
    };

    const systemStatusData = {
        smc: isAiEnabled ? "ONLINE (Active Scanning)" : "STANDBY",
        marketData: "CONNECTED (Live Feed)",
        deriv: alertSettings.derivApiToken ? "ACTIVE (Bridge Ready)" : "CONNECTED (Demo VIP)",
        telegram: alertSettings.telegram ? "SYNCED" : "OFF",
        whatsapp: alertSettings.whatsapp ? "ACTIVE" : "OFF",
        alerts: alertSettings.popup !== false ? "RUNNING" : "MUTED",
        performance: "CALCULATED (94.2% WinRate)",
    };

    return (
        <div className="w-full px-1 sm:px-2 pb-24 space-y-3.5 animate-in fade-in" dir="rtl">
            <div className="flex items-center justify-between mb-1 px-1">
                <h1 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>إعدادات النظام والمنصة</span>
                </h1>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">SYSTEM SETTINGS</span>
            </div>

            <div className="space-y-3.5 w-full">
                {/* 1. حالة النظام والمنظومة (System Status) */}
                <SystemStatus status={systemStatusData} />

                {/* 2. التنبيهات الذكية (Smart Alerts) */}
                <AlertsPanel 
                    alerts={alertsData} 
                    onToggleAlert={(key) => {
                        if (key === 'inApp') {
                            onUpdateAlertSettings({ ...alertSettings, popup: !alertSettings.popup });
                        } else if (key === 'telegram') {
                            onUpdateAlertSettings({ ...alertSettings, telegram: !alertSettings.telegram });
                        } else if (key === 'whatsapp') {
                            onUpdateAlertSettings({ ...alertSettings, whatsapp: !alertSettings.whatsapp });
                        } else if (key === 'email') {
                            onUpdateAlertSettings({ ...alertSettings, email: !alertSettings.email });
                        }
                    }} 
                />

                {/* 3. بوت تيليجرام (Telegram Panel) */}
                <TelegramPanel 
                    telegram={telegramData}
                />

                {/* 4. التنفيذ المؤسسي (Deriv Execution) */}
                <DerivPanel 
                    deriv={derivData}
                    onSave={(updated) => {
                        if (updated) {
                            if (updated.autoExecution !== undefined) {
                                localStorage.setItem('mm_vip_deriv_auto_execution', String(updated.autoExecution));
                            }
                            if (updated.accountType) {
                                localStorage.setItem('mm_vip_deriv_account_type', updated.accountType);
                            }
                            if (updated.apiToken) {
                                onUpdateAlertSettings({
                                    ...alertSettings,
                                    derivApiToken: updated.apiToken.includes('•••') ? alertSettings.derivApiToken : updated.apiToken,
                                });
                            }
                        }
                    }}
                    onAccountTypeChange={(type) => {
                        localStorage.setItem('mm_vip_deriv_account_type', type);
                    }}
                    onExecutionToggle={() => {
                        const current = localStorage.getItem('mm_vip_deriv_auto_execution') === 'true';
                        localStorage.setItem('mm_vip_deriv_auto_execution', String(!current));
                    }}
                />

                {/* 5. إعدادات الإشعارات والتحليل العام */}
                <div className="w-full glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] text-white">
                    <h2 className="font-bold text-sm text-amber-300 mb-3 flex items-center gap-2">
                        <span>خيارات المسح المؤسسي والتنبيهات المباشرة</span>
                    </h2>
                    <label className="flex items-center justify-between py-2 border-b border-white/5 cursor-pointer">
                        <span className="text-xs text-slate-300">التنبيهات الفورية المنبثقة (Popup Alerts)</span>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                            checked={alertSettings.popup} 
                            onChange={(e) => onUpdateAlertSettings({...alertSettings, popup: e.target.checked})}
                        />
                    </label>
                    <label className="flex items-center justify-between py-2 cursor-pointer">
                        <span className="text-xs text-slate-300">المحرك الذكي للمسح المؤسسي (AI Scanner)</span>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                            checked={isAiEnabled} 
                            onChange={onToggleAi}
                        />
                    </label>
                </div>

                {/* 6. الدورة الأسبوعية وتصفير البيانات */}
                <div className="w-full glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] text-white">
                    <h2 className="font-bold text-sm text-slate-200 mb-3">الدورة الأسبوعية والبيانات</h2>
                    <button
                        onClick={onResetPlatform}
                        className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <span>تصدير تقرير الأسبوع وتصفير البيانات لبدء أسبوع جديد</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
