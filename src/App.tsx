import React, { useState, useEffect, useRef } from 'react';
import { 
  MarketSymbol, 
  Candle, 
  SMCZone, 
  TradingSignal, 
  AlertSettings, 
  MarketMetrics, 
  TrendCondition 
} from './types';
import { 
  extractInstitutionalZones, 
  getSmartTrendCondition, 
  getMtfScannerResults, 
  getMarketMetrics, 
  generateSmartSignal, 
  applyLiveTick, 
  getActiveSessions,
  MARKET_BASES,
  fetchRealCandlesFromAPI,
  applyTrailingStopAndProfitLock,
  formatTimeframeBadge,
  getApiBaseUrl
} from './utils/marketEngine';
import {
  formatPendingSignalTelegram,
  formatOrderActivatedTelegram,
  formatTPReachedTelegram,
  formatTrailingAlertTelegram,
  formatSLHitTelegram,
  formatManualCloseTelegram,
  formatCancelAlertTelegram
} from './utils/telegramFormatters';

// Import custom sub-components
import { InteractiveChart, getTargetCountByStrength } from './components/InteractiveChart';
import { PerformanceTracker } from './components/PerformanceTracker';
import { AlertSettingsPanel } from './components/AlertSettingsPanel';
import { SMCExplainModal } from './components/SMCExplainModal';
import { StrategyParams } from './components/AIOptimizerModal';
import { HeaderNav } from './components/HeaderNav';
import { MainMarketCards } from './components/MainMarketCards';
import { AIAnalysisBanner } from './components/AIAnalysisBanner';
import { AIMarketInsight } from './components/AIMarketInsight';
import { LatestSignalsSection } from './components/LatestSignalsSection';
import { LatestIssuedSignalCard } from './components/LatestIssuedSignalCard';
import { SignalDetailModal } from './components/SignalDetailModal';
import { MarketsScreen } from './components/MarketsScreen';
import { AnalysisChartScreen } from './components/AnalysisChartScreen';
import { PerformanceScreen } from './components/PerformanceScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Home } from './components/new_ui/Home';
import { Markets } from './components/new_ui/Markets';
import { Analysis } from './components/new_ui/Analysis';
import { Signals } from './components/new_ui/Signals';
import { Performance } from './components/new_ui/Performance';
import { Settings } from './components/new_ui/Settings';
import { MoreMenu } from './components/new_ui/MoreMenu';
import { BottomNav, TabType } from './components/BottomNav';

// Icons
import { 
  TrendingUp, 
  Sliders, 
  Play, 
  Pause, 
  Activity, 
  Globe, 
  Volume2, 
  VolumeX, 
  Award, 
  Compass, 
  Smartphone, 
  HelpCircle,
  FileText,
  BarChart2,
  RefreshCw,
  Zap,
  Target,
  History,
  Sun,
  Moon,
  Sparkles,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  Settings as SettingsIcon,
  Brain,
  Shield,
  Cpu,
  Trash2,
  Coins,
  Cloud,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Check,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

const deduplicateSignals = (signals: TradingSignal[]): TradingSignal[] => {
  const uniqueMap = new Map<string, TradingSignal>();
  (signals || []).forEach((s) => {
    if (s && s.id) {
      uniqueMap.set(s.id, s);
    }
  });
  return Array.from(uniqueMap.values());
};

const getMostRecentFridayResetTime = (now: Date): Date => {
  const currentDay = now.getDay();
  const resetTime = new Date(now);
  
  let diff = 5 - currentDay;
  if (currentDay < 5) {
    diff -= 7;
  }
  
  resetTime.setDate(now.getDate() + diff);
  resetTime.setHours(0, 0, 0, 0); // Friday 12:00 AM (midnight)
  return resetTime;
};

const isWeekendAndNotBtc = (marketSymbol: MarketSymbol): boolean => {
  // Gold (XAUUSD) streams via real-time Spot Gold feeds (OANDA:XAUUSD / TradingView benchmark)
  return false;
};

// Initial pre-populated completed signals array to match standard mock performance precisely covering the full week
// Strictly real live signals (No mock or fake data)
const INITIAL_COMPLETED_SIGNALS: TradingSignal[] = [];

export interface ArchivedWeek {
  id: string;
  endDate: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPoints: number;
}

function areCandlesValidForMarket(candles: Candle[], market: MarketSymbol): boolean {
  if (!Array.isArray(candles) || candles.length === 0) return false;
  const samplePrice = candles[candles.length - 1]?.close;
  if (typeof samplePrice !== 'number' || isNaN(samplePrice)) return false;

  // Validate the close price range to prevent corrupted localStorage loading (e.g. BTC prices in Forex pairs)
  if (market === 'EURUSD' || market === 'GBPUSD') {
    return samplePrice < 5.0;
  }
  if (market === 'XAUUSD') {
    return samplePrice > 100.0 && samplePrice < 15000.0;
  }
  if (market === 'BTCUSD') {
    return samplePrice > 1000.0;
  }
  return true;
}

const renderAiText = (text: string) => {
  if (!text) return null;
  
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  
  return paragraphs.map((para, index) => {
    const isListItem = para.trim().startsWith('-') || para.trim().startsWith('*');
    let cleanPara = isListItem ? para.trim().substring(1).trim() : para.trim();
    
    const parts = cleanPara.split(/\*\*(.*?)\*\*/g);
    const content = parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="text-purple-400 font-extrabold">{part}</strong>;
      }
      return part;
    });

    if (isListItem) {
      return (
        <li key={index} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed mb-1.5 last:mb-0">
          <span className="text-purple-400 mt-1 select-none">•</span>
          <span className="flex-1">{content}</span>
        </li>
      );
    }

    return (
      <p key={index} className="text-xs text-slate-300 leading-relaxed mb-2.5 last:mb-0">
        {content}
      </p>
    );
  });
};

const safeStorageGet = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    return fallback;
  }
};

const safeStorageSet = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage Warning] Failed to write to localStorage for key ${key}:`, e);
  }
};

export default function App() {
  // Master states - Restricted strictly to Gold (XAUUSD) trading
  const [market, setMarket] = useState<MarketSymbol>(() => {
    safeStorageSet('mm_vip_selected_market', 'XAUUSD');
    return 'XAUUSD';
  });
  const lastLoadedMarketRef = useRef<MarketSymbol>(market);
  const [candles, setCandles] = useState<Candle[]>(() => {
    try {
      const savedMarket = (localStorage.getItem('mm_vip_selected_market') || 'XAUUSD') as MarketSymbol;
      const savedCandles = localStorage.getItem(`mm_vip_candles_${savedMarket}`);
      if (savedCandles) {
        const parsed = JSON.parse(savedCandles);
        if (areCandlesValidForMarket(parsed, savedMarket)) {
          return parsed;
        }
      }
    } catch (e) {
      // Fallback
    }
    return [];
  });
  const [zones, setZones] = useState<SMCZone[]>([]);
  const [activeSignal, setActiveSignal] = useState<TradingSignal | null>(null);
  
  const [allSignals, setAllSignals] = useState<TradingSignal[]>(() => {
    try {
      // Purge any old mock data or demo flags
      localStorage.removeItem('mm_vip_mock_initialized');
      const saved = localStorage.getItem('mm_vip_all_signals');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Strictly retain real live signals
      return deduplicateSignals(parsed.filter((s: TradingSignal) => 
        s && s.id && 
        !s.id.startsWith('sig-mock-') && 
        !s.id.includes('demo') && 
        !s.id.includes('fake') &&
        s.entry > 0 &&
        s.sl > 0
      ));
    } catch (e) {
      return [];
    }
  });

  const [archivedWeeks, setArchivedWeeks] = useState<ArchivedWeek[]>(() => {
    try {
      const saved = localStorage.getItem('mm_vip_archived_weeks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [historyDayFilter, setHistoryDayFilter] = useState<string>('ALL');
  const [historyResultFilter, setHistoryResultFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  useEffect(() => {
    safeStorageSet('mm_vip_selected_market', market);
  }, [market]);

  useEffect(() => {
    if (candles && candles.length > 0 && lastLoadedMarketRef.current === market) {
      safeStorageSet(`mm_vip_candles_${market}`, candles);
    }
  }, [candles, market]);

  useEffect(() => {
    safeStorageSet('mm_vip_all_signals', allSignals);
  }, [allSignals]);

  const lastPushedSignalsRef = useRef<string>('');

  // Fetch and sync signals from cloud on mount and pull periodically
  useEffect(() => {
    let active = true;
    const syncWithCloud = async () => {
      try {
        const response = await fetch('/api/signals');
        if (response.ok) {
          const result = await response.json();
          if (active && result.success && Array.isArray(result.signals)) {
            const statusPriority: Record<string, number> = {
              'Pending': 1,
              'Active': 2,
              'TP1': 3,
              'TP2': 3,
              'TP3': 3,
              'SL': 3,
              'Cancelled': 4,
              'Closed': 4,
            };

            setAllSignals(prev => {
              const localMap = new Map<string, TradingSignal>(
                prev.filter(s => s && s.id && !s.id.startsWith('sig-mock-')).map(s => [s.id, s])
              );
              let modified = false;
              result.signals.forEach((s: TradingSignal) => {
                if (s && s.id && !s.id.startsWith('sig-mock-')) {
                  const local = localMap.get(s.id);
                  if (!local) {
                    localMap.set(s.id, s);
                    modified = true;
                  } else {
                    const localP = statusPriority[local.status] || 1;
                    const serverP = statusPriority[s.status] || 1;

                    // Only update if server is at same or higher status progress
                    if (serverP >= localP) {
                      if (local.status !== s.status || Math.abs((local.points || 0) - (s.points || 0)) > 0.05) {
                        localMap.set(s.id, { ...local, ...s });
                        modified = true;
                      }
                    }
                  }
                }
              });
              if (modified) {
                const merged = Array.from(localMap.values());
                const sorted = merged.sort((a, b) => b.id.localeCompare(a.id));
                lastPushedSignalsRef.current = JSON.stringify(sorted);
                return sorted;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch/sync signals with cloud server:', err);
      }
    };

    syncWithCloud();
    const interval = setInterval(syncWithCloud, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Sync state changes to cloud server whenever allSignals changes
  useEffect(() => {
    const currentStr = JSON.stringify(allSignals);
    if (allSignals.length > 0 && currentStr !== lastPushedSignalsRef.current) {
      lastPushedSignalsRef.current = currentStr;
      const pushSignalsToCloud = async () => {
        try {
          await fetch('/api/signals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signals: allSignals }),
          });
        } catch (err) {
          console.warn('Failed to push signals to cloud:', err);
        }
      };
      pushSignalsToCloud();
    }
  }, [allSignals]);

  useEffect(() => {
    localStorage.setItem('mm_vip_archived_weeks', JSON.stringify(archivedWeeks));
  }, [archivedWeeks]);

  // Automatic Weekly Reset at Friday 12:00 AM (midnight)
  useEffect(() => {
    if (allSignals.length === 0) return;

    const checkAutomaticWeeklyReset = () => {
      const now = new Date();
      const mostRecentFriday = getMostRecentFridayResetTime(now);
      const mostRecentFridayKey = mostRecentFriday.getTime().toString();

      const lastResetKey = localStorage.getItem('mm_vip_last_reset_friday');

      if (!lastResetKey) {
        // If it's the first time, initialize it to the current most recent Friday key
        // to prevent an immediate unwanted reset of pre-loaded mock data.
        localStorage.setItem('mm_vip_last_reset_friday', mostRecentFridayKey);
        return;
      }

      if (lastResetKey !== mostRecentFridayKey) {
        // Find completed trades in this week's data
        const completed = allSignals.filter(
          (s) => s.status !== 'Pending' && s.status !== 'Active' && s.status !== 'Cancelled'
        );

        if (completed.length > 0) {
          // Calculate wins/losses for the week
          const localWins = completed.filter((s) => s.status.startsWith('TP') || (s.points || 0) >= 0).length;
          const localLosses = completed.filter((s) => s.status === 'SL' && (s.points || 0) < 0).length;
          const localWinRate = completed.length > 0 ? Math.round((localWins / completed.length) * 100) : 0;
          const localNetPoints = completed.reduce((sum, s) => sum + (s.points || 0), 0);

          // Archive the week
          const newArchive: ArchivedWeek = {
            id: `week-${mostRecentFriday.getTime()}`,
            endDate: mostRecentFriday.toLocaleDateString('ar-EG'),
            totalTrades: completed.length,
            wins: localWins,
            losses: localLosses,
            winRate: localWinRate,
            netPoints: localNetPoints,
          };
          
          setArchivedWeeks(prev => {
            const alreadyArchived = prev.some(a => a.id === newArchive.id);
            if (alreadyArchived) return prev;
            return [newArchive, ...prev];
          });

          // Attempt to export CSV
          try {
            handleExportCSV();
          } catch (e) {
            console.error("Auto CSV export failed:", e);
          }
        }

        // Clear completed signals
        const remainingSignals = allSignals.filter(s => s.status === 'Pending' || s.status === 'Active');
        setAllSignals(remainingSignals);
        lastPushedSignalsRef.current = JSON.stringify(remainingSignals);

        // Sync with server immediately
        fetch('/api/signals/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signals: remainingSignals }),
        }).catch((err) => console.warn('Failed to push reset signals to cloud:', err));

        // Mark this Friday as reset
        localStorage.setItem('mm_vip_last_reset_friday', mostRecentFridayKey);

        showToast("📅 تم ترحيل نتائج وأداء الأسبوع تلقائياً (يوم الجمعة الساعة 12:00 صباحاً) لبدء أسبوع تداول جديد!");
        addAlertLog("📅 [تصفير تلقائي] تم أرشفة نتائج وأداء الأسبوع الماضي وتصفير لوحة البيانات بنجاح.");
      }
    };

    checkAutomaticWeeklyReset();
  }, [allSignals]);
  
  // Real Prices / TradingView Integration states
  const [useRealPrices, setUseRealPrices] = useState<boolean>(() => {
    const saved = localStorage.getItem('mm_vip_use_real_prices');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_use_real_prices', String(useRealPrices));
  }, [useRealPrices]);

  // Price Feed Calibration / Calibration offsets
  const [priceCalibration, setPriceCalibration] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mm_vip_price_calibration');
    return saved ? JSON.parse(saved) : {
      XAUUSD: 0.0,
      EURUSD: 0.0,
      GBPUSD: 0.0,
      BTCUSD: 0.0,
    };
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_price_calibration', JSON.stringify(priceCalibration));
  }, [priceCalibration]);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(() => {
    const saved = localStorage.getItem('mm_vip_selected_timeframe');
    return saved !== null ? saved : '15m';
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_selected_timeframe', selectedTimeframe);
  }, [selectedTimeframe]);

  const [isRealPricesLoading, setIsRealPricesLoading] = useState<boolean>(false);
  const [isLiveConnectionFailed, setIsLiveConnectionFailed] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'SMART' | 'TRADINGVIEW'>('SMART');
  const [isFullScreenChart, setIsFullScreenChart] = useState<boolean>(false);
  const [isTvHudOpen, setIsTvHudOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('mm_vip_is_tv_hud_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [tvHudTab, setTvHudTab] = useState<'pending' | 'alternative'>('pending');
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);
  const [targetBrokerPriceInput, setTargetBrokerPriceInput] = useState<string>('');

  // 🤖 Automatic LIMIT Order Hanging / Placement Mode (Disabled by default for safety)
  const [autoPlaceLimitOrders, setAutoPlaceLimitOrders] = useState<boolean>(() => {
    const saved = localStorage.getItem('mm_vip_auto_place_limit');
    return saved !== null ? saved === 'true' : false;
  });

  const autoPlaceLimitOrdersRef = useRef<boolean>(autoPlaceLimitOrders);
  useEffect(() => {
    autoPlaceLimitOrdersRef.current = autoPlaceLimitOrders;
    localStorage.setItem('mm_vip_auto_place_limit', String(autoPlaceLimitOrders));
  }, [autoPlaceLimitOrders]);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreenChart(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullScreenChart = () => {
    if (!isFullScreenChart) {
      setIsFullScreenChart(true);
      const chartElem = document.getElementById('main-chart-wrapper');
      if (chartElem && chartElem.requestFullscreen) {
        chartElem.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullScreenChart(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    triggerAudioTick('info');
  };

  // Action to remove Gold cache, purge local state, and re-add Gold connected directly to TradingView Spot Gold
  const handleResetAndRelinkGoldToTradingView = async () => {
    try {
      setIsRealPricesLoading(true);
      // 1. Clear old local cache for Gold
      localStorage.removeItem('mm_vip_candles_XAUUSD');

      // 2. Set market to XAUUSD
      setMarket('XAUUSD');
      lastLoadedMarketRef.current = 'XAUUSD';

      // 3. Fetch fresh real-time Gold candles directly from TradingView / Spot Market API proxy
      const freshCandles = await fetchRealCandlesFromAPI('XAUUSD', selectedTimeframe, 90);
      if (!freshCandles || freshCandles.length === 0) {
        setIsLiveConnectionFailed(true);
        showToast("⚠️ تعذر جلب شموع الذهب الحقيقية من مزود البيانات. تم تعليق التحليل مؤقتًا لحين توفر البيانات.");
        return;
      }
      
      setCandles(freshCandles);

      const detectedZones = extractInstitutionalZones(freshCandles, 'XAUUSD');
      setZones(detectedZones);

      const lastClose = freshCandles[freshCandles.length - 1].close;
      setManualEntryPrice(lastClose);
      setCurrentPrices((prev) => ({ ...prev, XAUUSD: lastClose }));

      const starterSignal = generateSmartSignal(freshCandles, 'XAUUSD', undefined, strictSMCMode, smartAutoManage, selectedTimeframe, false, true);
      setActiveSignal(starterSignal);

      setIsLiveConnectionFailed(false);
      triggerAudioTick('success');
      const successMsg = "⚡ تم تحديث شمعات الذهب وربطها بأسعار منصة TradingView المباشرة (OANDA:XAUUSD / Spot Gold)";
      addAlertLog(successMsg);
      showToast(successMsg);
    } catch (err: any) {
      console.warn("Gold TradingView connection error:", err?.message || err);
      setIsLiveConnectionFailed(true);
      showToast("⚠️ انقطع الاتصال بمزود بيانات الذهب المباشر. تم إيقاف التحليل الحقيقي مؤقتاً.");
    } finally {
      setIsRealPricesLoading(false);
    }
  };
  const handleResetAndRelinkGoldToBinance = handleResetAndRelinkGoldToTradingView;

  useEffect(() => {
    localStorage.setItem('mm_vip_is_tv_hud_open', String(isTvHudOpen));
  }, [isTvHudOpen]);
  
  // Custom interactive visual states
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mm_vip_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    } else {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    }
  }, [theme]);

  const [isPairsDropdownOpen, setIsPairsDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mainScreenTab, setMainScreenTab] = useState<TabType>('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedSignalDetail, setSelectedSignalDetail] = useState<TradingSignal | null>(null);
  const [isAlertSettingsModalOpen, setIsAlertSettingsModalOpen] = useState<boolean>(false);
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(true);
  const [candleCount, setCandleCount] = useState<number>(90);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('mm_vip_watchlist');
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeBottomTab, setActiveBottomTab] = useState<'dashboard' | 'history' | 'performance' | 'risk' | 'settings' | null>(null);
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<'general' | 'market' | 'indicators' | 'simulation' | 'alerts' | 'cloud' | 'strategy'>('general');
  const [candleType, setCandleType] = useState<'HEIKIN ASHI' | 'STANDARD'>('STANDARD');
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(true);
  const [showSuperTrend, setShowSuperTrend] = useState(true);
  const [showSMCZones, setShowSMCZones] = useState(true);
  const [showBOS, setShowBOS] = useState(true);
  const [showTP, setShowTP] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearArchiveConfirm, setShowClearArchiveConfirm] = useState(false);

  // Gemini AI Insight States
  const [aiInsightText, setAiInsightText] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastAiAnalyzedSymbol, setLastAiAnalyzedSymbol] = useState<string>('');
  const [lastAiAnalyzedTimeframe, setLastAiAnalyzedTimeframe] = useState<string>('');
  // Fixed Institutional SMC / ICT Core Strategy Parameters (Locked & Uncompromised)
  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    atrMultiplier: 1.5,
    trailingStopPips: 25,
    riskRewardRatio: 2.0,
    smcZoneSensitivity: 'المتوازنة المتقدمة (Balanced SMC)',
    qualityFilterMinScore: 75,
  });

  const generateLocalClientSMCInsight = (m: string, tf: string, cds: Candle[], zns: any[], mtrs: any): string => {
    const trendStrength = mtrs?.trendStrength || 70;
    const lastCandle = cds && cds.length > 0 ? cds[cds.length - 1] : null;
    const firstCandle = cds && cds.length > 0 ? cds[0] : null;
    let isUp = true;
    if (lastCandle && firstCandle) {
      const lastClose = Number(lastCandle.close ?? 0);
      const firstClose = Number(firstCandle.close ?? 0);
      isUp = lastClose >= firstClose;
    }
    const trendText = isUp ? "صاعد (Bullish Structure)" : "هابط (Bearish Structure)";
    const marketNameAr = m === "XAUUSD" ? "الذهب (XAU/USD)" : m === "EURUSD" ? "اليورو مقابل الدولار (EUR/USD)" : m === "GBPUSD" ? "الجنيه الإسترليني مقابل الدولار (GBP/USD)" : m === "BTCUSD" ? "البيتكوين (BTC/USD)" : m;
    
    const zoneLevels = (zns || [])
      .filter((z: any) => z !== null && typeof z === 'object')
      .slice(0, 3)
      .map((z: any) => {
        const typeAr = z.type === "Supply" || z.type === "عرض" || z.type === "Supply Zone" ? "منطقة عرض مؤسسية" : "منطقة طلب قوية";
        return `- ${typeAr} بين ${z.priceMin || "الدعم"} و ${z.priceMax || "المقاومة"} (بقوة ${z.strength || 80}%)`;
      });

    if (zoneLevels.length === 0) {
      zoneLevels.push(isUp ? "- منطقة طلب فورية مدعومة بتدفق السيولة الذكية عند مستويات الدعم الفنية" : "- منطقة عرض مؤسسية (Order Block) تترقب تدفق سيولة البيع عند مستويات المقاومة");
    }

    return `**تحليل هيكل السوق والاتجاه**:
يُظهر تحليل أصل **${marketNameAr}** على إطار **${tf || '15m'}** هيكل سوق يتجه نحو الاتجاه الـ **${trendText}** بنسبة قوة زخم تبلغ **${trendStrength}%**. يُلاحظ تماسك في السلوك السعري وتراكم للسيولة المؤسسية بالقرب من كتل الأوامر غير المختبرة (Order Blocks).

**مستويات الاهتمام الرئيسية**:
تتركز مستويات السيولة والمناطق المؤسسية النشطة حالياً كالتالي:
${zoneLevels.join("\n")}
- منطقة توازن القيمة العادلة (FVG) تمثل حاجزاً استراتيجياً لإعادة اختبار الأسعار.

**التوصية الفنية والرؤية**:
بناءً على مفاهيم الأموال الذكية (SMC)، يُنصح بالانتظار حتى انتهاء سحب السيولة (Liquidity Sweep) واكتمال كسر الهيكل (BOS/CHOCH) لتأكيد الدخول، مع الالتزام بأمر وقف خسارة صارم أسفل منطقة الدخول.

**تنبيه المخاطر**:
مراقبة تقلبات السوق وإدارة المخاطر برأس مال لا يتجاوز 1-2% لكل صفقة أمر حاسم لضمان استدامة النمو.`;
  };

  const handleFetchAiInsight = async (force = false) => {
    // If already analyzed for this symbol/timeframe and not forced, skip
    if (!force && aiInsightText && lastAiAnalyzedSymbol === market && lastAiAnalyzedTimeframe === selectedTimeframe) {
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    const activeMetrics = getMarketMetrics(candles, market);

    try {
      const apiBase = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${apiBase}/api/gemini/insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          market,
          timeframe: selectedTimeframe,
          candles: candles.slice(-30),
          zones: zones.slice(0, 5),
          metrics: {
            trendStrength: activeMetrics?.trendStrength,
            volatility: activeMetrics?.volatility,
            riskRewardRatio: activeMetrics?.riskRewardRatio,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.text) {
          setAiInsightText(data.text);
          setLastAiAnalyzedSymbol(market);
          setLastAiAnalyzedTimeframe(selectedTimeframe);
          return;
        }
      }

      // If server response not OK or without text, fallback gracefully
      const fallback = generateLocalClientSMCInsight(market, selectedTimeframe, candles, zones, activeMetrics);
      setAiInsightText(fallback);
      setLastAiAnalyzedSymbol(market);
      setLastAiAnalyzedTimeframe(selectedTimeframe);
    } catch (_err: any) {
      // If network/fetch fails, seamlessly generate local SMC insight
      const fallback = generateLocalClientSMCInsight(market, selectedTimeframe, candles, zones, activeMetrics);
      setAiInsightText(fallback);
      setLastAiAnalyzedSymbol(market);
      setLastAiAnalyzedTimeframe(selectedTimeframe);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeBottomTab === 'dashboard' && candles.length > 0) {
      handleFetchAiInsight();
    }
  }, [activeBottomTab, market, selectedTimeframe, candles.length]);

  // Simulation controls
  const [simulationSpeed, setSimulationSpeed] = useState<'normal' | 'fast' | 'paused'>('normal');

  // Manual signal creator state
  const [creatorType, setCreatorType] = useState<'BUY LIMIT' | 'SELL LIMIT'>('SELL LIMIT');
  const [selectedQuality, setSelectedQuality] = useState<'A+' | 'B'>('A+');
  const [strictSMCMode, setStrictSMCMode] = useState<boolean>(true);
  const [smartAutoManage, setSmartAutoManage] = useState<boolean>(true);
  const [manualEntryPrice, setManualEntryPrice] = useState<number>(4202.61);
  const [manualRiskReward, setManualRiskReward] = useState<number>(2.5);

  // Prevent duplicate concurrent live fetch updates and manage auto-placement cooldown
  const isFetchingRef = useRef(false);
  const lastPendingPlacedTimeRef = useRef<number>(0);
  const smartAutoManageRef = useRef(smartAutoManage);
  smartAutoManageRef.current = smartAutoManage;
  const strictSMCModeRef = useRef(strictSMCMode);
  strictSMCModeRef.current = strictSMCMode;
  const selectedQualityRef = useRef(selectedQuality);
  selectedQualityRef.current = selectedQuality;
  const selectedTimeframeRef = useRef(selectedTimeframe);
  selectedTimeframeRef.current = selectedTimeframe;
  const marketRef = useRef(market);
  marketRef.current = market;
  const allSignalsRef = useRef(allSignals);
  allSignalsRef.current = allSignals;
  const activeSignalRef = useRef(activeSignal);
  activeSignalRef.current = activeSignal;
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  // Strict deduplication registries for alerts and signal lifecycle events
  const dispatchedSignalEventsRef = useRef<Map<string, number>>(
    (() => {
      const map = new Map<string, number>();
      try {
        const saved = localStorage.getItem('mm_vip_dispatched_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(([k, v]: [string, number]) => map.set(k, v));
          }
        }
      } catch {}
      return map;
    })()
  );

  const recordDispatchedEvent = (eventKey: string) => {
    const now = Date.now();
    dispatchedSignalEventsRef.current.set(eventKey, now);
    try {
      const entries = Array.from(dispatchedSignalEventsRef.current.entries()).slice(-500);
      localStorage.setItem('mm_vip_dispatched_events', JSON.stringify(entries));
    } catch (e) {
      console.warn('Error saving dispatched events:', e);
    }
  };

  const hasDispatchedEvent = (eventKey: string, cooldownMs = 60000): boolean => {
    const lastTime = dispatchedSignalEventsRef.current.get(eventKey);
    if (!lastTime) return false;
    return (Date.now() - lastTime) < cooldownMs;
  };

  const recentAlertDispatchesRef = useRef<Map<string, number>>(
    (() => {
      const map = new Map<string, number>();
      try {
        const saved = sessionStorage.getItem('mm_vip_recent_dispatches');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(([k, v]: [string, number]) => map.set(k, v));
          }
        }
      } catch {}
      return map;
    })()
  );

  // Persistent sets of sent signal IDs and signatures
  const sentTelegramSignalIdsRef = useRef<Set<string>>(
    (() => {
      const set = new Set<string>();
      try {
        const saved = localStorage.getItem('mm_vip_sent_signal_ids');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => set.add(id));
        }
      } catch {}
      return set;
    })()
  );

  const sentTelegramSignalSignaturesRef = useRef<Set<string>>(
    (() => {
      const set = new Set<string>();
      try {
        const saved = localStorage.getItem('mm_vip_sent_signal_sigs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) parsed.forEach((sig: string) => set.add(sig));
        }
      } catch {}
      return set;
    })()
  );

  const saveSentSignalToRegistry = (sig: TradingSignal) => {
    const digits = MARKET_BASES[sig.market]?.digits || 2;
    const signature = `${sig.market}_${sig.type}_${sig.entry.toFixed(digits)}_${sig.sl.toFixed(digits)}`;
    
    sentTelegramSignalIdsRef.current.add(sig.id);
    sentTelegramSignalSignaturesRef.current.add(signature);

    try {
      const idsArr = Array.from(sentTelegramSignalIdsRef.current).slice(-400);
      const sigsArr = Array.from(sentTelegramSignalSignaturesRef.current).slice(-400);
      localStorage.setItem('mm_vip_sent_signal_ids', JSON.stringify(idsArr));
      localStorage.setItem('mm_vip_sent_signal_sigs', JSON.stringify(sigsArr));
    } catch (e) {
      console.warn('Error saving sent signals registry:', e);
    }
  };

  const isSignalAlreadySentToBot = (sig: TradingSignal): boolean => {
    if (sig.hasAlertedPending) return true;
    if (sentTelegramSignalIdsRef.current.has(sig.id)) return true;
    const digits = MARKET_BASES[sig.market]?.digits || 2;
    const signature = `${sig.market}_${sig.type}_${sig.entry.toFixed(digits)}_${sig.sl.toFixed(digits)}`;
    if (sentTelegramSignalSignaturesRef.current.has(signature)) return true;
    return false;
  };
  
  // Alerts state
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem('mm_vip_alert_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          popup: parsed.popup !== undefined ? parsed.popup : true,
          push: parsed.push || false,
          email: parsed.email || false,
          emailAddress: parsed.emailAddress || 'lyy7446@gmail.com',
          telegram: parsed.telegram || false,
          telegramToken: parsed.telegramToken || '',
          telegramChatId: parsed.telegramChatId || '',
          whatsapp: parsed.whatsapp || false,
          whatsappGatewayType: parsed.whatsappGatewayType || 'clicktochat',
          whatsappInstanceId: parsed.whatsappInstanceId || '',
          whatsappToken: parsed.whatsappToken || '',
          whatsappNumber: parsed.whatsappNumber || '',
          derivApiToken: parsed.derivApiToken || '',
          alertOnSignal: parsed.alertOnSignal !== undefined ? parsed.alertOnSignal : true,
          alertOnPendingTrigger: parsed.alertOnPendingTrigger !== undefined ? parsed.alertOnPendingTrigger : true,
          alertOnTP: parsed.alertOnTP !== undefined ? parsed.alertOnTP : true,
          alertOnTrailing: parsed.alertOnTrailing !== undefined ? parsed.alertOnTrailing : true,
          alertOnSL: parsed.alertOnSL !== undefined ? parsed.alertOnSL : true,
        };
      } catch (e) {
        console.warn('Failed to parse saved alert settings:', e);
      }
    }
    return {
      popup: true,
      push: false,
      email: false,
      emailAddress: 'lyy7446@gmail.com',
      telegram: false,
      telegramToken: '',
      telegramChatId: '',
      whatsapp: false,
      whatsappGatewayType: 'clicktochat',
      whatsappInstanceId: '',
      whatsappToken: '',
      whatsappNumber: '',
      derivApiToken: '',
      alertOnSignal: true,
      alertOnPendingTrigger: true,
      alertOnTP: true,
      alertOnTrailing: true,
      alertOnSL: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_alert_settings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  const [alertLogs, setAlertLogs] = useState<string[]>([]);

  // Sub-modals toggles
  const [isSMCHelperOpen, setIsSMCHelperOpen] = useState(false);

  // Throttled sound and alert refs
  const lastAlertLogRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const lastAudioTickRef = useRef<{ type: string; time: number }>({ type: '', time: 0 });

  // Sound generator (with deduplication throttling)
  const triggerAudioTick = (type: 'success' | 'fail' | 'info') => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (lastAudioTickRef.current.type === type && (now - lastAudioTickRef.current.time) < 2500) {
      return;
    }
    lastAudioTickRef.current = { type, time: now };

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'fail') {
        osc.frequency.setValueAtTime(220.00, audioCtx.currentTime); // A3
        osc.frequency.setValueAtTime(146.83, audioCtx.currentTime + 0.1); // D3
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        // info beep
        osc.frequency.setValueAtTime(440.00, audioCtx.currentTime); // A4
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      // Ignored if blocked by gesture
    }
  };

  // Populate dynamic prices index mapping
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mm_vip_current_prices');
    return saved ? JSON.parse(saved) : {
      XAUUSD: 4631.50,
      EURUSD: 1.1678,
      GBPUSD: 1.3628,
      BTCUSD: 77400.0,
    };
  });

  useEffect(() => {
    localStorage.setItem('mm_vip_current_prices', JSON.stringify(currentPrices));
  }, [currentPrices]);

  // Calculate session parameters
  const { currentSessions, detailSessions } = getActiveSessions();

  // Triggered on market load or pair change and useRealPrices value toggle
  useEffect(() => {
    let active = true;

    const loadMarketCandles = async () => {
      if (useRealPrices) {
        setIsRealPricesLoading(true);
        try {
          const liveCandles = await fetchRealCandlesFromAPI(market, selectedTimeframe, 85);
          if (!active) return;
          if (!liveCandles || liveCandles.length === 0) {
            setIsLiveConnectionFailed(true);
            addAlertLog(`⚠️ انقطع الاتصال بمزود بيانات زوج (${market}). تم إيقاف إصدار الإشارات مؤقتًا.`);
            return;
          }

          setCandles(liveCandles);
          lastLoadedMarketRef.current = market;

          // Render underlying zones
          const detectedZones = extractInstitutionalZones(liveCandles, market);
          setZones(detectedZones);

          const lastClose = liveCandles[liveCandles.length - 1]?.close ?? MARKET_BASES[market].base;
          setManualEntryPrice(lastClose);

          // Update current price index
          setCurrentPrices((prev) => ({
            ...prev,
            [market]: lastClose,
          }));

          // Generate reference smart signal from technical indicators on real candles
          const starterSignal = generateSmartSignal(liveCandles, market, undefined, strictSMCMode, smartAutoManage, selectedTimeframe);
          setActiveSignal(starterSignal);
          setAllSignals((prev) => {
            const hasExisting = prev.some(s => s && s.market === market && (s.status === 'Pending' || s.status === 'Active'));
            if (!hasExisting && starterSignal.qualityScore > 0) {
              return [starterSignal, ...prev];
            }
            return prev;
          });

          setIsLiveConnectionFailed(false);
          addAlertLog(`📈 تم جلب الأسعار وحركات الشموع الحية لزوج (${market}) بنجاح.`);
        } catch (err) {
          console.error("Real price load failed, connection offline:", err);
          if (!active) return;
          
          // Mark live connection as failed without overwriting prices or generating artificial signals
          setIsLiveConnectionFailed(true);
          addAlertLog(`⚠️ انقطع الاتصال بالخادم لزوج (${market}). في انتظار إعادة الاتصال...`);
        } finally {
          if (active) {
            setIsRealPricesLoading(false);
          }
        }
        // Offline mode: do not create false trading signals from synthetic candles
        setCandles([]);
        setIsLiveConnectionFailed(true);
        setActiveSignal(null);
        addAlertLog(`⚠️ المنصة في وضع البيانات الحقيقية الصارمة. في انتظار اتصال مزود السوق لزوج (${market}).`);
      }
    };

    loadMarketCandles();

    return () => {
      active = false;
    };
  }, [market, useRealPrices, selectedTimeframe, priceCalibration]);

  // Alert logger utility (with duplicate throttling)
  const addAlertLog = (text: string) => {
    const now = Date.now();
    if (lastAlertLogRef.current.text === text && (now - lastAlertLogRef.current.time) < 6000) {
      return;
    }
    lastAlertLogRef.current = { text, time: now };
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAlertLogs((prev) => [`[${timeStr}] ${text}`, ...prev.slice(0, 49)]);
  };

  // Dispatch alert notifications directly via robust server proxy & direct fallback (with strict deduplication)
  const dispatchAlert = async (plainMessage: string, htmlMessage?: string) => {
    // 0. Strict deduplication check on message content
    const normalizedKey = plainMessage
      .replace(/\[\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|ص|م)?\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    const now = Date.now();
    const lastSentTime = recentAlertDispatchesRef.current.get(normalizedKey);
    
    // Suppress exact identical alert sent within 45 seconds
    if (lastSentTime && (now - lastSentTime) < 45000) {
      return;
    }
    recentAlertDispatchesRef.current.set(normalizedKey, now);

    try {
      const entries = Array.from(recentAlertDispatchesRef.current.entries()).slice(-200);
      sessionStorage.setItem('mm_vip_recent_dispatches', JSON.stringify(entries));
    } catch {}

    // Prune old deduplication entries to avoid memory growth
    if (recentAlertDispatchesRef.current.size > 200) {
      for (const [k, timestamp] of recentAlertDispatchesRef.current.entries()) {
        if (now - timestamp > 120000) {
          recentAlertDispatchesRef.current.delete(k);
        }
      }
    }

    // 1. Send to Telegram
    if (alertSettings.telegram && alertSettings.telegramToken && alertSettings.telegramChatId) {
      const messageBody = htmlMessage || `🔔 <b>AI MM VIP Alert:</b>\n${plainMessage}`;
      const apiBase = getApiBaseUrl();

      try {
        // Try server-side proxy first (bypasses browser CORS & restrictions)
        const proxyRes = await fetch(`${apiBase}/api/telegram/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: alertSettings.telegramToken,
            chatId: alertSettings.telegramChatId,
            text: messageBody,
            parseMode: 'HTML',
          }),
          signal: AbortSignal.timeout(15000),
        }).catch(() => null);

        if (!proxyRes || !proxyRes.ok) {
          // Fallback to direct client call if server proxy was unreachable
          const directUrl = `https://api.telegram.org/bot${alertSettings.telegramToken}/sendMessage`;
          fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: alertSettings.telegramChatId,
              text: messageBody,
              parse_mode: 'HTML',
            }),
            signal: AbortSignal.timeout(15000),
          }).catch((err) => {
            console.warn('Telegram direct notification notice:', err?.message || err);
          });
        }
      } catch (err: any) {
        console.warn('Telegram dispatch notice:', err?.message || err);
      }
    }

    // 2. Send to WhatsApp automated APIs (UltraMsg, Green-API, Twilio)
    if (alertSettings.whatsapp && alertSettings.whatsappGatewayType !== 'clicktochat') {
      const { whatsappGatewayType, whatsappInstanceId, whatsappToken, whatsappNumber } = alertSettings;
      if (whatsappInstanceId && whatsappToken && whatsappNumber) {
        const apiBase = getApiBaseUrl();
        fetch(`${apiBase}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gatewayType: whatsappGatewayType,
            instanceId: whatsappInstanceId,
            token: whatsappToken,
            number: whatsappNumber,
            message: plainMessage,
          }),
        }).catch((err) => console.warn('WhatsApp dispatch notice:', err?.message || err));
      }
    }
  };

  // 1. Formatter for New Pending Order Signal (إرسال أمر معلق جديد - مرة واحدة فقط لكل توصية)
  const dispatchPendingSignal = (sig: TradingSignal) => {
    if (alertSettings.alertOnSignal === false) return;
    
    // Strict requirement: Every recommendation must be sent ONCE AND ONLY ONCE to the bot
    if (isSignalAlreadySentToBot(sig)) {
      return;
    }

    // Save to persistent registry so it will never be resent
    saveSentSignalToRegistry(sig);
    sig.hasAlertedPending = true;

    const eventKey = `${sig.id}_PENDING`;
    recordDispatchedEvent(eventKey);

    const { plainText, htmlText } = formatPendingSignalTelegram(sig);
    dispatchAlert(plainText, htmlText);
  };

  // 2. Formatter for Order Execution / Activation Trigger (إشعار تفعيل الأمر ودخول السوق)
  const dispatchOrderActivated = (sig: TradingSignal) => {
    if (alertSettings.alertOnPendingTrigger === false) return;
    const eventKey = `${sig.id}_ACTIVATED`;
    if (hasDispatchedEvent(eventKey, 86400000) || sig.hasAlertedActivated) return;
    recordDispatchedEvent(eventKey);
    sig.hasAlertedActivated = true;

    const { plainText, htmlText } = formatOrderActivatedTelegram(sig);
    dispatchAlert(plainText, htmlText);
  };

  // 3. Formatter for Take Profit Hits (إشعارات تحقيق الأهداف)
  const dispatchTPReached = (sig: TradingSignal, target: 'TP1' | 'TP2' | 'TP3' | 'TP4', points: number) => {
    if (alertSettings.alertOnTP === false) return;
    const eventKey = `${sig.id}_${target}`;
    if (hasDispatchedEvent(eventKey, 86400000)) return;
    if (target === 'TP1' && sig.hasAlertedTP1) return;
    if (target === 'TP2' && sig.hasAlertedTP2) return;
    if (target === 'TP3' && sig.hasAlertedTP3) return;
    if (target === 'TP4' && sig.hasAlertedTP4) return;

    recordDispatchedEvent(eventKey);
    if (target === 'TP1') sig.hasAlertedTP1 = true;
    if (target === 'TP2') sig.hasAlertedTP2 = true;
    if (target === 'TP3') sig.hasAlertedTP3 = true;
    if (target === 'TP4') sig.hasAlertedTP4 = true;

    const { plainText, htmlText } = formatTPReachedTelegram(sig, target, points);
    dispatchAlert(plainText, htmlText);
  };

  // 4. Formatter for Trailing Stop and Breakeven (إشعار تأمين الدخول والوقف المتحرك)
  const dispatchTrailingAlert = (sig: TradingSignal, trailAlertText: string) => {
    if (alertSettings.alertOnTrailing === false) return;
    const lockStep = sig.lastLockPips || Math.floor((sig.points || 0) / 20);
    const eventKey = `${sig.id}_TRAILING_STEP_${lockStep}`;
    if (hasDispatchedEvent(eventKey, 60000)) return;
    recordDispatchedEvent(eventKey);

    const { plainText, htmlText } = formatTrailingAlertTelegram(sig, trailAlertText);
    dispatchAlert(plainText, htmlText);
  };

  // 5. Formatter for Stop Loss Hits (إشعار ضرب الوقف أو الخروج المحمي)
  const dispatchSLHit = (sig: TradingSignal, points: number, isSecured: boolean) => {
    if (alertSettings.alertOnSL === false) return;
    const eventKey = `${sig.id}_SL`;
    if (hasDispatchedEvent(eventKey, 86400000) || sig.hasAlertedSL) return;
    recordDispatchedEvent(eventKey);
    sig.hasAlertedSL = true;

    const { plainText, htmlText } = formatSLHitTelegram(sig, points, isSecured);
    dispatchAlert(plainText, htmlText);
  };

  // 6. Formatter for Manual Market Close (إشعار إغلاق يدوي)
  const dispatchManualCloseAlert = (sig: TradingSignal, closePrice: number, points: number) => {
    const eventKey = `${sig.id}_MANUAL_CLOSE`;
    if (hasDispatchedEvent(eventKey, 86400000)) return;
    recordDispatchedEvent(eventKey);

    const { plainText, htmlText } = formatManualCloseTelegram(sig, closePrice, points);
    dispatchAlert(plainText, htmlText);
  };

  // 7. Formatter for Order Cancellation (إشعار إلغاء أمر معلق)
  const dispatchCancelAlert = (sig: TradingSignal, reason?: string) => {
    const eventKey = `${sig.id}_CANCEL`;
    if (hasDispatchedEvent(eventKey, 86400000) || sig.hasAlertedCancelled) return;
    recordDispatchedEvent(eventKey);
    sig.hasAlertedCancelled = true;

    const { plainText, htmlText } = formatCancelAlertTelegram(sig, reason);
    dispatchAlert(plainText, htmlText);
  };

  // Formatter for institutional signals backward compatibility
  const formatSignalMessage = (sig: TradingSignal) => {
    const digits = MARKET_BASES[sig.market]?.digits || 2;
    return `🔔 *إشارة تداول ذكية جديدة (SMC Institutional)* 🚀\n\n` +
           `📈 *الأصل:* ${sig.market}\n` +
           `⚡ *النوع:* ${sig.type}\n` +
           `⭐ *الجودة:* ${sig.quality || 'A'} (${sig.qualityScore || 90}%)\n` +
           `💵 *سعر الدخول:* ${sig.entry.toFixed(digits)}\n` +
           `🛑 *وقف الخسارة (SL):* ${sig.sl.toFixed(digits)}\n\n` +
           `🎯 *الأهداف المستهدفة (Take Profit):*\n` +
           `🔹 الهدف الأول (TP1): ${sig.tp1.toFixed(digits)}\n` +
           `🔹 الهدف الثاني (TP2): ${sig.tp2.toFixed(digits)}\n` +
           `🔹 الهدف الثالث (TP3): ${sig.tp3.toFixed(digits)}\n\n` +
           `🛡️ *إدارة المخاطر:* مؤمن تلقائياً عبر نظام تتبع الأهداف وتأمين الدخول (Breakeven) من لوحة تحكم MM VIP.`;
  };

  // Dedicated one-time activation trigger handler with multi-level deduplication
  const triggerActivationAlertOnce = (sig: TradingSignal, digits: number) => {
    const eventKey = `${sig.id}_ACTIVATED`;
    const priceKey = `ACT_${sig.market}_${sig.type}_${Math.round(sig.entry * 100)}`;
    
    if (hasDispatchedEvent(eventKey, 86400000) || hasDispatchedEvent(priceKey, 120000) || sig.hasAlertedActivated) {
      return false;
    }

    recordDispatchedEvent(eventKey);
    recordDispatchedEvent(priceKey);
    sig.hasAlertedActivated = true;

    const alertMsg = `🚨 وصل السعر لمستوى الدخول (${sig.entry.toFixed(digits)}) وتم تفعيل الصفقة المعلقة لزوج ${sig.market} [${sig.type}]! 🔵`;
    showToast(alertMsg);
    addAlertLog(alertMsg);
    dispatchOrderActivated(sig);
    triggerAudioTick('success');
    return true;
  };

  // Toast notifications manager (disabled floating top notification per user request)
  const showToast = (_message: string) => {
    // Disabled floating top overlay
  };

  // Stream Tick Updates - handles real tradingview rate streaming vs offline simulated ticks
  useEffect(() => {
    if (simulationSpeed === 'paused') return;
    if (lastLoadedMarketRef.current !== market) return;

    if (useRealPrices) {
      // Real Prices live polling interval
      const fetchTickUpdates = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
          const liveCandles = await fetchRealCandlesFromAPI(market, selectedTimeframeRef.current, 85);
          if (!liveCandles || liveCandles.length === 0) {
            setIsLiveConnectionFailed(true);
            return;
          }

          setCandles(liveCandles);
          setIsLiveConnectionFailed(false);
          const lastCandle = liveCandles[liveCandles.length - 1];
          if (!lastCandle) return;
          const latestPrice = lastCandle.close;

          setCurrentPrices((prev) => ({
            ...prev,
            [market]: latestPrice,
          }));

          // Live institutional zones update
          try {
            const detectedZones = extractInstitutionalZones(liveCandles, market);
            setZones(detectedZones);
          } catch (err) {
            // Non-critical zone extraction fallback
          }

          setAllSignals((prevSignals) => {
            let changed = false;
            let updated = prevSignals.map((signal) => {
              if (signal.market !== market || (signal.status !== 'Pending' && signal.status !== 'Active')) {
                return signal;
              }

              const direction = signal.type.startsWith('BUY') ? 1 : -1;
              const meta = MARKET_BASES[market];
              const factorMultiplier = market === 'XAUUSD' ? 10.0 : 10000.0;

              // 1. Pending trigger check strictly when live price reaches or crosses entry level
              if (signal.status === 'Pending') {
                const isBuy = signal.type.includes('BUY');
                const isSell = signal.type.includes('SELL');
                const isStop = signal.type.includes('STOP');
                
                let isTriggered = false;
                if (isBuy) {
                  if (isStop) {
                    // BUY STOP: Triggers when price breaks up to or above entry
                    isTriggered = latestPrice >= signal.entry;
                  } else {
                    // BUY LIMIT: Triggers ONLY when price pulls back down to or below entry
                    isTriggered = latestPrice <= signal.entry;
                  }
                } else if (isSell) {
                  if (isStop) {
                    // SELL STOP: Triggers when price breaks down to or below entry
                    isTriggered = latestPrice <= signal.entry;
                  } else {
                    // SELL LIMIT: Triggers ONLY when price rallies up to or above entry
                    isTriggered = latestPrice >= signal.entry;
                  }
                }

                if (isTriggered) {
                  changed = true;
                  triggerActivationAlertOnce(signal, meta.digits);
                  const activated = { ...signal, status: 'Active' as const, points: 0, hasAlertedActivated: true };
                  if (activeSignalRef.current && activeSignalRef.current.id === signal.id) {
                    setActiveSignal(activated);
                  }
                  return activated;
                }

                // Check if price moved away and reached targets without hitting entry (missed entry), or broke SL
                const missedAndReachedTP = direction === 1 
                  ? (latestPrice >= signal.tp1 && signal.tp1 > signal.entry)
                  : (latestPrice <= signal.tp1 && signal.tp1 < signal.entry);

                const isInvalidated = direction === 1 
                  ? (latestPrice <= signal.sl - (lastCandle.atr || meta.step) * 0.2)
                  : (latestPrice >= signal.sl + (lastCandle.atr || meta.step) * 0.2);

                if (missedAndReachedTP || isInvalidated) {
                  changed = true;
                  const reason = missedAndReachedTP ? 'وصول السعر للهدف مباشرة قبل ملامسة نقطة الدخول' : 'تجاوز السعر لمنطقة الأمان';
                  const cancelMsg = `⚠️ [إلغاء آلي] تم إلغاء التوصية المعلقة لزوج ${market} [${signal.type}] بسبب ${reason}. جاري البحث فوراً عن نقطة دخول جديدة...`;
                  showToast(cancelMsg);
                  addAlertLog(cancelMsg);
                  lastPendingPlacedTimeRef.current = 0; // Trigger instant search for next entry
                  return { ...signal, status: 'Cancelled' as const };
                }
              }

              // 2. Active order check
              if (signal.status === 'Active') {
                const currentDiff = (latestPrice - signal.entry) * direction;
                const currentPoints = parseFloat((currentDiff * factorMultiplier).toFixed(2));

                // Apply trailing stop and profit locking every 20 pips
                const { updatedSignal: trailedSignal, triggeredAlert: trailAlert } = applyTrailingStopAndProfitLock(signal, latestPrice, market);
                const currentSl = trailedSignal.sl;
                if (trailAlert) {
                  changed = true;
                  showToast(trailAlert);
                  addAlertLog(trailAlert);
                  dispatchTrailingAlert(trailedSignal, trailAlert);
                  triggerAudioTick('info');
                }

                // If points, SL, or peak price changed, mark changed as true to persist in state
                if (
                  currentPoints !== signal.points ||
                  trailedSignal.sl !== signal.sl ||
                  trailedSignal.maxReachedPrice !== signal.maxReachedPrice ||
                  trailedSignal.lastLockPips !== signal.lastLockPips
                ) {
                  changed = true;
                }

                // Simultaneous TP & SL check within the current candle range (Candle High/Low ambivalence)
                const candleLow = lastCandle.low;
                const candleHigh = lastCandle.high;
                const isSlInCandle = direction === 1 ? candleLow <= currentSl : candleHigh >= currentSl;
                const isTpInCandle = direction === 1 ? candleHigh >= signal.tp1 : candleLow <= signal.tp1;

                if (isSlInCandle && isTpInCandle) {
                  changed = true;
                  const ambiguousMsg = `⚖️ [إشارة غير محسومة - AMBIGUOUS] تحرك السعر داخل الشمعة ووصل للهدف والاستوب معاً لصفقة ${market}. تم تسجيلها غير محسومة لحماية دقة الإحصائيات.`;
                  showToast(ambiguousMsg);
                  addAlertLog(ambiguousMsg);
                  lastPendingPlacedTimeRef.current = 0;
                  return {
                    ...signal,
                    status: 'AMBIGUOUS' as const,
                    points: 0,
                    closePrice: latestPrice,
                    resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    resolvedAtTimestamp: Date.now()
                  };
                }

                // Sl check
                const isHitSL = direction === 1 ? latestPrice <= currentSl : latestPrice >= currentSl;
                if (isHitSL) {
                  changed = true;
                  const finalLossPoints = parseFloat(((currentSl - signal.entry) * direction * factorMultiplier).toFixed(2));
                  let alertMsg = '';
                  let audioType: 'success' | 'fail' | 'info' = 'fail';
                  const isSecured = Boolean(signal.partialProfitsBooked && signal.partialProfitsBooked > 0);
                  
                  if (isSecured) {
                    alertMsg = `🛡️ ضرب وقف الخسارة المحمي لصفقة ${market} (+${finalLossPoints} نقطة) - تم إغلاق الصفقة على تأمين أرباح! جاري البحث عن فرصة جديدة...`;
                    audioType = finalLossPoints >= 0 ? 'success' : 'info';
                  } else {
                    alertMsg = `🛑 ضرب وقف الخسارة الحقيقي (SL) لصفقة ${market} (${finalLossPoints} نقطة). جاري البحث عن فرصة تعويضية جديدة...`;
                    audioType = 'fail';
                  }
                  
                  showToast(alertMsg);
                  addAlertLog(alertMsg);
                  dispatchSLHit(signal, finalLossPoints, isSecured);
                  triggerAudioTick(audioType);
                  lastPendingPlacedTimeRef.current = 0; // Trigger instant search for next entry
                  return { 
                    ...signal, 
                    status: 'SL' as const, 
                    points: finalLossPoints, 
                    closePrice: currentSl,
                    resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    resolvedAtTimestamp: Date.now()
                  };
                }

                // TP3 check (if reached before TP2 or on large expansion)
                const isHitTP3 = direction === 1 ? (latestPrice >= signal.tp3 && signal.tp3 > signal.entry) : (latestPrice <= signal.tp3 && signal.tp3 < signal.entry);
                if (isHitTP3) {
                  changed = true;
                  const finalProfitPoints = parseFloat(((signal.tp3 - signal.entry) * direction * factorMultiplier).toFixed(2));
                  const alertMsg = `🎯 ضرب الهدف الثالث (TP3) لصفقة ${market} (+${finalProfitPoints} نقطة) - تم إغلاق الصفقة بالكامل بنجاح باهر! جاري البحث عن فرصة جديدة...`;
                  showToast(alertMsg);
                  addAlertLog(alertMsg);
                  dispatchTPReached(signal, 'TP3', finalProfitPoints);
                  triggerAudioTick('success');
                  lastPendingPlacedTimeRef.current = 0; // Trigger instant search for next entry
                  return { 
                    ...signal, 
                    status: 'TP3' as const, 
                    points: finalProfitPoints, 
                    closePrice: signal.tp3,
                    resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    resolvedAtTimestamp: Date.now()
                  };
                }

                // TP2 check - Automatically closes position and searches for next setup upon hitting Target 2
                const isHitTP2 = direction === 1 ? (latestPrice >= signal.tp2 && signal.tp2 > signal.entry) : (latestPrice <= signal.tp2 && signal.tp2 < signal.entry);
                if (isHitTP2) {
                  changed = true;
                  const finalProfitPoints = parseFloat(((signal.tp2 - signal.entry) * direction * factorMultiplier).toFixed(2));
                  const alertMsg = `🎯 ضرب الهدف الثاني (TP2) لصفقة ${market} (+${finalProfitPoints} نقطة) - تم إغلاق الصفقة بنجاح وتحقيق أهدافها بالكامل! جاري مسح الشارت والبحث عن نقطة دخول جديدة...`;
                  showToast(alertMsg);
                  addAlertLog(alertMsg);
                  dispatchTPReached(signal, 'TP2', finalProfitPoints);
                  triggerAudioTick('success');
                  lastPendingPlacedTimeRef.current = 0; // Trigger instant search for next entry
                  return { 
                    ...signal, 
                    status: 'TP2' as const, 
                    points: finalProfitPoints, 
                    closePrice: signal.tp2,
                    resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    resolvedAtTimestamp: Date.now()
                  };
                }

                // TP1 check
                const isHitTP1 = direction === 1 ? (latestPrice >= signal.tp1 && signal.tp1 > signal.entry) : (latestPrice <= signal.tp1 && signal.tp1 < signal.entry);
                if (isHitTP1 && !signal.partialProfitsBooked) {
                  changed = true;
                  const finalProfitPoints = parseFloat(((signal.tp1 - signal.entry) * direction * factorMultiplier).toFixed(2));
                  const alertMsg = `🎯 ضرب الهدف الأول (TP1) لصفقة ${market} (+${finalProfitPoints} نقطة) - تم تأمين الأرباح ونقل الاستوب لنقطة الدخول والهدف القادم TP2!`;
                  showToast(alertMsg);
                  addAlertLog(alertMsg);
                  dispatchTPReached(signal, 'TP1', finalProfitPoints);
                  triggerAudioTick('success');
                  
                  // Move SL to Entry + 5 pips (Breakeven)
                  const entrySl = signal.entry + (5 / factorMultiplier) * direction;
                  const isSlBetter = direction === 1 ? entrySl > signal.sl : entrySl < signal.sl;
                  const finalSl = isSlBetter ? entrySl : signal.sl;
                  
                  return { 
                    ...trailedSignal, 
                    partialProfitsBooked: 50,
                    sl: finalSl,
                    hasMovedToBreakeven: true,
                    points: currentPoints
                  };
                }

                return { 
                  ...trailedSignal, 
                  points: currentPoints, 
                  sl: currentSl 
                };
              }

              return signal;
            });

            // ════════ SYNCHRONIZE ACTIVE ORDER & RECOMMENDATION STAGE ════════
            const openTradeForMarket = updated.find(
              (s) => s.market === market && (s.status === 'Pending' || s.status === 'Active')
            );

            if (!openTradeForMarket) {
              const now = Date.now();
              const shouldGenerateNew = (!activeSignalRef.current || (activeSignalRef.current.status !== 'Pending' && activeSignalRef.current.status !== 'Active') || (now - lastPendingPlacedTimeRef.current > 30000)) && liveCandles && liveCandles.length >= 5;
              if (shouldGenerateNew) {
                lastPendingPlacedTimeRef.current = now;
                const freshSignal = generateSmartSignal(
                  liveCandles,
                  market,
                  undefined,
                  strictSMCModeRef.current,
                  smartAutoManageRef.current,
                  selectedTimeframeRef.current,
                  false,
                  true
                );
                
                if (freshSignal && freshSignal.qualityScore > 0) {
                  freshSignal.quality = selectedQualityRef.current;

                  // 🤖 Auto-Hang LIMIT Order Mode: If enabled, automatically commit newly formed setup to Pending list
                  if (autoPlaceLimitOrdersRef.current && !isWeekendAndNotBtc(market)) {
                  const autoOrder: TradingSignal = {
                    ...freshSignal,
                    timeframe: freshSignal.timeframe || selectedTimeframeRef.current,
                    quality: selectedQualityRef.current,
                    status: 'Pending',
                    isSmartManaged: smartAutoManageRef.current,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    day: new Date().toLocaleDateString('ar-EG', { weekday: 'long' }),
                    id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                  };
                  updated.unshift(autoOrder);
                  changed = true;
                  setActiveSignal(autoOrder);
                  const meta = MARKET_BASES[market] || { digits: 2 };
                  const msg = `🤖 [تعليق LIMIT تلقائي] تم رصد منطقة ارتداد ذهبية وتعليق أمر ${autoOrder.type} (${autoOrder.quality}) تلقائياً عند ${autoOrder.entry.toFixed(meta.digits)}!`;
                  showToast(msg);
                  addAlertLog(msg);
                  triggerAudioTick('success');
                  dispatchPendingSignal(autoOrder);
                } else {
                  setActiveSignal(freshSignal);
                }
              }
            }
            } else {
              // Maintain chart and HUD synchronization with the real placed active or pending trade
              if (!activeSignalRef.current || activeSignalRef.current.id !== openTradeForMarket.id || activeSignalRef.current.points !== openTradeForMarket.points || activeSignalRef.current.status !== openTradeForMarket.status) {
                setActiveSignal(openTradeForMarket);
              }
            }

            return changed ? updated : prevSignals;
          });

        } catch (e) {
          console.warn("Failed to fetch tick updates in active poll (this is normal during server restarts):", e);
          setIsLiveConnectionFailed(true);
          addAlertLog(`⚠️ إشارة البث المباشر ضعيفة لزوج (${market}). جاري إعادة الاتصال تلقائيًا...`);
        } finally {
          isFetchingRef.current = false;
        }
      };

      // Periodic Live Ticker every 2 seconds for active responsive price updates
      const timer = setInterval(fetchTickUpdates, 2000);
      return () => clearInterval(timer);
    } else {
      // Local highly customizable simulation ticks standard loop
      const intervalMs = simulationSpeed === 'fast' ? 400 : 1500;

      const timer = setInterval(() => {
        const currentCandles = candlesRef.current;
        if (currentCandles.length === 0) return;
        if (lastLoadedMarketRef.current !== market) return;

        const signals = allSignalsRef.current;
        // Strictly track only real placed trades (pending or active) in the simulation engine
        const activeList = signals.filter(
          (s) => s.market === market && (s.status === 'Pending' || s.status === 'Active')
        );

        const { updatedCandles, updatedSignals, triggeredAlert, lifecycleEvent } = applyLiveTick(
          currentCandles,
          activeList,
          market
        );

        setCandles(updatedCandles);
        const latestPrice = updatedCandles[updatedCandles.length - 1].close;

        setCurrentPrices((prev) => ({
          ...prev,
          [market]: latestPrice,
        }));

        setAllSignals((prevSignals) => {
          const updatedMap = new Map(updatedSignals.map((s) => [s.id, s]));
          
          let merged = prevSignals.map((s) => {
            if (updatedMap.has(s.id)) {
              return updatedMap.get(s.id)!;
            }
            return s;
          });

          // Synchronize HUD and Stage with any placed trade or update stage recommendation
          const openTradeInSim = merged.find((s) => s.market === market && (s.status === 'Pending' || s.status === 'Active'));
          if (!openTradeInSim) {
            const now = Date.now();
            const shouldGenerateNew = !activeSignalRef.current || (activeSignalRef.current.status !== 'Pending' && activeSignalRef.current.status !== 'Active') || (now - lastPendingPlacedTimeRef.current > 30000);
            if (shouldGenerateNew) {
              lastPendingPlacedTimeRef.current = now;
              const freshSignal = generateSmartSignal(
                updatedCandles,
                market,
                undefined,
                strictSMCModeRef.current,
                smartAutoManageRef.current,
                selectedTimeframeRef.current,
                false,
                true
              );
              freshSignal.quality = selectedQualityRef.current;

              // 🤖 Auto-Hang LIMIT Order Mode in Simulation
              if (autoPlaceLimitOrdersRef.current && !isWeekendAndNotBtc(market)) {
                const autoOrder: TradingSignal = {
                  ...freshSignal,
                  timeframe: freshSignal.timeframe || selectedTimeframeRef.current,
                  quality: selectedQualityRef.current,
                  status: 'Pending',
                  isSmartManaged: smartAutoManageRef.current,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  day: new Date().toLocaleDateString('ar-EG', { weekday: 'long' }),
                  id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                };
                merged = [autoOrder, ...merged];
                setActiveSignal(autoOrder);
                const meta = MARKET_BASES[market] || { digits: 2 };
                const msg = `🤖 [تعليق LIMIT تلقائي] تم رصد منطقة ارتداد مؤسسية وتعليق أمر ${autoOrder.type} (${autoOrder.quality}) تلقائياً عند ${autoOrder.entry.toFixed(meta.digits)}!`;
                showToast(msg);
                addAlertLog(msg);
                triggerAudioTick('success');
                dispatchPendingSignal(autoOrder);
              } else {
                setActiveSignal(freshSignal);
              }
            }
          } else if (openTradeInSim) {
            if (!activeSignalRef.current || activeSignalRef.current.id !== openTradeInSim.id || activeSignalRef.current.points !== openTradeInSim.points || activeSignalRef.current.status !== openTradeInSim.status) {
              setActiveSignal(openTradeInSim);
            }
          }

          return merged;
        });

        if (lifecycleEvent) {
          if (lifecycleEvent.type === 'ACTIVATED') {
            triggerActivationAlertOnce(lifecycleEvent.signal, MARKET_BASES[market].digits);
          } else if (lifecycleEvent.type === 'TP1') {
            dispatchTPReached(lifecycleEvent.signal, 'TP1', lifecycleEvent.points || 0);
          } else if (lifecycleEvent.type === 'TP2') {
            dispatchTPReached(lifecycleEvent.signal, 'TP2', lifecycleEvent.points || 0);
          } else if (lifecycleEvent.type === 'TP3') {
            dispatchTPReached(lifecycleEvent.signal, 'TP3', lifecycleEvent.points || 0);
          } else if (lifecycleEvent.type === 'SL') {
            dispatchSLHit(lifecycleEvent.signal, lifecycleEvent.points || 0, lifecycleEvent.isSecured || false);
          } else if (lifecycleEvent.type === 'TRAILING') {
            dispatchTrailingAlert(lifecycleEvent.signal, lifecycleEvent.text || '');
          }
        }

        if (triggeredAlert) {
          const isActivationAlert = triggeredAlert.includes('تفعيل الصفقة') || triggeredAlert.includes('وصل السعر لمستوى الدخول') || triggeredAlert.includes('ACTIVE');

          if (!isActivationAlert) {
            addAlertLog(triggeredAlert);
            showToast(triggeredAlert);

            if (triggeredAlert.includes('TAKE PROFIT') || triggeredAlert.includes('filled')) {
              triggerAudioTick('success');
            } else if (triggeredAlert.includes('STOP LOSS')) {
              triggerAudioTick('fail');
            } else {
              triggerAudioTick('info');
            }

            if (!lifecycleEvent) {
              dispatchAlert(triggeredAlert);
            }
          }
        }
      }, intervalMs);

      return () => clearInterval(timer);
    }
  }, [simulationSpeed, useRealPrices, market]);

  // Compute stats metrics
  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
  const trendEngineCondition = lastCandle ? getSmartTrendCondition(lastCandle) : 'Sideways';
  const mtfScanner = getMtfScannerResults(market);
  const metrics = getMarketMetrics(candles, market);

  // Auto TP/SL generator based on risk/multiplier & current ATR for Scalping LIMIT
  const handleAutoGenerateCalculatedSignal = () => {
    if (!candles || candles.length === 0) return;
    if (isWeekendAndNotBtc(market)) {
      showToast("❌ أسواق الذهب والعملات مغلقة في عطلة نهاية الأسبوع (السبت والأحد). التداول متاح فقط على البيتكوين (BTCUSD)!");
      addAlertLog("⚠️ [عطلة نهاية الأسبوع] تم حظر إعادة الاحتساب لـ " + market + ". التداول متاح فقط على البيتكوين (BTCUSD) يومي السبت والأحد.");
      triggerAudioTick('fail');
      return;
    }
    const sig = generateSmartSignal(candles, market, creatorType, strictSMCMode, smartAutoManage, selectedTimeframe, false, true);
    
    if (!smartAutoManage) {
      // Customize generated with chosen user risk reward multiplier
      const atr = lastCandle?.atr || MARKET_BASES[market].step * 2;
      const tpProfitStep = atr * manualRiskReward * 1.1;

      // Adjust stop loss slightly if strict SMC is not selected
      if (!strictSMCMode) {
        sig.sl = creatorType === 'SELL LIMIT' ? sig.entry + atr * 1.5 : sig.entry - atr * 1.5;
      }
      sig.tp1 = creatorType === 'SELL LIMIT' ? sig.entry - atr * 1.2 : sig.entry + atr * 1.2;
      sig.tp2 = creatorType === 'SELL LIMIT' ? sig.entry - tpProfitStep * 0.8 : sig.entry + tpProfitStep * 0.8;
      sig.tp3 = creatorType === 'SELL LIMIT' ? sig.entry - tpProfitStep * 1.3 : sig.entry + tpProfitStep * 1.3;
    }
    sig.quality = selectedQuality;
    sig.isScalp = true;
    sig.strategyCategory = 'SCALP_LIMIT';

    setActiveSignal(sig);
    setManualEntryPrice(sig.entry);
    triggerAudioTick('info');
    if (smartAutoManage) {
      addAlertLog(`⚡ تم احتساب توصية سكلبينج معلقة ${sig.type} ذكية بالكامل (إدارة المنصة التلقائية لقيم الدخول والأهداف والاستوب)`);
      showToast(`⚡ تم تجهيز توصية سكلبينج ${sig.type} بدخول ارتدادي @ ${sig.entry.toFixed(MARKET_BASES[market].digits)}`);
    } else {
      addAlertLog(`⚡ تم احتساب توصية سكلبينج ${sig.type} مخصصة فئة جودة: ${selectedQuality} بنسبة مخاطرة 1:${manualRiskReward}`);
      showToast(`⚡ تم تجهيز توصية سكلبينج ${sig.type}`);
    }

    // If autoPlaceLimitOrders is ON, auto-hang this freshly generated setup immediately!
    if (autoPlaceLimitOrders) {
      executeAutoPlacePendingSignal(sig, 'auto');
    }
  };

  // Adjust parameters when manual sliding or picking Entry
  const handleChartPointPicked = (pickedPrice: number) => {
    if (smartAutoManage) return; // Prevent manual picking when smart auto-manage is enabled
    setManualEntryPrice(pickedPrice);
    if (activeSignal) {
      const meta = MARKET_BASES[market];
      const atr = lastCandle?.atr || meta.step * 2;
      const updated = { ...activeSignal };
      const diff = pickedPrice - updated.entry;
      updated.entry = pickedPrice;
      updated.zoneMin = pickedPrice - atr * 0.35;
      updated.zoneMax = pickedPrice + atr * 0.35;
      // offset targets in unison
      updated.sl += diff;
      updated.tp1 += diff;
      updated.tp2 += diff;
      updated.tp3 += diff;
      setActiveSignal(updated);
      triggerAudioTick('info');
    }
  };

  // Dedicated Auto & Manual Pending Dispatcher with Zero-Drawdown & Untouched Zone Enforcement
  const executeAutoPlacePendingSignal = (signalToPlace: TradingSignal, source: 'auto' | 'manual' = 'auto') => {
    if (!signalToPlace) return;

    if (isWeekendAndNotBtc(signalToPlace.market as MarketSymbol)) {
      if (source === 'manual') {
        showToast("❌ سوق الذهب والعملات مغلق بالكامل في عطلة نهاية الأسبوع (السبت والأحد). التداول متاح فقط على البيتكوين (BTCUSD)!");
        addAlertLog("⚠️ [عطلة نهاية الأسبوع] تم حظر فتح صفقة لـ " + signalToPlace.market + ". التداول متاح فقط على عملة البيتكوين (BTCUSD) يومي السبت والأحد.");
        triggerAudioTick('fail');
      }
      return;
    }

    const curMarket = signalToPlace.market as MarketSymbol;
    const digits = MARKET_BASES[curMarket]?.digits || 2;
    const curCandles = candlesRef.current;
    const curPrice = curCandles.length > 0 ? curCandles[curCandles.length - 1].close : (currentPrices[curMarket] || MARKET_BASES[curMarket].base);

    let finalPlacedSignal = { ...signalToPlace };

    // Strict Zero-Drawdown Untouched Zone Validation:
    // If BUY LIMIT is at or above current price, or SELL LIMIT is at or below current price (touched/passed),
    // recalculate instantly on a genuine virgin untouched institutional zone!
    const isInvalidBuyLimit = finalPlacedSignal.type.includes('BUY LIMIT') && finalPlacedSignal.entry >= curPrice;
    const isInvalidSellLimit = finalPlacedSignal.type.includes('SELL LIMIT') && finalPlacedSignal.entry <= curPrice;

    if ((isInvalidBuyLimit || isInvalidSellLimit) && curCandles.length > 5) {
      finalPlacedSignal = generateSmartSignal(
        curCandles,
        curMarket,
        finalPlacedSignal.type as any,
        true,
        smartAutoManage,
        selectedTimeframe,
        false,
        true
      );
    }

    const newOrder: TradingSignal = {
      ...finalPlacedSignal,
      timeframe: finalPlacedSignal.timeframe || selectedTimeframe,
      quality: selectedQuality,
      status: 'Pending',
      isSmartManaged: smartAutoManage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      day: new Date().toLocaleDateString('ar-EG', { weekday: 'long' }),
    };

    setAllSignals((prev) => {
      // Avoid duplicate pending orders on the exact same price zone (within 0.1)
      const isDuplicate = prev.some(
        (s) => s.market === newOrder.market && s.status === 'Pending' && Math.abs(s.entry - newOrder.entry) < 0.1
      );
      if (isDuplicate && source === 'auto') {
        return prev;
      }

      const finalOrder = { ...newOrder };
      if (prev.some((s) => s.id === finalOrder.id)) {
        finalOrder.id = `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      return deduplicateSignals([finalOrder, ...prev]);
    });

    const prefix = source === 'auto' ? '🤖 [تعليق LIMIT تلقائي - زيرو انعكاس]' : '🎯 [صفقة زيرو انعكاس - منطقة عذراء]';
    showToast(`${prefix} تم تعليق أمر ${newOrder.type} (${selectedQuality}) بنجاح على منطقة عذراء غير ملموسة عند ${newOrder.entry.toFixed(digits)}! 💎`);
    addAlertLog(`${prefix} أمر معلق غير ملموس: ${newOrder.type} (${selectedQuality}) @ ${newOrder.entry.toFixed(digits)} تم إرساله لنظام المنصة.`);
    triggerAudioTick('success');
    dispatchPendingSignal(newOrder);

    if (source === 'manual') {
      setChartViewMode('TRADINGVIEW');
      setIsTvHudOpen(true);
      setTvHudTab('pending');
    }

    setActiveSignal(newOrder);
  };

  // Dispatch Signal/Active state to Pending list (Manual Trigger)
  const handlePlaceOrderPending = () => {
    if (!activeSignal) return;
    executeAutoPlacePendingSignal(activeSignal, 'manual');
  };

  // Real-time live institutional analysis & recommendation issuer (Zero Reflection)
  const handleGenerateLiveRecommendation = async () => {
    try {
      setIsRealPricesLoading(true);
      let curCandles = candles;
      if (!curCandles || curCandles.length < 10) {
        const fresh = await fetchRealCandlesFromAPI(market, selectedTimeframe, 90);
        if (fresh && fresh.length >= 10) {
          curCandles = fresh;
          setCandles(fresh);
        } else {
          showToast("⚠️ تعذر جلب شموع كافية لإصدار توصية حقيقية. تم إيقاف العملية بأمان.");
          return;
        }
      }

      const realSignal = generateSmartSignal(
        curCandles,
        market,
        undefined,
        strictSMCMode,
        smartAutoManage,
        selectedTimeframe,
        false,
        true
      );

      setActiveSignal(realSignal);
      executeAutoPlacePendingSignal(realSignal, 'auto');
      showToast(`🎯 تم فحص شمعات ${market} وإصدار توصية حقيقية بنجاح (${realSignal.type}) زيرو انعكاس!`);
      triggerAudioTick('success');
    } catch (e) {
      console.warn("Failed to generate live recommendation:", e);
    } finally {
      setIsRealPricesLoading(false);
    }
  };

  // Instant Market Execution: Enters trade directly at current live market price
  const handleExecuteMarketOrderNow = () => {
    if (!activeSignal) return;
    if (!candles || candles.length === 0) return;

    if (isWeekendAndNotBtc(activeSignal.market as MarketSymbol)) {
      showToast("❌ سوق الذهب والعملات مغلق بالكامل في عطلة نهاية الأسبوع (السبت والأحد). التداول متاح فقط على البيتكوين (BTCUSD)!");
      addAlertLog("⚠️ [عطلة نهاية الأسبوع] تم حظر فتح صفقة لـ " + activeSignal.market + ". التداول متاح فقط على عملة البيتكوين (BTCUSD) يومي السبت والأحد.");
      triggerAudioTick('fail');
      return;
    }

    const meta = MARKET_BASES[market];
    const curPrice = currentPrices[market] || (candles.length > 0 ? candles[candles.length - 1].close : meta.base);
    const isBuy = activeSignal.type.includes('BUY');
    const direction = isBuy ? 1 : -1;
    const atr = (candles.length > 0 ? candles[candles.length - 1].atr : undefined) || meta.step * 2;
    const slDist = Math.max(Math.abs(curPrice - activeSignal.sl), atr * 1.5);
    const sl = isBuy ? curPrice - slDist : curPrice + slDist;
    const finalRisk = Math.abs(curPrice - sl);

    const newOrder: TradingSignal = {
      ...activeSignal,
      id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: isBuy ? 'BUY' : 'SELL',
      status: 'Active',
      entry: curPrice,
      sl,
      tp1: curPrice + finalRisk * 1.5 * direction,
      tp2: curPrice + finalRisk * 2.5 * direction,
      tp3: curPrice + finalRisk * 4.0 * direction,
      points: 0,
      hasAlertedActivated: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      day: new Date().toLocaleDateString('ar-EG', { weekday: 'long' }),
    };

    setAllSignals((prev) => deduplicateSignals([newOrder, ...prev]));
    setActiveSignal(newOrder);

    const alertMsg = `🚀 [تنفيذ فوري] تم تفعيل صفقة ${newOrder.type} الآن بسعر السوق @ ${curPrice.toFixed(meta.digits)} وهي قيد التداول النشط! 🔵`;
    showToast(alertMsg);
    addAlertLog(alertMsg);
    triggerAudioTick('success');
    dispatchOrderActivated(newOrder);

    setChartViewMode('TRADINGVIEW');
    setIsTvHudOpen(true);
    setTvHudTab('pending');
  };

  // Instant Manual Activation of an existing Pending order at current price
  const handleActivatePendingOrderNow = (id: string) => {
    const meta = MARKET_BASES[market];
    const curPrice = currentPrices[market] || (candles.length > 0 ? candles[candles.length - 1].close : meta.base);

    setAllSignals((prev) => {
      let activatedSignal: TradingSignal | null = null;
      const updated = prev.map((s) => {
        if (s.id === id) {
          const isBuy = s.type.includes('BUY');
          const direction = isBuy ? 1 : -1;
          const atr = candles[candles.length - 1]?.atr || meta.step * 2;
          const finalRisk = Math.max(Math.abs(curPrice - s.sl), atr * 1.2);
          const sl = isBuy ? curPrice - finalRisk : curPrice + finalRisk;
          
          activatedSignal = {
            ...s,
            status: 'Active' as const,
            entry: curPrice,
            sl,
            tp1: curPrice + finalRisk * 1.5 * direction,
            tp2: curPrice + finalRisk * 2.5 * direction,
            tp3: curPrice + finalRisk * 4.0 * direction,
            points: 0,
            hasAlertedActivated: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          return activatedSignal;
        }
        return s;
      });

      if (activatedSignal) {
        setActiveSignal(activatedSignal);
        const alertMsg = `⚡ [تفعيل يدوي فوري] تم تحويل الأمر المعلق #${id.substring(4, 7)} إلى صفقة نشطة بسعر السوق الحالي (${curPrice.toFixed(meta.digits)})! 🔵`;
        addAlertLog(alertMsg);
        showToast(alertMsg);
        dispatchOrderActivated(activatedSignal);
        triggerAudioTick('success');
      }

      return updated;
    });
  };

  // Manual actions on active logs
  const handleCancelSignal = (id: string) => {
    const sig = allSignals.find((s) => s.id === id);
    setAllSignals((prev) => prev.map((s) => s.id === id ? { ...s, status: 'Cancelled' as const } : s));
    addAlertLog(`❌ تمت تصفية وإلغاء الأمر المعلق رقم #${id.substring(4, 7)}`);
    triggerAudioTick('fail');
    if (sig) {
      dispatchCancelAlert(sig);
    }
  };

  const handleCloseSignalAtMarket = (id: string, closePrice: number) => {
    const sig = allSignals.find(s => s.id === id);
    if (!sig) return;

    const dir = sig.type.startsWith('BUY') ? 1 : -1;
    const meta = MARKET_BASES[sig.market];
    const factorMultiplier = sig.market === 'XAUUSD' ? 10.0 : 10000.0;
    const finalPoints = parseFloat(((closePrice - sig.entry) * dir * factorMultiplier).toFixed(2));
    const isWin = finalPoints >= 0;

    setAllSignals((prev) => prev.map((s) => s.id === id ? { 
      ...s, 
      status: isWin ? ('TP1' as const) : ('SL' as const),
      points: finalPoints,
      closePrice: closePrice,
    } : s));

    addAlertLog(`🔔 تصفية وإغلاق للصفقة المفعّلة ${sig.market} [${sig.type}] @ سعر السوق (${finalPoints >= 0 ? '+' : ''}${finalPoints} نقطة).`);
    triggerAudioTick(isWin ? 'success' : 'fail');
    dispatchManualCloseAlert(sig, closePrice, finalPoints);
  };

  // Derive stats variables from signals history for the premium VVIP dashboard header
  const decisiveHistory = allSignals.filter(
    (s) => s.status === 'TP1' || s.status === 'TP2' || s.status === 'TP3' || s.status === 'SL'
  );
  const completedHistory = allSignals.filter(
    (s) => s.status !== 'Pending' && s.status !== 'Active' && s.status !== 'Cancelled'
  );
  const ambiguousCount = allSignals.filter((s) => s.status === 'AMBIGUOUS').length;
  const wins = decisiveHistory.filter((s) => s.status.startsWith('TP') || s.points >= 0).length;
  const losses = decisiveHistory.filter((s) => s.status === 'SL' && s.points < 0).length;
  const winRate = decisiveHistory.length > 0 ? Math.round((wins / decisiveHistory.length) * 100) : 0;
  const totalNetPoints = decisiveHistory.reduce((sum, s) => sum + s.points, 0);

  // Export current performance stats and completed trades as a CSV file
  const handleExportCSV = () => {
    try {
      const grossWins = completedHistory.filter(s => s.status.startsWith('TP') || (s.points || 0) >= 0).reduce((sum, s) => sum + (s.points || 0), 0);
      const grossLosses = Math.abs(completedHistory.filter(s => s.status === 'SL' && (s.points || 0) < 0).reduce((sum, s) => sum + (s.points || 0), 0));
      const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? '9.50' : '0.00';

      let csvContent = "\ufeff"; // BOM for excel to recognize utf-8

      // Section 1: Title and Header Info
      csvContent += "مؤشر MM VVIP - تقرير الأداء المالي وسجل كافة الصفقات الأسبوعية\n";
      csvContent += `تاريخ التصدير,"${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}"\n\n`;

      // Section 2: Summary Metrics
      csvContent += "إحصائيات الأداء الحالية\n";
      csvContent += "المؤشر الإحصائي,القيمة\n";
      csvContent += `إجمالي الصفقات المكتملة,${completedHistory.length}\n`;
      csvContent += `الصفقات الناجحة (TP),${wins}\n`;
      csvContent += `الصفقات الخاسرة (SL),${losses}\n`;
      csvContent += `معدل نجاح الاستراتيجية (Win Rate),${winRate}%\n`;
      csvContent += `صافي النقاط المحققة,${totalNetPoints.toFixed(2)} Pips\n`;
      csvContent += `عامل الربحية (Profit Factor),${profitFactor}\n\n`;

      // Section 3: All Weekly Trades Log Table
      csvContent += "سجل كافة صفقات الأسبوع التفصيلي\n";
      csvContent += "معرف الصفقة,الأصل المتداول,نوع الأمر,سعر الدخول,وقف الخسارة (SL),الهدف الأول (TP1),الهدف الثاني (TP2),الهدف الثالث (TP3),حالة الصفقة والنتيجة,سعر الإغلاق/الحالي,النقاط المحققة,الوقت\n";

      allSignals.forEach((sig) => {
        if (!sig) return;
        const idShort = (sig.id || '').replace('sig-mock-', '#');
        const marketName = sig.market === 'XAUUSD' ? 'GOLD (الذهب)' : (sig.market || '');
        const entryVal = typeof sig.entry === 'number' ? sig.entry : parseFloat(sig.entry as any) || 0;
        const slVal = typeof sig.sl === 'number' ? sig.sl : parseFloat(sig.sl as any) || 0;
        const tp1Val = typeof sig.tp1 === 'number' ? sig.tp1 : parseFloat(sig.tp1 as any) || 0;
        const tp2Val = typeof sig.tp2 === 'number' ? sig.tp2 : parseFloat(sig.tp2 as any) || 0;
        const tp3Val = typeof sig.tp3 === 'number' ? sig.tp3 : parseFloat(sig.tp3 as any) || 0;

        let resultText = '';
        if (sig.status === 'Pending') {
          resultText = 'معلقة (في انتظار التفعيل)';
        } else if (sig.status === 'Active') {
          resultText = 'نشطة (مستمرة)';
        } else if (sig.status === 'Cancelled') {
          resultText = 'ملغاة';
        } else if (sig.status === 'SL') {
          resultText = (sig.points || 0) >= 0 ? 'تأمين ربح (SL)' : 'ضرب وقف الخسارة (SL)';
        } else if (sig.status === 'TP1') {
          resultText = 'الهدف الأول (TP1)';
        } else if (sig.status === 'TP2') {
          resultText = 'الهدف الثاني (TP2)';
        } else if (sig.status === 'TP3') {
          resultText = 'الهدف الثالث (TP3)';
        }

        const closePriceVal = (sig.status === 'Pending' || sig.status === 'Active') 
          ? 'قيد التداول' 
          : (sig.closePrice !== undefined ? (typeof sig.closePrice === 'number' ? sig.closePrice : parseFloat(sig.closePrice as any) || entryVal) : entryVal);
          
        const pointsVal = (sig.status === 'Pending' || sig.status === 'Active' || sig.status === 'Cancelled') 
          ? '0.00' 
          : (typeof sig.points === 'number' ? sig.points : parseFloat(sig.points as any) || 0).toFixed(2);
        
        csvContent += `"${idShort}","${marketName}","${sig.type || ''}",${entryVal},${slVal},${tp1Val},${tp2Val},${tp3Val},"${resultText}",${closePriceVal},${pointsVal},"${sig.time || ''}"\n`;
      });

      // Create a Blob from the CSV String
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `تقرير_أداء_الصفقات_MM_VVIP_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("📥 تم تصدير وتحميل تقرير الأداء بنجاح كملف CSV!");
      addAlertLog("📊 تم تصدير إحصائيات الأداء والصفقات المكتملة كملف CSV للمراجعة الخارجية.");
    } catch (error) {
      console.error("Export to CSV failed", error);
      showToast("❌ حدث خطأ أثناء محاولة تصدير ملف CSV.");
    }
  };

  // Weekly reset and archive cycle
  const handleWeeklyReset = () => {
    try {
      // 1. Export the current week's CSV report first
      handleExportCSV();
      
      // 2. Archive current week if there's any completed trade
      if (completedHistory.length > 0) {
        const newArchive: ArchivedWeek = {
          id: `week-${Date.now()}`,
          endDate: new Date().toLocaleDateString('ar-EG'),
          totalTrades: completedHistory.length,
          wins: wins,
          losses: losses,
          winRate: winRate,
          netPoints: totalNetPoints,
        };
        setArchivedWeeks(prev => [newArchive, ...prev]);
      }
      
      // 3. Clear all completed trades, keeping only Active or Pending ones (or empty starting fresh)
      const remainingSignals = allSignals.filter(s => s.status === 'Pending' || s.status === 'Active');
      setAllSignals(remainingSignals);
      lastPushedSignalsRef.current = JSON.stringify(remainingSignals);

      // 4. Send reset call to server to sync immediately
      fetch('/api/signals/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signals: remainingSignals }),
      }).catch((err) => console.warn('Failed to push reset signals to server:', err));
      
      showToast("📥 تم تصدير الأسبوع بنجاح وتصفير البيانات لبدء أسبوع تداول جديد!");
      addAlertLog("📅 [دورة أسبوعية] تم ترحيل إحصائيات الأسبوع وتصفير لوحة البيانات لبدء الأسبوع الجديد.");
      triggerAudioTick('success');
    } catch (error) {
      console.error("Weekly reset failed:", error);
      showToast("❌ حدث خطأ غير متوقع أثناء ترحيل وإعادة ضبط الأسبوع.");
    }
  };

  // Dynamically prepare studies list for TradingView Widget based on toggled indicators
  const tvStudiesList: string[] = [];
  if (showEMA50) tvStudiesList.push("MAExp@tv-basicstudies");
  if (showEMA200) tvStudiesList.push("MAExp@tv-basicstudies");
  if (showSuperTrend) tvStudiesList.push("SuperTrend@tv-basicstudies");
  const encodedStudies = encodeURIComponent(JSON.stringify(tvStudiesList));

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#050811] text-slate-100 institutional-bg overflow-x-hidden selection:bg-amber-500/30 selection:text-white" dir="rtl">
      
      {/* ═════════ 1. Institutional Header Nav (Hidden on Home to give pure edge-to-edge MM VIP layout) ═════════ */}
      {mainScreenTab !== 'home' && (
        <HeaderNav
          currentMarket={market}
          isLiveConnected={!isLiveConnectionFailed}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onOpenCalibration={() => setIsCalibrationModalOpen(true)}
          onOpenAlertSettings={() => setIsAlertSettingsModalOpen(true)}
          onSelectTab={(tab) => {
            setMainScreenTab(tab as any);
            triggerAudioTick('info');
          }}
          activeTab={mainScreenTab}
          unreadAlertsCount={alertLogs.length}
          alertLogs={alertLogs}
        />
      )}

      {/* ═════════ 2. Main Institutional Content Container ═════════ */}
      <main className={`flex-1 w-full ${mainScreenTab === 'home' ? 'px-1 sm:px-2 py-1 sm:py-2' : 'px-1 sm:px-2 md:px-3 py-2 sm:py-3'} pb-24 space-y-3`}>
        
        {/* VIEW 1: HOME */}
        {mainScreenTab === 'home' && (
          <Home 
            market={market}
            setMarket={setMarket}
            activeSignal={activeSignal}
            allSignals={allSignals}
            currentPrices={currentPrices}
            onSelectTab={setMainScreenTab}
            onGenerateRealSignal={handleGenerateLiveRecommendation}
            selectedTimeframe={selectedTimeframe}
            derivApiToken={alertSettings.derivApiToken}
            isLiveConnected={!isLiveConnectionFailed}
            alertSettings={alertSettings}
            onToggleAlert={(key) => {
              if (key === 'inApp') {
                setAlertSettings(prev => ({ ...prev, popup: !prev.popup }));
              } else {
                setMainScreenTab('settings');
              }
              triggerAudioTick('info');
            }}
            onUpdateAlertSettings={(newSettings) => {
              setAlertSettings(newSettings);
              localStorage.setItem('mm_vip_alert_settings', JSON.stringify(newSettings));
              showToast("تم تحديث وحفظ بيانات اتصال Deriv المؤسسي بنجاح");
            }}
          />
        )}

        {/* VIEW 2: MARKETS */}
        {mainScreenTab === 'markets' && (
          <Markets
            currentMarket={market}
            setMarket={(sym) => {
              setMarket(sym);
              setMainScreenTab('analysis');
              triggerAudioTick('info');
            }}
            currentPrices={currentPrices}
          />
        )}

        {/* VIEW 3: ANALYSIS */}
        {mainScreenTab === 'analysis' && (
          <Analysis
            market={market}
            currentPrice={currentPrices[market] || (candles.length > 0 ? candles[candles.length - 1].close : MARKET_BASES[market].base)}
            candles={candles}
            zones={zones}
            activeSignal={activeSignal}
            allSignals={allSignals}
            selectedTimeframe={selectedTimeframe}
            onSelectTimeframe={(tf) => {
              setSelectedTimeframe(tf);
              triggerAudioTick('info');
            }}
            onSelectMarket={(sym) => {
              setMarket(sym);
              triggerAudioTick('info');
            }}
            onReloadCandles={handleResetAndRelinkGoldToTradingView}
            isConnected={!isLiveConnectionFailed}
          />
        )}

        {/* VIEW 4: SIGNALS */}
        {mainScreenTab === 'signals' && (
          <Signals
            allSignals={allSignals}
          />
        )}

        {/* VIEW 5: PERFORMANCE / HISTORY */}
        {(mainScreenTab === 'performance' || mainScreenTab === 'history') && (
          <Performance />
        )}

        {/* VIEW 6: SETTINGS */}
        {mainScreenTab === 'settings' && (
          <Settings
            alertSettings={alertSettings}
            onUpdateAlertSettings={(s) => setAlertSettings(s)}
            defaultTimeframe={selectedTimeframe}
            onChangeDefaultTimeframe={(tf) => setSelectedTimeframe(tf)}
            candleCount={candleCount}
            onChangeCandleCount={(c) => setCandleCount(c)}
            isAiEnabled={isAiEnabled}
            onToggleAi={() => setIsAiEnabled(!isAiEnabled)}
            onResetPlatform={handleWeeklyReset}
          />
        )}

      </main>

      {/* ═════════ 3. Fixed Bottom Navigation Bar (الرئيسية, التحليل, الصفقات, الأداء, الإعدادات) ═════════ */}
      <BottomNav
        activeTab={mainScreenTab}
        onSelectTab={(tab) => {
          if (tab === 'more') {
            setIsMoreMenuOpen(true);
          } else {
            setMainScreenTab(tab);
            setIsMoreMenuOpen(false);
          }
          triggerAudioTick('info');
        }}
      />

      <MoreMenu 
        isOpen={isMoreMenuOpen} 
        onClose={() => setIsMoreMenuOpen(false)} 
        onNavigate={(tab) => {
          setMainScreenTab(tab as any);
          setIsMoreMenuOpen(false);
          triggerAudioTick('info');
        }}
      />

      {/* ═════════ 4. Signal Detail Modal (تفاصيل الإشارة والتحليل المؤسسي) ═════════ */}
      {selectedSignalDetail && (
        <SignalDetailModal
          signal={selectedSignalDetail}
          onClose={() => setSelectedSignalDetail(null)}
          onOpenChart={(sym) => {
            setMarket(sym as any);
            setMainScreenTab('analysis');
            setSelectedSignalDetail(null);
          }}
          onAddToWatchlist={(sig) => {
            setWatchlistIds((prev) => {
              const exists = prev.includes(sig.id);
              const updated = exists ? prev.filter((id) => id !== sig.id) : [...prev, sig.id];
              localStorage.setItem('mm_vip_watchlist', JSON.stringify(updated));
              return updated;
            });
            showToast("⭐ تم تحديث قائمة المتابعة بنجاح!");
          }}
          isWatchlisted={watchlistIds.includes(selectedSignalDetail.id)}
        />
      )}

      {/* ═════════ 5. Alert Settings Panel Modal ═════════ */}
      {isAlertSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl institutional-card rounded-2xl p-4 sm:p-5 relative">
            <button
              onClick={() => setIsAlertSettingsModalOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <AlertSettingsPanel
              settings={alertSettings}
              onChangeSettings={(s) => setAlertSettings(s)}
              logs={alertLogs}
              onClearLogs={() => setAlertLogs([])}
            />
          </div>
        </div>
      )}

      {/* ═════════ 6. Price Calibration & Broker Sync Modal ═════════ */}
      {isCalibrationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-[#0e0e16] border border-[#2d2d42] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-right animate-scaleUp">
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-[#D4AF37]/15 to-transparent border-b border-[#232335] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-[#D4AF37] border border-amber-500/30">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>معايرة ومطابقة السعر مع منصتك</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {market}
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    مطابقة أسعار الشارت والتوصيات مع وسيطك بدقة تامة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCalibrationModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-[#14141f] border border-[#252538] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">السعر الحالي في المنظومة</span>
                  <div className="text-lg font-black font-mono text-emerald-400 flex items-baseline gap-1 mt-0.5">
                    <span>{(currentPrices[market] || MARKET_BASES[market].base).toFixed(MARKET_BASES[market].digits)}</span>
                    <span className="text-xs text-slate-400">$</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-bold">فارق المعايرة الحالي</span>
                  <span className={`font-mono text-xs font-black px-2.5 py-1 rounded inline-block mt-0.5 border ${
                    (priceCalibration[market] || 0) > 0 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : (priceCalibration[market] || 0) < 0 
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                        : 'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    {(priceCalibration[market] || 0) > 0 ? '+' : ''}{(priceCalibration[market] || 0).toFixed(MARKET_BASES[market].digits)}$
                  </span>
                </div>
              </div>

              <div className="bg-[#12121c] border border-amber-500/20 rounded-xl p-3.5 space-y-2.5">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Target size={14} className="text-amber-400" />
                  <span>أدخل سعر السهم أو الزوج الظاهر على شاشة منصتك حالياً:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={targetBrokerPriceInput}
                    onChange={(e) => setTargetBrokerPriceInput(e.target.value)}
                    placeholder={`مثال: ${(currentPrices[market] || MARKET_BASES[market].base).toFixed(2)}`}
                    className="flex-1 bg-[#0b0b10] border border-[#2d2d42] text-white font-mono text-sm font-bold rounded-xl px-3 py-2 text-center focus:outline-none focus:border-amber-500/80"
                  />
                  <button
                    onClick={() => {
                      const targetVal = parseFloat(targetBrokerPriceInput);
                      if (!isNaN(targetVal) && targetVal > 0) {
                        const current = currentPrices[market] || MARKET_BASES[market].base;
                        const currentOffset = priceCalibration[market] || 0;
                        const rawBase = current - currentOffset;
                        const newOffset = targetVal - rawBase;
                        setPriceCalibration(prev => ({
                          ...prev,
                          [market]: Number(newOffset.toFixed(4))
                        }));
                        triggerAudioTick('success');
                        showToast(`🎯 تم ضبط ومطابقة السعر مع منصتك فوراً بفارق (${newOffset > 0 ? '+' : ''}${newOffset.toFixed(2)}$)`);
                      } else {
                        showToast("يرجى إدخال سعر صحيح (رقمي)");
                      }
                    }}
                    className="px-4 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#e6c15c] text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shrink-0 flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>مطابقة فورية</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e1e2d] flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setPriceCalibration(prev => ({
                      ...prev,
                      [market]: 0.0
                    }));
                    setTargetBrokerPriceInput('');
                    triggerAudioTick('info');
                    showToast("🔄 تم تصفير المعايرة والعودة للسعر العالمي المباشر");
                  }}
                  className="flex-1 py-2 px-3 bg-[#151520] hover:bg-[#1c1c2b] text-slate-300 border border-[#2b2b3d] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>تصفير المعايرة (0.0$)</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0f] border-t border-[#1c1c28] flex justify-end">
              <button
                onClick={() => setIsCalibrationModalOpen(false)}
                className="px-5 py-1.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-[#e6c15c] hover:to-amber-400 text-slate-950 font-black text-xs rounded-lg transition-all cursor-pointer shadow-md"
              >
                حفظ وإغلاق ✓
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
