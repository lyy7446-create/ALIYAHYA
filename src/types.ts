export type MarketSymbol = 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'US30' | 'NAS100' | 'BTCUSDT' | 'ETHUSDT' | 'BTCUSD';

export type Timeframe = 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export type TrendCondition = 'Strong Bullish' | 'Bullish' | 'Sideways' | 'Bearish' | 'Strong Bearish';

export type TrendScannerResult = 'Strong Up' | 'Up' | 'Sideways' | 'Down' | 'Strong Down';

export type SMCZoneType = 'Supply Zone' | 'Demand Zone' | 'Order Block' | 'Breaker Block' | 'Fair Value Gap' | 'Liquidity Pool';

export interface SMCZone {
  id: string;
  type: SMCZoneType;
  priceMin: number;
  priceMax: number;
  timeframe: string;
  isThreatened: boolean;
  isMitigated: boolean;
  strength: number; // 0 to 100
  score?: number;
  scoreDetails?: {
    trendClear: boolean;
    preLiquidity: boolean;
    impulsiveCandle: boolean;
    previousBounce: boolean;
    freshZone: boolean;
  };
}

export interface TradingSignal {
  id: string;
  market: MarketSymbol;
  type: 'BUY' | 'SELL' | 'BUY LIMIT' | 'SELL LIMIT' | 'BUY STOP' | 'SELL STOP';
  quality: 'A+' | 'A' | 'B+' | 'B' | 'C';
  qualityScore: number;
  entry: number;
  zoneMin: number;
  zoneMax: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4?: number;
  dataSource?: string;
  originalSnapshot?: {
    entry: number;
    sl: number;
    tp1: number;
    time: string;
    createdAtTimestamp: number;
    timeframe: string;
    market: MarketSymbol;
    direction: 'BUY' | 'SELL';
  };
  resolvedAt?: string;
  resolvedAtTimestamp?: number;
  status: 'Pending' | 'Active' | 'TP1' | 'TP2' | 'TP3' | 'SL' | 'Cancelled' | 'AMBIGUOUS' | 'EXPIRED';
  points: number;
  rMultiple?: number;
  spreadCost?: number;
  slippageCost?: number;
  time: string;
  timeframe?: string;
  day?: string;
  originalSl?: number;
  maxReachedPrice?: number;
  lastLockPips?: number;
  closePrice?: number;
  isStrictSMC?: boolean;
  isSmartManaged?: boolean;
  isScalp?: boolean;
  strategyCategory?: 'SCALP_LIMIT' | 'SWING' | 'MARKET';
  hasMovedToBreakeven?: boolean;
  partialProfitsBooked?: number; // 0, 50, 75
  hasAlertedPending?: boolean;
  hasAlertedActivated?: boolean;
  hasAlertedTP1?: boolean;
  hasAlertedTP2?: boolean;
  hasAlertedTP3?: boolean;
  hasAlertedTP4?: boolean;
  hasAlertedSL?: boolean;
  hasAlertedCancelled?: boolean;
  smcVerifiedDetails?: {
    trendClear: boolean;
    preLiquidity: boolean;
    impulsiveCandle: boolean;
    previousBounce: boolean;
    freshZone: boolean;
  };
}

export interface TradingSession {
  name: 'Sydney' | 'Tokyo' | 'London' | 'New York';
  hours: string; // e.g. "22:00 - 07:00 UTC"
  isActive: boolean;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Heikin Ashi values
  haOpen: number;
  haHigh: number;
  haLow: number;
  haClose: number;
  // Indicators
  ema50: number;
  ema200: number;
  superTrendUpper?: number;
  superTrendLower?: number;
  superTrendTrend: 'bull' | 'bear';
  adx: number;
  atr: number;
  // SMC markings
  bos?: {
    type: 'bullish' | 'bearish';
    price: number;
    index: number;
  };
  choch?: {
    type: 'bullish' | 'bearish';
    price: number;
    index: number;
  };
  liquiditySweep?: {
    price: number;
    type: 'buy' | 'sell';
  };
}

export interface AlertSettings {
  popup: boolean;
  push: boolean;
  email: boolean;
  emailAddress: string;
  telegram: boolean;
  telegramToken: string;
  telegramChatId: string;
  whatsapp: boolean;
  whatsappGatewayType: 'clicktochat' | 'ultramsg' | 'greenapi' | 'twilio';
  whatsappInstanceId: string;
  whatsappToken: string;
  whatsappNumber: string;
  derivApiToken: string;
  alertOnSignal: boolean;
  alertOnPendingTrigger?: boolean;
  alertOnTP: boolean;
  alertOnTrailing?: boolean;
  alertOnSL: boolean;
}

export interface MarketMetrics {
  trendStrength: number; // 0 to 100
  volatility: number;    // Pip/Point fluctuation level
  riskRewardRatio: number; // e.g., 2.5
}
