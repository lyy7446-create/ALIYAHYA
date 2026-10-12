import React from "react";
import { Bell, MessageSquare, Send, Mail } from "lucide-react";

export interface AlertsState {
  inApp?: boolean;
  telegram?: boolean;
  whatsapp?: boolean;
  email?: boolean;
}

export interface AlertsPanelProps {
  alerts?: AlertsState;
  onToggleAlert?: (key: keyof AlertsState) => void;
}

export default function AlertsPanel({ alerts, onToggleAlert }: AlertsPanelProps) {
  return (
    <section className="alerts-panel">
      <div className="alerts-panel-header">
        <div className="title">
          <Bell className="icon" />
          <span>التنبيهات الذكية (Smart Alerts)</span>
        </div>
        <span className="badge">LIVE</span>
      </div>

      <div 
        className={`alert-item ${onToggleAlert ? 'clickable' : ''}`}
        onClick={() => onToggleAlert?.('inApp')}
      >
        <div className="label-col">
          <Bell className="item-icon" />
          <span>إشعارات التطبيق (In-App)</span>
        </div>
        <b className={alerts?.inApp ? "active" : "off"}>
          {alerts?.inApp ? "ACTIVE" : "OFF"}
        </b>
      </div>

      <div 
        className={`alert-item ${onToggleAlert ? 'clickable' : ''}`}
        onClick={() => onToggleAlert?.('telegram')}
      >
        <div className="label-col">
          <Send className="item-icon text-sky-400" />
          <span>تيليجرام (Telegram)</span>
        </div>
        <b className={alerts?.telegram ? "connected" : "off"}>
          {alerts?.telegram ? "CONNECTED" : "OFF"}
        </b>
      </div>

      <div 
        className={`alert-item ${onToggleAlert ? 'clickable' : ''}`}
        onClick={() => onToggleAlert?.('whatsapp')}
      >
        <div className="label-col">
          <MessageSquare className="item-icon text-emerald-400" />
          <span>واتساب (WhatsApp)</span>
        </div>
        <b className={alerts?.whatsapp ? "connected" : "off"}>
          {alerts?.whatsapp ? "CONNECTED" : "OFF"}
        </b>
      </div>

      <div 
        className={`alert-item ${onToggleAlert ? 'clickable' : ''}`}
        onClick={() => onToggleAlert?.('email')}
      >
        <div className="label-col">
          <Mail className="item-icon text-amber-400" />
          <span>البريد الإلكتروني (Email)</span>
        </div>
        <b className={alerts?.email ? "active" : "off"}>
          {alerts?.email ? "ACTIVE" : "OFF"}
        </b>
      </div>
    </section>
  );
}
