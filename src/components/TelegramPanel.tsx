import React, { useState } from "react";
import { Send, Check, AlertCircle } from "lucide-react";

export interface TelegramState {
  connected?: boolean;
  lastAlert?: string;
  botToken?: string;
  chatId?: string;
}

export interface TelegramPanelProps {
  telegram?: TelegramState;
  onTest?: () => void;
}

export default function TelegramPanel({ telegram, onTest }: TelegramPanelProps) {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const isConnected = telegram?.connected ?? false;

  const handleTest = async () => {
    if (onTest) {
      onTest();
      return;
    }

    setTesting(true);
    setTestStatus(null);
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: telegram?.botToken,
          chatId: telegram?.chatId
        })
      });
      const data = await response.json();
      if (data.success) {
        setTestStatus('SUCCESS');
      } else {
        setTestStatus('ERROR');
      }
    } catch {
      setTestStatus('ERROR');
    } finally {
      setTesting(false);
      setTimeout(() => setTestStatus(null), 3500);
    }
  };

  return (
    <section className="telegram-panel" dir="rtl">
      <div className="telegram-panel-header">
        <div className="title">
          <Send className="icon text-sky-400" />
          <span>Telegram</span>
        </div>
        <span className="badge">VIP BOT</span>
      </div>

      <div className="connection-status-row">
        <div className={`connection-status ${isConnected ? "connected" : "disconnected"}`}>
          <span className="status-dot">●</span>
          <span>{isConnected ? "CONNECTED" : "DISCONNECTED"}</span>
        </div>
      </div>

      <div className="last-alert-box">
        <span className="label">Last Alert:</span>
        <p className="alert-text">{telegram?.lastAlert ?? "No alerts yet"}</p>
      </div>

      <button 
        type="button"
        className="test-btn"
        disabled={testing}
        onClick={handleTest}
      >
        {testing ? (
          <span>جاري إرسال إشعار تجريبي...</span>
        ) : testStatus === 'SUCCESS' ? (
          <span className="flex items-center gap-1.5 text-emerald-300">
            <Check className="w-4 h-4" />
            تم إرسال التنبيه التجريبي بنجاح!
          </span>
        ) : testStatus === 'ERROR' ? (
          <span className="flex items-center gap-1.5 text-rose-300">
            <AlertCircle className="w-4 h-4" />
            فشل الإرسال، تحقق من صحة الرمز والقناة
          </span>
        ) : (
          <span>TEST CONNECTION</span>
        )}
      </button>
    </section>
  );
}
