import React, { useState } from 'react';
import { AlertSettings, TradingSignal } from '../types';
import { Bell, Send, Mail, ShieldAlert, Check, HelpCircle, AlertTriangle, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import { getSafePlatformUrl, getApiBaseUrl } from '../utils/marketEngine';
import {
  formatPendingSignalTelegram,
  formatOrderActivatedTelegram,
  formatTPReachedTelegram,
  formatSLHitTelegram,
} from '../utils/telegramFormatters';

interface AlertSettingsPanelProps {
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  logs: string[];
  onClearLogs: () => void;
}

export const AlertSettingsPanel: React.FC<AlertSettingsPanelProps> = ({
  settings,
  onChangeSettings,
  logs,
  onClearLogs,
}) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [waTestStatus, setWaTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [waErrorMessage, setWaErrorMessage] = useState('');

  // Handle standard toggles
  const handleToggle = (key: keyof Omit<AlertSettings, 'emailAddress' | 'telegramToken' | 'telegramChatId' | 'whatsappInstanceId' | 'whatsappToken' | 'whatsappNumber'>) => {
    onChangeSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleTextChange = (
    key: 'emailAddress' | 'telegramToken' | 'telegramChatId' | 'whatsappInstanceId' | 'whatsappToken' | 'whatsappNumber' | 'derivApiToken',
    value: string
  ) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSelectChange = (key: 'whatsappGatewayType', value: 'clicktochat' | 'ultramsg' | 'greenapi' | 'twilio') => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  // Helper to send telegram messages reliably (Proxy first, direct fallback)
  const sendTelegramViaProxyOrDirect = async (text: string, parseMode: string = 'HTML'): Promise<{ ok: boolean; description?: string }> => {
    const apiBase = getApiBaseUrl();
    try {
      const proxyRes = await fetch(`${apiBase}/api/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: settings.telegramToken,
          chatId: settings.telegramChatId,
          text,
          parseMode,
        }),
        signal: AbortSignal.timeout(15000),
      }).catch((fetchErr) => {
        console.warn('Proxy telegram dispatch warning:', fetchErr?.message || fetchErr);
        return null;
      });

      if (proxyRes) {
        const data = await proxyRes.json().catch(() => ({}));
        if (proxyRes.ok && (data.success || data.ok)) {
          return { ok: true };
        }
        if (data.error) {
          return { ok: false, description: data.error };
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy telegram dispatch fell back to direct client:', proxyErr);
    }

    // Direct fallback if proxy call failed
    try {
      const url = `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text,
          parse_mode: parseMode,
        }),
        signal: AbortSignal.timeout(15000),
      }).catch((directFetchErr) => {
        console.warn('Direct telegram fetch notice:', directFetchErr?.message || directFetchErr);
        return null;
      });

      if (!response) {
        return { ok: false, description: 'تعذر الاتصال بخوادم تيليجرام (مهلة الاتصال انتهت)' };
      }

      const resData = await response.json().catch(() => ({}));
      return { ok: Boolean(resData.ok), description: resData.description };
    } catch (directErr: any) {
      return { ok: false, description: directErr?.message || 'خطأ في الاتصال بخوادم تيليجرام.' };
    }
  };

  // Real telegram API test transmitter
  const testTelegramConnection = async () => {
    if (!settings.telegramToken || !settings.telegramChatId) {
      setTestStatus('error');
      setErrorMessage('الرجاء إدخال رمز البوت (Bot Token) ومعرف الدردشة (Chat ID) أولاً.');
      setTimeout(() => setTestStatus('idle'), 4000);
      return;
    }

    setTestStatus('sending');
    setErrorMessage('');

    const textMsg = `🔔 <b>AI MM VIP Institutional Signal Test</b>\n\n✅ <b>Connected Successfully!</b>\nYour VIP Indicator is now integrated with this Telegram Channel.\n\n🌐 App URL: ${getSafePlatformUrl()}`;

    try {
      const res = await sendTelegramViaProxyOrDirect(textMsg, 'HTML');
      if (res.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setErrorMessage(res.description || 'فشل الإرسال. تحقق من صحة الرموز المدخلة.');
      }
    } catch (e: any) {
      setTestStatus('error');
      setErrorMessage(e?.message || 'خطأ في الاتصال بالإنترنت.');
    }

    setTimeout(() => {
      setTestStatus('idle');
    }, 5000);
  };

  // Sample signal for testing
  const sampleSignal: TradingSignal = {
    id: 'test-gold-smc',
    market: 'XAUUSD',
    type: 'BUY LIMIT',
    entry: 2650.00,
    sl: 2640.00,
    tp1: 2665.00,
    tp2: 2680.00,
    tp3: 2700.00,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    day: 'اليوم',
    status: 'Pending',
    points: 0,
    quality: 'A+',
    qualityScore: 95,
    zoneMin: 2648.50,
    zoneMax: 2651.50,
    timeframe: 'M15',
    isStrictSMC: true,
    isSmartManaged: true,
  };

  // Test sending specific Telegram card stage
  const testTelegramStage = async (stage: 'signal' | 'activation' | 'tp1' | 'tp2' | 'tp3' | 'sl') => {
    if (!settings.telegramToken || !settings.telegramChatId) {
      setTestStatus('error');
      setErrorMessage('الرجاء إدخال رمز البوت (Bot Token) ومعرف الدردشة (Chat ID) أولاً.');
      setTimeout(() => setTestStatus('idle'), 4000);
      return;
    }

    setTestStatus('sending');
    setErrorMessage('');

    let htmlMsg = '';

    if (stage === 'signal') {
      const formatted = formatPendingSignalTelegram(sampleSignal);
      htmlMsg = formatted.htmlText;
    } else if (stage === 'activation') {
      const formatted = formatOrderActivatedTelegram({ ...sampleSignal, status: 'Active' });
      htmlMsg = formatted.htmlText;
    } else if (stage === 'tp1') {
      const formatted = formatTPReachedTelegram(sampleSignal, 'TP1', 150);
      htmlMsg = formatted.htmlText;
    } else if (stage === 'tp2') {
      const formatted = formatTPReachedTelegram(sampleSignal, 'TP2', 300);
      htmlMsg = formatted.htmlText;
    } else if (stage === 'tp3') {
      const formatted = formatTPReachedTelegram(sampleSignal, 'TP3', 500);
      htmlMsg = formatted.htmlText;
    } else if (stage === 'sl') {
      const formatted = formatSLHitTelegram(sampleSignal, -100, false);
      htmlMsg = formatted.htmlText;
    }

    try {
      const res = await sendTelegramViaProxyOrDirect(htmlMsg, 'HTML');
      if (res.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setErrorMessage(res.description || 'فشل الإرسال. تحقق من صحة الرموز.');
      }
    } catch (e: any) {
      setTestStatus('error');
      setErrorMessage(e?.message || 'خطأ في الاتصال.');
    }

    setTimeout(() => setTestStatus('idle'), 5000);
  };

  // Real WhatsApp API test transmitter
  const testWhatsAppConnection = async () => {
    const textMsg = `🔔 *تجربة ربط نظام إشارات تداول MM VIP بواتساب* 🚀\n\n✅ تم الربط بنجاح!\nمؤشرك الفني ومستشار SMC الذكي متصل ومستعد الآن لإرسال الإشارات وتحديثات الأهداف لصفقاتك تلقائياً وبأقصى سرعة وموثوقية.\n\n🌐 رابط المنصة: ${getSafePlatformUrl()}`;

    if (settings.whatsappGatewayType === 'clicktochat') {
      const targetPhone = settings.whatsappNumber ? settings.whatsappNumber.replace(/[^0-9]/g, '') : '';
      const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(textMsg)}`;
      window.open(waUrl, '_blank');
      setWaTestStatus('success');
      setTimeout(() => setWaTestStatus('idle'), 4000);
      return;
    }

    if (!settings.whatsappInstanceId || !settings.whatsappToken || !settings.whatsappNumber) {
      setWaTestStatus('error');
      setErrorMessage('الرجاء تعبئة كافة الحقول المطلوبة (معرف المثيل، الرمز السري، ورقم الوجهة/معرف المجموعة) أولاً.');
      setTimeout(() => setWaTestStatus('idle'), 4000);
      return;
    }

    setWaTestStatus('sending');
    setWaErrorMessage('');

    try {
      const apiBase = getApiBaseUrl();
      const resp = await fetch(`${apiBase}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayType: settings.whatsappGatewayType,
          instanceId: settings.whatsappInstanceId,
          token: settings.whatsappToken,
          number: settings.whatsappNumber,
          message: textMsg,
        }),
      });

      const resData = await resp.json().catch(() => ({}));
      if (resp.ok && (resData.success || resData.sent === 'true' || resData.ok)) {
        setWaTestStatus('success');
      } else {
        setWaTestStatus('error');
        setWaErrorMessage(resData.error || 'فشل الإرسال عبر بوابة WhatsApp. يرجى مراجعة بيانات الاعتماد.');
      }
    } catch (e: any) {
      setWaTestStatus('error');
      setWaErrorMessage(e?.message || 'تعذر الاتصال بخادم بوابة الـ API المستهدفة.');
    }

    setTimeout(() => {
      setWaTestStatus('idle');
    }, 5000);
  };

  // Push notifications activation standard workflow
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('متصفحك لا يدعم الإشعارات الفورية Desktop notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('AI MM VIP Institutional Active', {
        body: 'تم تفعيل الإشعارات الفورية للمؤشر بنجاح!',
        icon: '/favicon.ico',
      });
      handleToggle('push');
    } else {
      alert('تم رفض إذن الإشعارات من قبل المستخدم. يمكنك تعديله من إعدادات المتصفح.');
    }
  };

  return (
    <div className="flex flex-col bg-[#0d0d12] border border-[#1b1b22] text-white p-4 rounded-xl shadow-lg font-sans" dir="rtl">
      <div className="flex items-center space-x-2 space-x-reverse pb-3 border-b border-[#1b1b22] mb-4">
        <Bell className="text-amber-400 ml-2" size={18} />
        <h3 className="font-bold text-sm tracking-wide uppercase">إعدادات التنبيهات الذكية وإرسال الإشارات</h3>
      </div>

      {/* Alert Channels Options */}
      <div className="space-y-4 mb-5">
        {/* Row 1: Dashboard popup */}
        <div className="flex items-center justify-between p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50">
          <div>
            <div className="text-xs font-bold text-slate-200">Popup Alert / تنبيه منبثق</div>
            <div className="text-[10px] text-slate-400">تنبيهات فورية تظهر في واجهة لوحة التحكم</div>
          </div>
          <button
            onClick={() => handleToggle('popup')}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              settings.popup ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ${settings.popup ? '-translate-x-4.5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Row 2: Push notification */}
        <div className="flex items-center justify-between p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50">
          <div>
            <div className="text-xs font-bold text-slate-200">Push Notification / إشعارات سطح المكتب</div>
            <div className="text-[10px] text-slate-400">إرسال إشعارات لسطح المكتب عن طريق المتصفح</div>
          </div>
          <button
            onClick={settings.push ? () => handleToggle('push') : requestPushPermission}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              settings.push ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ${settings.push ? '-translate-x-4.5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Row 3: Email alerts */}
        <div className="p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">Email Alerts / تنبيه البريد الإلكتروني</div>
              <div className="text-[10px] text-slate-400">إرسال تفاصيل الفرص إلى صندوق البريد الخاص بك</div>
            </div>
            <button
              onClick={() => handleToggle('email')}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                settings.email ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ${settings.email ? '-translate-x-4.5' : 'translate-x-0'}`} />
            </button>
          </div>
          {settings.email && (
            <div className="relative mt-1">
              <Mail className="absolute right-2.5 top-2.5 text-slate-500" size={13} />
              <input
                type="email"
                value={settings.emailAddress}
                onChange={(e) => handleTextChange('emailAddress', e.target.value)}
                placeholder="vip-trader@domain.com"
                className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 pr-8 pl-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
              />
            </div>
          )}
        </div>

        {/* Row 4: Telegram alert */}
        <div className="p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                تنبيهات Telegram <span className="bg-sky-500/10 text-sky-400 text-[8px] px-1.5 py-0.2 rounded border border-sky-400/20">REAL API</span>
              </div>
              <div className="text-[10px] text-slate-400">إرسال الإشارات وتحديثات الصفقات فورا لقناتك أو مجموعتك على تليجرام</div>
            </div>
            <button
              onClick={() => handleToggle('telegram')}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                settings.telegram ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ${settings.telegram ? '-translate-x-4.5' : 'translate-x-0'}`} />
            </button>
          </div>

          {settings.telegram && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 font-sans mb-1">BOT TOKEN / رمز بوت التليجرام الخاص بك</label>
                <input
                  type="password"
                  value={settings.telegramToken}
                  onChange={(e) => handleTextChange('telegramToken', e.target.value)}
                  placeholder="123456789:ABCdefGhI..."
                  className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-sans mb-1">CHAT ID / معرف الدردشة أو القناة المستهدفة</label>
                <input
                  type="text"
                  value={settings.telegramChatId}
                  onChange={(e) => handleTextChange('telegramChatId', e.target.value)}
                  placeholder="-100123456789 (للقنوات والمجموعات) أو رقم معرف"
                  className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1.5 mt-2">
                <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>تجربة شكل بطاقات التوصية التفاعلية على تيليجرام:</span>
                  <button
                    type="button"
                    onClick={testTelegramConnection}
                    disabled={testStatus === 'sending'}
                    className="text-sky-400 hover:text-sky-300 text-[10px] flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Send size={10} /> فحص الاتصال (Ping)
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => testTelegramStage('signal')}
                    disabled={testStatus === 'sending'}
                    className="bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🚀 إشارة معلقة (Signal)
                  </button>

                  <button
                    type="button"
                    onClick={() => testTelegramStage('activation')}
                    disabled={testStatus === 'sending'}
                    className="bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🔵 تفعيل ودخول (Active)
                  </button>

                  <button
                    type="button"
                    onClick={() => testTelegramStage('tp1')}
                    disabled={testStatus === 'sending'}
                    className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🎯 الهدف 1 وتأمين (TP1)
                  </button>

                  <button
                    type="button"
                    onClick={() => testTelegramStage('tp2')}
                    disabled={testStatus === 'sending'}
                    className="bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🎯 الهدف 2 وحجز (TP2)
                  </button>

                  <button
                    type="button"
                    onClick={() => testTelegramStage('tp3')}
                    disabled={testStatus === 'sending'}
                    className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🏆 إغلاق كامل (TP3 Hit)
                  </button>

                  <button
                    type="button"
                    onClick={() => testTelegramStage('sl')}
                    disabled={testStatus === 'sending'}
                    className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-600/40 font-semibold text-[10px] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    🛑 وقف الخسارة (SL Hit)
                  </button>
                </div>
              </div>

              {/* Telegram message template preview */}
              <div className="bg-[#0b0e14] p-2.5 rounded border border-sky-900/40 text-[11px] font-mono text-slate-300 space-y-1 mt-2 select-all leading-relaxed">
                <div className="text-[10px] font-sans font-semibold text-sky-400 mb-1 border-b border-sky-900/40 pb-0.5 flex items-center justify-between">
                  <span>نموذج التوصية المعتمد على تليجرام:</span>
                  <span className="text-[9px] text-slate-400 font-normal">عدد الأهداف ديناميكي حسب جودة الصفقة (A+ / A / B)</span>
                </div>
                <div className="text-amber-300">⭐ القوة والجودة: A+ ★★★★★ (100% - SMC المؤسسي)</div>
                <div className="text-slate-400">⏰ الإطار الزمني: 1m | كسر هيكلي وسيولة BOS</div>
                <div className="text-emerald-400 font-bold">🟢 XAU/USD شراء LIMIT 🌀 (2650.00)</div>
                <div className="text-sky-300">TP ✅ 2665.00</div>
                <div className="text-sky-300">TP ✅ 2680.00</div>
                <div className="text-sky-300">TP ✅ 2700.00</div>
                <div className="text-rose-400 font-sans">....... وقف الخسارة: 2640.00</div>
              </div>

              {testStatus === 'sending' && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-sky-400 py-1 bg-sky-500/10 rounded border border-sky-500/20">
                  <div className="h-3 w-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري إرسال الرسالة إلى تليجرام عبر البوت...</span>
                </div>
              )}

              {testStatus === 'success' && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <Check size={13} className="text-emerald-400" />
                  <span>تم إرسال الرسالة لقناتك في تليجرام بنجاح! تفقد القناة الآن ⚡</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 font-sans mt-1 flex items-start gap-1">
                  <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage || 'فشل الإرسال. تحقق من صحة رمز البوت ورقم القناة/الدردشة.'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 5: Deriv API Token */}
        <div className="p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2">
            <span>🔑</span> ربط حساب تداول Deriv (API Token)
          </div>
          <div className="text-[10px] text-slate-400 mb-3">
            قم بإدخال رمز الوصول الشخصي (PAT) الخاص بحساب Deriv الخاص بك لتفعيل التداول الآلي.
          </div>
          <input
            type="password"
            value={settings.derivApiToken}
            onChange={(e) => handleTextChange('derivApiToken', e.target.value)}
            placeholder="أدخل API Token هنا..."
            className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
          />
        </div>

        {/* Row 6: WhatsApp alert */}
        <div className="p-2.5 bg-[#121217] rounded-lg border border-[#1b1b22]/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                تنبيهات WhatsApp <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1.5 py-0.2 rounded border border-emerald-400/20">NEW INTEGRATION</span>
              </div>
              <div className="text-[10px] text-slate-400">إرسال إشارات وتحديثات الصفقات فورياً لمجموعة واتساب أو هاتفك الشخصي</div>
            </div>
            <button
              onClick={() => handleToggle('whatsapp')}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                settings.whatsapp ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ${settings.whatsapp ? '-translate-x-4.5' : 'translate-x-0'}`} />
            </button>
          </div>

          {settings.whatsapp && (
            <div className="space-y-3 pt-1 border-t border-[#1b1b22] mt-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-sans mb-1">نوع الربط وبوابة الإرسال (WhatsApp Gateway)</label>
                <select
                  value={settings.whatsappGatewayType}
                  onChange={(e) => handleSelectChange('whatsappGatewayType', e.target.value as any)}
                  className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-2.5 rounded text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="clicktochat">مشاركة يدوية سريعة بنقرة واحدة (WhatsApp Click-to-Chat) - مجاني وبدون إعدادات</option>
                  <option value="ultramsg">بوابة UltraMsg (إرسال تلقائي في الخلفية لمجموعاتك وأرقامك)</option>
                  <option value="greenapi">بوابة Green-API (إرسال تلقائي - تدعم خطة مجانية للمطورين)</option>
                  <option value="twilio">خدمة Twilio Business API (للمؤسسات والشركات المعتمدة)</option>
                </select>
              </div>

              {settings.whatsappGatewayType === 'clicktochat' && (
                <div className="bg-[#121217]/60 p-2.5 rounded border border-[#2d2d3e]/30 text-[10px] text-slate-400 leading-relaxed space-y-1">
                  <div className="font-bold text-emerald-400">🎯 ميزة المشاركة اليدوية الفورية:</div>
                  <p>تسمح لك هذه الخطة بإرسال إشارات الشراء والبيع والضرب بنقرة واحدة إلى أي مجموعة واتساب أو هاتف دون الحاجة لاشتراك مدفوع أو بوابات مطورين. سيظهر زر مشاركة واتساب بجانب إشارات التداول الفعالة في المنصة تلقائياً!</p>
                  <div className="mt-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">رقم الهاتف الافتراضي (اختياري، مثلاً: 966500000000)</label>
                    <input
                      type="text"
                      value={settings.whatsappNumber}
                      onChange={(e) => handleTextChange('whatsappNumber', e.target.value)}
                      placeholder="966500000000"
                      className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1 px-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
                    />
                  </div>
                </div>
              )}

              {settings.whatsappGatewayType !== 'clicktochat' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-sans mb-1">
                      {settings.whatsappGatewayType === 'twilio' ? 'ACCOUNT SID / معرف الحساب' : 'INSTANCE ID / معرف المثيل الفرعي'}
                    </label>
                    <input
                      type="text"
                      value={settings.whatsappInstanceId}
                      onChange={(e) => handleTextChange('whatsappInstanceId', e.target.value)}
                      placeholder={settings.whatsappGatewayType === 'twilio' ? 'ACXXXXXXXXXXXXXXXXXXXX' : 'instance12345'}
                      className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-sans mb-1">
                      {settings.whatsappGatewayType === 'twilio' ? 'AUTH TOKEN / الرمز السري' : 'API TOKEN / الرمز السري لبوابة الإرسال'}
                    </label>
                    <input
                      type="password"
                      value={settings.whatsappToken}
                      onChange={(e) => handleTextChange('whatsappToken', e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-sans mb-1">
                      {settings.whatsappGatewayType === 'twilio' 
                        ? 'TARGET PHONE NUMBER / رقم الوجهة المستهدف مع رمز الدولة (مثال: +96650000000)' 
                        : 'TARGET PHONE NUMBER OR GROUP JID / رقم الوجهة أو معرف المجموعة (مثال: 120363@g.us للمجموعات)'}
                    </label>
                    <input
                      type="text"
                      value={settings.whatsappNumber}
                      onChange={(e) => handleTextChange('whatsappNumber', e.target.value)}
                      placeholder={settings.whatsappGatewayType === 'twilio' ? '+96650000000' : '96650000000 أو 120363215321631@g.us'}
                      className="w-full bg-[#0a0a0c] border border-[#2d2d3e] text-xs py-1.5 px-3 rounded text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">
                      {settings.whatsappGatewayType === 'ultramsg' && '💡 لإرسال للمجموعات عبر UltraMsg، استخدم معرّف المجموعة JID الذي ينتهي بـ @g.us.'}
                      {settings.whatsappGatewayType === 'greenapi' && '💡 لإرسال للمجموعات عبر Green-API، استخدم معرّف المجموعة JID الذي ينتهي بـ @g.us.'}
                    </p>
                  </div>

                  {/* WhatsApp Group JID Guide */}
                  <div className="bg-[#121217]/90 p-3 rounded-lg border border-[#1b1b22] text-xs text-slate-300 leading-relaxed mt-2">
                    <div className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                      <span>📢 كيف تحصل على معرف مجموعة الواتساب (Group JID)؟</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-slate-400">
                      {settings.whatsappGatewayType === 'ultramsg' && (
                        <>
                          <p>1. قم بتسجيل الدخول إلى حسابك في <span className="text-emerald-400 font-mono">UltraMsg</span> وافتح لوحة التحكم الخاصة بمثيلك الرقمي.</p>
                          <p>2. امسح رمز الاستجابة السريعة (QR Code) لتنشيط الرقم المخصص للإرسال داخل مجموعاتك.</p>
                          <p>3. من القائمة الجانبية اليسرى، انقر على خيار <span className="text-slate-200 font-semibold">"Groups / المجموعات"</span>.</p>
                          <p>4. ستظهر لك قائمة بكافة المجموعات المشترك بها رقمك، ابحث عن مجموعتك المطلوبة وانسخ معرف الـ <span className="text-slate-200 font-mono">Group JID</span> الذي ينتهي بـ <span className="text-emerald-400 font-mono">@g.us</span>.</p>
                          <p>5. الصق هذا المعرف بالكامل في حقل <span className="text-slate-200">"رقم الوجهة أو معرف المجموعة"</span> أعلاه.</p>
                        </>
                      )}
                      {settings.whatsappGatewayType === 'greenapi' && (
                        <>
                          <p>1. قم بتسجيل الدخول إلى حسابك في <span className="text-emerald-400 font-mono">Green-API</span> وفعّل مثيلك المجاني أو المدفوع.</p>
                          <p>2. امسح رمز الاستجابة السريعة (QR Code) لتسجيل الدخول بالرقم المرسل.</p>
                          <p>3. يمكنك جلب معرّفات المجموعات بسهولة عن طريق التوجه إلى قسم الاستعلام عن المجموعات أو تنفيذ دالة <span className="text-slate-200 font-mono">getGroups</span> من واجهة المطورين لديهم.</p>
                          <p>4. انسخ معرف المجموعة المستهدفة الذي ينتهي دائماً بـ <span className="text-emerald-400 font-mono">@g.us</span> (على سبيل المثال: <span className="text-slate-200 font-mono">120363071372839218@g.us</span>).</p>
                          <p>5. ضع هذا المعرف في حقل <span className="text-slate-200">"رقم الوجهة أو معرف المجموعة"</span> أعلاه لتوجيه الإشارات تلقائياً.</p>
                        </>
                      )}
                      {settings.whatsappGatewayType === 'twilio' && (
                        <>
                          <p>💡 تذكير: خدمة Twilio تتطلب موافقة رسمية من شركة Meta وقوالب رسائل معتمدة لإرسال الإشارات لعدة أرقام تابعة للمشتركين خارج البيئة التجريبية (Sandbox).</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={testWhatsAppConnection}
                disabled={waTestStatus === 'sending'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
              >
                {waTestStatus === 'idle' && (
                  <>
                    <MessageSquare size={12} className="ml-1" />
                    {settings.whatsappGatewayType === 'clicktochat' ? 'مشاركة تجريبية سريعة على واتساب 🚀' : 'إرسال رسالة تجريبية لتأكيد الاتصال بالواتساب ⚡'}
                  </>
                )}
                {waTestStatus === 'sending' && (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin ml-1"></div>
                    جاري التواصل مع خوادم واتساب المباشرة...
                  </>
                )}
                {waTestStatus === 'success' && (
                  <>
                    <Check size={12} className="text-emerald-300 ml-1" />
                    {settings.whatsappGatewayType === 'clicktochat' ? 'تم فتح نافذة المشاركة بنجاح! 🚀' : 'تم الإرسال بنجاح! تفقد الواتساب ⚡'}
                  </>
                )}
                {waTestStatus === 'error' && (
                  <>
                    <AlertTriangle size={12} className="text-rose-300 ml-1" /> فشل الإرسال
                  </>
                )}
              </button>

              {waErrorMessage && (
                <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 font-sans mt-1">
                  {waErrorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Signal Triggers & Follow-up Tracking Section */}
      <div className="mb-5 p-3 bg-[#121217] rounded-xl border border-[#20202d] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1b1b22]">
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping"></span>
              أحداث الإشارات وإشعارات التتبع المباشرة (Signal & Follow-up Triggers)
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              تحكم بدقة في أي إشعارات يتم إرسالها إلى تليجرام وقنوات التنبيه
            </p>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            AUTO-DISPATCH
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Trigger 1: New Pending Orders & Signals */}
          <div className="p-2 bg-[#0d0d12] rounded-lg border border-[#1b1b22] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🚀</span> إرسال الأوامر المعلقة فور إدراجها
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                إرسال تفاصيل الدخول والأهداف ووقف الخسارة ومستويات إدارة المخاطر
              </div>
            </div>
            <button
              onClick={() => handleToggle('alertOnSignal')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                settings.alertOnSignal ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                  settings.alertOnSignal ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger 2: Pending Order Triggered / Executed */}
          <div className="p-2 bg-[#0d0d12] rounded-lg border border-[#1b1b22] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🔵</span> إشعار تفعيل الأمر ودخول السوق
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                إشعار فوري عند وصول السعر لنقطة الدخول وتحول الأمر المعلق إلى صفقة نشطة
              </div>
            </div>
            <button
              onClick={() => handleToggle('alertOnPendingTrigger')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                settings.alertOnPendingTrigger !== false ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                  settings.alertOnPendingTrigger !== false ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger 3: Take Profit Reached (TP1, TP2, TP3) */}
          <div className="p-2 bg-[#0d0d12] rounded-lg border border-[#1b1b22] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🎯</span> إشعارات تحقيق الأهداف (TP1 / TP2 / TP3)
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                إرسال إشعار فوري مع عدد النقاط المحققة ونسبة حجز الأرباح التلقائية
              </div>
            </div>
            <button
              onClick={() => handleToggle('alertOnTP')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                settings.alertOnTP ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                  settings.alertOnTP ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger 4: Breakeven & Trailing Stop */}
          <div className="p-2 bg-[#0d0d12] rounded-lg border border-[#1b1b22] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛡️</span> تأمين الدخول والوقف المتحرك (Trailing/BE)
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                إشعار نقل الوقف لنقطة الدخول (+5 pips) أو ملاحقة الأرباح الذكية
              </div>
            </div>
            <button
              onClick={() => handleToggle('alertOnTrailing')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                settings.alertOnTrailing !== false ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                  settings.alertOnTrailing !== false ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trigger 5: Stop Loss & Secured Exits */}
          <div className="p-2 bg-[#0d0d12] rounded-lg border border-[#1b1b22] flex items-center justify-between md:col-span-2">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛑</span> إشعارات وقف الخسارة والخروج المحمي (Stop Loss)
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                إشعار بالخروج عند ضرب الوقف أو الخروج المحمي مع تسجيل النقاط المحققة
              </div>
            </div>
            <button
              onClick={() => handleToggle('alertOnSL')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                settings.alertOnSL ? 'bg-rose-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                  settings.alertOnSL ? '-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Live Alerts Fire Activity Log */}
      <div className="flex-1 flex flex-col min-h-[160px] bg-[#0a0a0e] rounded-lg border border-[#1b1b22] p-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1b1b22] mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-rose-500 animate-pulse ml-1" />
            سجل حركة التنبيهات المباشرة (Audit Log)
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <Trash2 size={9} /> مسح السجل
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[180px] space-y-1.5 pr-0.5">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] py-10 font-sans">
              <HelpCircle size={16} className="mb-1 text-slate-700" />
              لا تنبيهات مسجلة بعد. سيتم توثيق كل خطوة كدخول الصفقات وضرب الأهداف هنا!
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="text-[10px] font-mono p-1.5 bg-[#121217] border-r-2 border-amber-500 text-slate-300 rounded leading-relaxed text-right"
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
