import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleRecover = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  private handleClearAndRecover = () => {
    try {
      localStorage.removeItem('mm_vip_candles_XAUUSD');
      localStorage.removeItem('mm_vip_candles_EURUSD');
      localStorage.removeItem('mm_vip_candles_GBPUSD');
      localStorage.removeItem('mm_vip_candles_BTCUSD');
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="max-w-md w-full p-6 bg-[#131218] border border-red-500/30 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl border border-red-500/30">
              ⚠️
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-white mb-1">تمت استعادة حماية النظام بنجاح</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                حدث استثناء غير متوقع في محرك التحديث، وتم تفعيل درع الحماية لمنع الإغلاق المفاجئ. يمكنك استئناف العمل فوراً.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-[#0a0a0c] p-3 rounded-lg border border-slate-800 text-left font-mono text-[10px] text-red-300 max-h-24 overflow-y-auto" dir="ltr">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              <button
                onClick={this.handleRecover}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#e6c15c] text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
              >
                استئناف المنصة 🔄
              </button>
              <button
                onClick={this.handleClearAndRecover}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                تحديث الشمعات ⚡
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
