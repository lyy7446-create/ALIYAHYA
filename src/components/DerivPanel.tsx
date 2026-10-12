import React, { useState } from "react";
import { ShieldCheck, Cpu, Key, KeyRound, Check } from "lucide-react";

export interface DerivState {
  connected?: boolean;
  appId?: string | number;
  apiToken?: string;
  accountType?: "DEMO" | "REAL" | string;
  autoExecution?: boolean;
}

export interface DerivPanelProps {
  deriv?: DerivState;
  onSave?: (updated?: DerivState) => void;
  onExecutionToggle?: () => void;
  onAccountTypeChange?: (type: "DEMO" | "REAL") => void;
}

export default function DerivPanel({
  deriv,
  onSave,
  onExecutionToggle,
  onAccountTypeChange
}: DerivPanelProps) {
  const [appId, setAppId] = useState(deriv?.appId?.toString() ?? "1089");
  const [apiToken, setApiToken] = useState(deriv?.apiToken ?? "••••••••••••••••");
  const [accountType, setAccountType] = useState<"DEMO" | "REAL">(
    deriv?.accountType?.includes("REAL") ? "REAL" : "DEMO"
  );
  const [autoExecution, setAutoExecution] = useState(deriv?.autoExecution ?? false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isConnected = deriv?.connected !== false;

  const handleAccountSwitch = (type: "DEMO" | "REAL") => {
    setAccountType(type);
    onAccountTypeChange?.(type);
  };

  const handleToggle = () => {
    setAutoExecution(!autoExecution);
    onExecutionToggle?.();
  };

  const handleSave = () => {
    onSave?.({
      connected: isConnected,
      appId,
      apiToken,
      accountType,
      autoExecution
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  return (
    <section className="deriv-panel" dir="rtl">
      <div className="deriv-panel-header">
        <div className="title">
          <Cpu className="icon" />
          <span>التنفيذ المؤسسي (Deriv Execution)</span>
        </div>
        <span className="badge">MT5 BRIDGE</span>
      </div>

      <div className="status-row">
        <div className={`status ${isConnected ? "connected" : "disconnected"}`}>
          <span className="status-dot">●</span>
          <span>{isConnected ? "متصل (CONNECTED)" : "غير متصل (DISCONNECTED)"}</span>
        </div>
        <div className="account-tag">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{accountType === "REAL" ? "حساب حقيقي VIP" : "حساب تجريبي DEMO"}</span>
        </div>
      </div>

      <div className="input-group">
        <label>
          <Key className="w-3.5 h-3.5" />
          <span>معرّف التطبيق (App ID)</span>
        </label>
        <input 
          value={appId} 
          onChange={(e) => setAppId(e.target.value)}
          placeholder="1089" 
        />
      </div>

      <div className="input-group">
        <label>
          <KeyRound className="w-3.5 h-3.5" />
          <span>رمز الوصول المؤسسي (API Token)</span>
        </label>
        <input 
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="أدخل رمز Deriv API Token"
          type="password"
        />
      </div>

      <div className="account-switch">
        <button 
          type="button"
          className={accountType === "DEMO" ? "active" : ""}
          onClick={() => handleAccountSwitch("DEMO")}
        >
          حساب تجريبي (DEMO)
        </button>
        <button 
          type="button"
          className={accountType === "REAL" ? "active" : ""}
          onClick={() => handleAccountSwitch("REAL")}
        >
          حساب حقيقي (REAL)
        </button>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <span>التنفيذ الآلي للصفقات (Auto Execution)</span>
          <small>تنفيذ فوري لصفقات Smart Orders عبر خوادم Deriv</small>
        </div>
        <input
          type="checkbox"
          checked={autoExecution}
          onChange={handleToggle}
        />
      </div>

      <button className="save-btn" type="button" onClick={handleSave}>
        {savedSuccess ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم حفظ الإعدادات بنجاح!</span>
          </>
        ) : (
          <span>حفظ الإعدادات (SAVE SETTINGS)</span>
        )}
      </button>
    </section>
  );
}
