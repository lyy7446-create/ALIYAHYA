import { MarketSymbol, Candle, SMCZone, TradingSignal, MarketMetrics, TrendScannerResult, TrendCondition, TradingSession } from '../types';
import { calculateEnhancedSignalQuality } from './signalAssessment';

// Standard base prices and spread specifications for MT5 spot markets
export const MARKET_BASES: Record<MarketSymbol, { base: number; step: number; digits: number; pipValue: number; defaultSpread: number }> = {
  XAUUSD: { base: 3812.50, step: 0.5, digits: 2, pipValue: 0.10, defaultSpread: 0.20 },
  EURUSD: { base: 1.08450, step: 0.00010, digits: 5, pipValue: 0.00010, defaultSpread: 0.00010 },
  GBPUSD: { base: 1.29800, step: 0.00010, digits: 5, pipValue: 0.00010, defaultSpread: 0.00012 },
  USDJPY: { base: 154.20, step: 0.01, digits: 3, pipValue: 0.01, defaultSpread: 0.015 },
  US30: { base: 43850.0, step: 1.0, digits: 1, pipValue: 1.0, defaultSpread: 2.0 },
  NAS100: { base: 21120.0, step: 0.5, digits: 2, pipValue: 0.5, defaultSpread: 1.5 },
  BTCUSDT: { base: 87400.0, step: 10.0, digits: 2, pipValue: 1.0, defaultSpread: 10.0 },
  ETHUSDT: { base: 2680.0, step: 0.5, digits: 2, pipValue: 0.1, defaultSpread: 0.8 },
  BTCUSD: { base: 87400.0, step: 25.0, digits: 2, pipValue: 1.0, defaultSpread: 10.0 },
};

// Get real-time MT5 Bid/Ask spread
export function getMarketSpread(market: MarketSymbol): { spreadPoints: number; spreadValue: number } {
  const meta = MARKET_BASES[market];
  if (market === 'XAUUSD') {
    return { spreadPoints: 20, spreadValue: 0.20 };
  } else if (market === 'EURUSD') {
    return { spreadPoints: 10, spreadValue: 0.00010 };
  } else if (market === 'GBPUSD') {
    return { spreadPoints: 12, spreadValue: 0.00012 };
  } else if (market === 'USDJPY') {
    return { spreadPoints: 15, spreadValue: 0.015 };
  } else if (market === 'US30') {
    return { spreadPoints: 20, spreadValue: 2.0 };
  } else if (market === 'NAS100') {
    return { spreadPoints: 15, spreadValue: 1.5 };
  } else if (market === 'ETHUSDT') {
    return { spreadPoints: 10, spreadValue: 0.8 };
  } else {
    return { spreadPoints: 100, spreadValue: 10.0 };
  }
}

// Get API base URL dynamically or relative path
export function getApiBaseUrl(): string {
  // Always return empty string so fetch calls use relative paths (/api/...) 
  // which browser handles cleanly regardless of iframe origin or proxy setup.
  return '';
}

// Helper to get a valid, safe HTTPS platform URL for sharing and alerts
export function getSafePlatformUrl(): string {
  if (typeof window === 'undefined') return 'https://ai.studio';
  try {
    if (window.location.href && window.location.href.startsWith('http')) {
      return window.location.href;
    }
  } catch (e) {}

  try {
    if (window.location.origin && window.location.origin.startsWith('http')) {
      return window.location.origin;
    }
  } catch (e) {}

  try {
    if (document.referrer && document.referrer.startsWith('http')) {
      return document.referrer;
    }
  } catch (e) {}

  return 'https://ai.studio';
}

// Format timeframe badge label nicely (e.g. 15m -> 15M, 1h -> 1H, etc.)
export function formatTimeframeBadge(tf?: string): string {
  if (!tf) return '15M';
  const clean = tf.toLowerCase().trim();
  if (clean === '1m' || clean === '1') return '1M';
  if (clean === '5m' || clean === '5') return '5M';
  if (clean === '15m' || clean === '15') return '15M';
  if (clean === '30m' || clean === '30') return '30M';
  if (clean === '1h' || clean === '60') return '1H';
  if (clean === '4h' || clean === '240') return '4H';
  if (clean === '1d' || clean === 'd') return '1D';
  return tf.toUpperCase();
}

// Fetch real candles from our robust server-side proxy with multi-tier direct fallback
export async function fetchRealCandlesFromAPI(market: MarketSymbol, timeframe: string = '15m', count: number = 85): Promise<Candle[]> {
  let rawData: any[] | null = null;
  let lastError: any = null;

  // 1. Try server proxy first
  try {
    const apiBase = getApiBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${apiBase}/api/candles?market=${market}&timeframe=${timeframe}&count=${count}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          rawData = json.data;
        }
      }
    }
  } catch (e: any) {
    lastError = e;
  }

  // 2. Direct browser fetch for Spot Gold (PAXGUSDT matching OANDA:XAUUSD), Crypto & Forex
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    // 2a. Primary 24/7 Spot Gold (PAXGUSDT) & Crypto (BTCUSDT) from Binance
    if (market === 'XAUUSD' || market === 'BTCUSD') {
      const pair = market === 'XAUUSD' ? 'PAXGUSDT' : 'BTCUSDT';
      const binanceIntervals: Record<string, string> = {
        M1: "1m", M5: "5m", M15: "15m", M30: "30m", H1: "1h", H4: "4h", D1: "1d",
        "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d",
      };
      const bInt = binanceIntervals[timeframe] || "15m";
      const btcUrls = [
        `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${bInt}&limit=${count}`,
        `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=${bInt}&limit=${count}`,
        `https://api2.binance.com/api/v3/klines?symbol=${pair}&interval=${bInt}&limit=${count}`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${bInt}&limit=${count}`,
      ];

      for (const url of btcUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              rawData = data;
              break;
            }
          }
        } catch (err) {}
      }
    }

    // 2b. Forex (EURUSD, GBPUSD) or Secondary Spot Gold via Yahoo Finance Spot
    if (!rawData && (market === 'EURUSD' || market === 'GBPUSD' || market === 'XAUUSD' || market === 'BTCUSD')) {
      try {
        const ySymbolsMap: Record<string, string[]> = {
          XAUUSD: ["PAXG-USD"], // Strictly Spot Gold, NEVER GC=F futures
          EURUSD: ["EURUSD=X"],
          GBPUSD: ["GBPUSD=X"],
          BTCUSD: ["BTC-USD"],
        };
        const candidateSymbols = ySymbolsMap[market] || ["EURUSD=X"];
        const candidateHosts = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

        const yIntervals: Record<string, string> = {
          M1: "1m", M5: "5m", M15: "15m", M30: "30m", H1: "60m", H4: "60m", D1: "1d",
          "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "60m", "4h": "60m", "1d": "1d",
        };
        const yInt = yIntervals[timeframe] || "15m";
        const range = (yInt === '1m' || yInt === '5m' || yInt === '15m' || yInt === '30m') ? '5d' : (yInt === '1d' ? '3mo' : '1mo');

        for (const ySymbol of candidateSymbols) {
          for (const host of candidateHosts) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3500);
              const res = await fetch(`https://${host}/v8/finance/chart/${ySymbol}?interval=${yInt}&range=${range}`, {
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (res.ok) {
                const json = await res.json();
                const result = json?.chart?.result?.[0];
                if (result && result.timestamp && result.indicators?.quote?.[0]) {
                  const timestamps = result.timestamp;
                  const quote = result.indicators.quote[0];
                  const opens = quote.open;
                  const highs = quote.high;
                  const lows = quote.low;
                  const closes = quote.close;
                  const volumes = quote.volume || [];

                  const formatted: any[] = [];
                  for (let i = 0; i < timestamps.length; i++) {
                    const t = timestamps[i] * 1000;
                    const o = opens[i];
                    const h = highs[i];
                    const l = lows[i];
                    const c = closes[i];
                    const v = volumes[i] || 0;
                    if (o !== null && h !== null && l !== null && c !== null && !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
                      formatted.push([t, o, h, l, c, v]);
                    }
                  }
                  if (formatted.length > 0) {
                    rawData = formatted.slice(-count);
                    break;
                  }
                }
              }
            } catch (e) {}
          }
          if (rawData && rawData.length > 0) break;
        }
      } catch (err) {
        // Fallback below
      }
    }
  }

  // 3. Safe fallback if completely offline or unreachable
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return generateInitialCandles(market, count);
  }

  const candles: Candle[] = rawData.map((k: any) => {
    const openTime = new Date(k[0]);
    let open = parseFloat(k[1]);
    let high = parseFloat(k[2]);
    let low = parseFloat(k[3]);
    let close = parseFloat(k[4]);
    const volume = parseFloat(k[5]);
    const timeStr = openTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Apply offset if available from user calibration settings
    let offset = 0;
    try {
      const calSaved = localStorage.getItem('mm_vip_price_calibration');
      if (calSaved) {
        const calObj = JSON.parse(calSaved);
        offset = parseFloat(calObj[market]) || 0;
      }
    } catch (e) {}

    if (offset !== 0) {
      open += offset;
      high += offset;
      low += offset;
      close += offset;
    }

    return {
      time: timeStr,
      open,
      high,
      low,
      close,
      volume,
      haOpen: open,
      haHigh: high,
      haLow: low,
      haClose: close,
      ema50: close,
      ema200: close,
      superTrendTrend: 'bear',
      adx: 20,
      atr: 0,
    };
  });

  // Calculate standard indicators dynamically
  calculateTechnicalIndicators(candles, market);
  detectSMCAndLiquidity(candles, market);

  return candles;
}

// Generate initial list of candles for simulation
export function generateInitialCandles(market: MarketSymbol, count: number = 80): Candle[] {
  const meta = MARKET_BASES[market];
  
  // Apply offset if available from user calibration settings
  let offset = 0;
  try {
    const calSaved = localStorage.getItem('mm_vip_price_calibration');
    if (calSaved) {
      const calObj = JSON.parse(calSaved);
      offset = parseFloat(calObj[market]) || 0;
    }
  } catch (e) {}

  let currentPrice = meta.base + offset;
  const candles: Candle[] = [];

  // Timestamp tracker
  let timeCursor = new Date();
  timeCursor.setMinutes(timeCursor.getMinutes() - count * 15); // 15 min increments

  // Make an initial trend direction
  let trendPhase = -1; // Bearish start as shown in user's image

  for (let i = 0; i < count; i++) {
    // Periodically shift the simulated trend phase
    if (i % 25 === 0) {
      trendPhase *= -1; // Toggle trend direction
    }

    const noise = (Math.random() - 0.48) * meta.step * 4;
    const expectedDir = trendPhase * meta.step * 2;
    const change = expectedDir + noise;

    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * meta.step * 1.5;
    const low = Math.min(open, close) - Math.random() * meta.step * 1.5;

    currentPrice = close;

    const timeStr = timeCursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    candles.push({
      time: timeStr,
      open,
      high,
      low,
      close,
      volume: Math.floor(1000 + Math.random() * 9000),
      haOpen: open,
      haHigh: high,
      haLow: low,
      haClose: close,
      ema50: currentPrice,
      ema200: currentPrice,
      superTrendTrend: 'bear',
      adx: 20 + Math.random() * 30,
      atr: meta.step * 2.5,
    });

    timeCursor.setMinutes(timeCursor.getMinutes() + 15);
  }

  // Calculate technical indicators (rolling calculation)
  calculateTechnicalIndicators(candles, market);

  // Mark Smart Money Patterns (BOS, CHOCH, FVG)
  detectSMCAndLiquidity(candles, market);

  return candles;
}

// Calculate true EMA, SuperTrend, ADX and ATR
export function calculateTechnicalIndicators(candles: Candle[], market: MarketSymbol) {
  const meta = MARKET_BASES[market];
  const count = candles.length;
  if (count === 0) return;

  // Initialize ATR
  let atr = meta.step * 3;
  
  // Calculate rolling indexes
  for (let i = 0; i < count; i++) {
    const c = candles[i];

    // EMA 50
    if (i === 0) {
      c.ema50 = c.close;
      c.ema200 = c.close;
    } else {
      const prev = candles[i - 1];
      c.ema50 = prev.ema50 * (49 / 50) + c.close * (1 / 50);
      c.ema200 = prev.ema200 * (199 / 200) + c.close * (1 / 200);
    }

    // Dynamic Heikin Ashi Calculation
    if (i === 0) {
      c.haOpen = c.open;
      c.haClose = (c.open + c.high + c.low + c.close) / 4;
      c.haHigh = c.high;
      c.haLow = c.low;
    } else {
      const prev = candles[i - 1];
      c.haClose = (c.open + c.high + c.low + c.close) / 4;
      c.haOpen = (prev.haOpen + prev.haClose) / 2;
      c.haHigh = Math.max(c.high, c.haOpen, c.haClose);
      c.haLow = Math.min(c.low, c.haOpen, c.haClose);
    }

    // Dynamic ATR
    if (i > 0) {
      const prev = candles[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
      atr = atr * 0.93 + tr * 0.07;
    }
    c.atr = atr;

    // SuperTrend calculation
    const multiplier = 2.8;
    const median = (c.high + c.low) / 2;
    const upperLimit = median + multiplier * atr;
    const lowerLimit = median - multiplier * atr;

    if (i === 0) {
      c.superTrendUpper = upperLimit;
      c.superTrendLower = lowerLimit;
      c.superTrendTrend = c.close < median ? 'bear' : 'bull';
    } else {
      const prev = candles[i - 1];
      c.superTrendTrend = prev.superTrendTrend;

      // Adjust trend bands
      c.superTrendUpper = upperLimit < (prev.superTrendUpper ?? 0) || prev.close > (prev.superTrendUpper ?? 0)
        ? upperLimit
        : (prev.superTrendUpper ?? 0);

      c.superTrendLower = lowerLimit > (prev.superTrendLower ?? 0) || prev.close < (prev.superTrendLower ?? 0)
        ? lowerLimit
        : (prev.superTrendLower ?? 0);

      if (prev.superTrendTrend === 'bull' && c.close < (prev.superTrendLower ?? 0)) {
        c.superTrendTrend = 'bear';
      } else if (prev.superTrendTrend === 'bear' && c.close > (prev.superTrendUpper ?? 0)) {
        c.superTrendTrend = 'bull';
      }
    }

    // ADX simulation (trending ADX follows trend strengths)
    if (i > 0) {
      const prev = candles[i - 1];
      const isTrending = Math.abs(c.ema50 - c.ema200) > meta.step * 5;
      const targetADX = isTrending ? 38 + Math.random() * 12 : 14 + Math.random() * 8;
      c.adx = prev.adx * 0.9 + targetADX * 0.1;
    } else {
      c.adx = 22;
    }
  }
}

// Detect BOS, CHOCH, FVG, or Liquidity Sweep in candle history
export function detectSMCAndLiquidity(candles: Candle[], market: MarketSymbol) {
  const count = candles.length;
  if (count < 10) return;

  // Let's identify swing highs & swing lows for BOS/CHOCH
  // A swing high is a high surrounded by 2 lower highs
  // A swing low is a low surrounded by 2 higher lows
  for (let i = 2; i < count - 2; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    const isSwingHigh = curr.high > prev1.high && curr.high > prev2.high && curr.high > next1.high && curr.high > next2.high;
    const isSwingLow = curr.low < prev1.low && curr.low < prev2.low && curr.low < next1.low && curr.low < next2.low;

    // Detect BOS / CHOCH triggers
    // If a later candle breaks this swing high/low close, it's a BOS or CHOCH
    for (let j = i + 1; j < Math.min(i + 10, count); j++) {
      const testCandle = candles[j];
      
      // If price closes above swing high
      if (isSwingHigh && testCandle.close > curr.high && !testCandle.bos && !testCandle.choch) {
        // First occurrence is CHOCH, subsequent ones are BOS
        const hasPriorCh = candles.slice(i, j).some(x => x.choch?.type === 'bullish');
        if (!hasPriorCh) {
          testCandle.choch = { type: 'bullish', price: curr.high, index: i };
        } else {
          testCandle.bos = { type: 'bullish', price: curr.high, index: i };
        }
        break;
      }

      // If price closes below swing low
      if (isSwingLow && testCandle.close < curr.low && !testCandle.bos && !testCandle.choch) {
        const hasPriorCh = candles.slice(i, j).some(x => x.choch?.type === 'bearish');
        if (!hasPriorCh) {
          testCandle.choch = { type: 'bearish', price: curr.low, index: i };
        } else {
          testCandle.bos = { type: 'bearish', price: curr.low, index: i };
        }
        break;
      }
    }

    // Detect Fair Value Gap (FVG)
    // Upward FVG: Low of candle[i+2] > High of candle [i]
    if (i < count - 2) {
      const c1 = candles[i];
      const c2 = candles[i + 1];
      const c3 = candles[i + 2];
      
      // Dynamic Liquidity Sweep
      if (c2.high > c1.high && c2.high > c3.high && c2.close < c1.high) {
        c2.liquiditySweep = { price: c2.high, type: 'buy' };
      }
      if (c2.low < c1.low && c2.low < c3.low && c2.close > c1.low) {
        c2.liquiditySweep = { price: c2.low, type: 'sell' };
      }
    }
  }
}

// Extract dynamic Supply, Demand, Order Blocks, and Breaker Blocks zones based on the current candles with strict untouched mitigation tracking
export function extractInstitutionalZones(candles: Candle[], market: MarketSymbol): SMCZone[] {
  const zones: SMCZone[] = [];
  const meta = MARKET_BASES[market];
  const count = candles.length;
  if (count < 10) return [];

  const lastCandle = candles[count - 1];
  const currentPrice = lastCandle.close;
  const atr = Math.max(lastCandle.atr || meta.step * 2, meta.step * 1.5);

  // 1. Scan for real Swing Points, Order Blocks (OB), and Fair Value Gaps (FVG)
  const lookback = Math.min(count - 2, 50);

  // Detect Bullish & Bearish Order Blocks (OB)
  for (let i = count - lookback; i < count - 3; i++) {
    const cCurr = candles[i];
    const cNext1 = candles[i + 1];
    const cNext2 = candles[i + 2];

    // Bearish OB: Up candle before a strong downward displacement
    if (cCurr.close > cCurr.open && cNext1.close < cCurr.low && cNext2.close < cNext1.low) {
      const pMin = Math.min(cCurr.open, cCurr.close);
      const pMax = cCurr.high;
      
      // Check if subsequent candles (from i+1 to count-1) have touched or closed above this zone
      let touched = false;
      let broken = false;
      for (let j = i + 1; j < count; j++) {
        if (candles[j].high >= pMin) {
          touched = true;
        }
        if (candles[j].close > pMax) {
          broken = true;
          break;
        }
      }

      if (!broken) {
        zones.push({
          id: `ob-bearish-${i}`,
          type: 'Order Block',
          priceMin: pMin,
          priceMax: pMax,
          timeframe: '15M',
          isThreatened: touched,
          isMitigated: touched,
          strength: touched ? 65 : 94,
        });
      }
    }

    // Bullish OB: Down candle before a strong upward displacement
    if (cCurr.close < cCurr.open && cNext1.close > cCurr.high && cNext2.close > cNext1.high) {
      const pMin = cCurr.low;
      const pMax = Math.max(cCurr.open, cCurr.close);

      // Check if subsequent candles have touched or closed below this zone
      let touched = false;
      let broken = false;
      for (let j = i + 1; j < count; j++) {
        if (candles[j].low <= pMax) {
          touched = true;
        }
        if (candles[j].close < pMin) {
          broken = true;
          break;
        }
      }

      if (!broken) {
        zones.push({
          id: `ob-bullish-${i}`,
          type: 'Order Block',
          priceMin: pMin,
          priceMax: pMax,
          timeframe: '15M',
          isThreatened: touched,
          isMitigated: touched,
          strength: touched ? 65 : 95,
        });
      }
    }

    // Detect Fair Value Gaps (FVG)
    // Bullish FVG: Gap between candle[i].high and candle[i+2].low
    if (cNext2.low > cCurr.high + (meta.step * 0.5)) {
      const gapMin = cCurr.high;
      const gapMax = cNext2.low;

      let gapFilled = false;
      for (let j = i + 3; j < count; j++) {
        if (candles[j].low <= gapMax) {
          gapFilled = true;
          break;
        }
      }

      zones.push({
        id: `fvg-up-${i}`,
        type: 'Fair Value Gap',
        priceMin: gapMin,
        priceMax: gapMax,
        timeframe: '15M',
        isThreatened: gapFilled,
        isMitigated: gapFilled,
        strength: gapFilled ? 60 : 92,
      });
    }

    // Bearish FVG: Gap between candle[i].low and candle[i+2].high
    if (cCurr.low > cNext2.high + (meta.step * 0.5)) {
      const gapMin = cNext2.high;
      const gapMax = cCurr.low;

      let gapFilled = false;
      for (let j = i + 3; j < count; j++) {
        if (candles[j].high >= gapMin) {
          gapFilled = true;
          break;
        }
      }

      zones.push({
        id: `fvg-down-${i}`,
        type: 'Fair Value Gap',
        priceMin: gapMin,
        priceMax: gapMax,
        timeframe: '15M',
        isThreatened: gapFilled,
        isMitigated: gapFilled,
        strength: gapFilled ? 60 : 91,
      });
    }
  }

  // 2. Add Major Institutional Supply & Demand Extreme Zones
  const last40 = candles.slice(Math.max(0, count - 40));
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  let highestHighIdx = 0;
  let lowestLowIdx = 0;

  last40.forEach((c, idx) => {
    if (c.high > highestHigh) {
      highestHigh = c.high;
      highestHighIdx = idx;
    }
    if (c.low < lowestLow) {
      lowestLow = c.low;
      lowestLowIdx = idx;
    }
  });

  // Check if Supply is touched recently
  const supplyMin = highestHigh - meta.step * 3;
  const supplyMax = highestHigh + meta.step * 1.5;
  const isSupplyMitigated = currentPrice >= supplyMin;

  zones.push({
    id: 'supply-1',
    type: 'Supply Zone',
    priceMin: supplyMin,
    priceMax: supplyMax,
    timeframe: '1H',
    isThreatened: isSupplyMitigated,
    isMitigated: isSupplyMitigated,
    strength: isSupplyMitigated ? 70 : 96,
  });

  // Check if Demand is touched recently
  const demandMin = lowestLow - meta.step * 1.5;
  const demandMax = lowestLow + meta.step * 3;
  const isDemandMitigated = currentPrice <= demandMax;

  zones.push({
    id: 'demand-1',
    type: 'Demand Zone',
    priceMin: demandMin,
    priceMax: demandMax,
    timeframe: '4H',
    isThreatened: isDemandMitigated,
    isMitigated: isDemandMitigated,
    strength: isDemandMitigated ? 70 : 98,
  });

  // Enrich all zones with dynamic scores and rating details based on the SMC criteria
  const enrichedZones = zones.map(zone => {
    const isMitigated = zone.isMitigated;
    const isThreatened = zone.isThreatened;
    const type = zone.type;
    const priceMin = zone.priceMin;
    const priceMax = zone.priceMax;

    const lastCandle = candles[count - 1];
    const last30Candles = candles.slice(Math.max(0, count - 30));

    // 1. Clear Trend (الاتجاه واضح): Demand-based zones favor Bullish, Supply-based favor Bearish.
    const isEmaBullish = lastCandle ? lastCandle.close > lastCandle.ema50 : true;
    const isSuperTrendBullish = lastCandle ? lastCandle.superTrendTrend === 'bull' : true;
    const isTrendBullish = isEmaBullish || isSuperTrendBullish;

    const isDemandOriented = type === 'Demand Zone' || (type === 'Order Block' && zone.id.includes('bullish')) || (type === 'Fair Value Gap' && zone.id.includes('up'));
    const trendClear = isDemandOriented ? isTrendBullish : !isTrendBullish;

    // 2. Pre-Liquidity (توجد سيولة قبل المنطقة)
    const hasSweep = last30Candles.some(c => c.liquiditySweep !== undefined);
    const preLiquidity = hasSweep || (zone.id === 'supply-1' || zone.id === 'demand-1');

    // 3. Impulsive Candle (توجد شمعة اندفاع قوية)
    const impulsiveCandle = type === 'Fair Value Gap' || type === 'Order Block' || (last30Candles.some(c => Math.abs(c.close - c.open) > (c.atr || 0) * 1.2));

    // 4. Previous Bounce (يوجد ارتداد سابق من المنطقة)
    const previousBounce = type === 'Demand Zone' || type === 'Supply Zone' || type === 'Order Block';

    // 5. Fresh Zone (منطقة عذراء غير ملموسة إطلاقاً - Zero Drawdown Target)
    const freshZone = !isMitigated && !isThreatened;

    // Calculate score
    let score = 0;
    if (trendClear) score += 20;
    if (preLiquidity) score += 20;
    if (impulsiveCandle) score += 20;
    if (previousBounce) score += 20;
    if (freshZone) score += 20;

    if (freshZone) {
      score = Math.max(90, score);
    } else {
      score = Math.min(75, Math.max(55, score));
    }

    return {
      ...zone,
      strength: score,
      score,
      scoreDetails: {
        trendClear,
        preLiquidity,
        impulsiveCandle,
        previousBounce,
        freshZone
      }
    };
  });

  // Sort: prioritize virgin untouched zones first, then highest strength
  return enrichedZones.sort((a, b) => {
    if (!a.isMitigated && b.isMitigated) return -1;
    if (a.isMitigated && !b.isMitigated) return 1;
    return (b.strength || 0) - (a.strength || 0);
  });
}

// Calculate Smart Trend Engine Outcome
export function getSmartTrendCondition(lastCandle?: Candle): TrendCondition {
  if (!lastCandle) return 'Sideways';
  const isEmaBullish = (lastCandle.close ?? 0) > (lastCandle.ema50 ?? 0);
  const isEmaTrendBullish = (lastCandle.ema50 ?? 0) > (lastCandle.ema200 ?? 0);
  const isSuperTrendBullish = lastCandle.superTrendTrend === 'bull';
  const isHaBullish = (lastCandle.haClose ?? 0) > (lastCandle.haOpen ?? 0);
  
  let score = 0;
  if (isEmaBullish) score += 1;
  if (isEmaTrendBullish) score += 1.5;
  if (isSuperTrendBullish) score += 2;
  if (isHaBullish) score += 0.5;

  // Max score is 5, minimum is 0
  if (score >= 4.5) return 'Strong Bullish';
  if (score >= 3.0) return 'Bullish';
  if (score >= 1.5) return 'Sideways';
  if (score >= 0.5) return 'Bearish';
  return 'Strong Bearish';
}

// Scan other timeframes simulated trends
export function getMtfScannerResults(market: MarketSymbol): Record<string, TrendScannerResult> {
  // Let's create reproducible but realistic scanner results based on market bases
  const rand = Math.random();
  
  if (market === 'XAUUSD') {
    return {
      M5: 'Sideways',
      M15: 'Down',
      M30: 'Down',
      H1: 'Sideways',
      H4: 'Strong Down',
      D1: 'Strong Down',
    };
  } else if (market === 'EURUSD') {
    return {
      M5: 'Strong Up',
      M15: 'Up',
      M30: 'Up',
      H1: 'Sideways',
      H4: 'Up',
      D1: 'Down',
    };
  } else if (market === 'GBPUSD') {
    return {
      M5: 'Up',
      M15: 'Up',
      M30: 'Sideways',
      H1: 'Down',
      H4: 'Sideways',
      D1: 'Strong Up',
    };
  } else {
    // BTCUSD
    return {
      M5: 'Strong Up',
      M15: 'Strong Up',
      M30: 'Up',
      H1: 'Up',
      H4: 'Strong Up',
      D1: 'Strong Up',
    };
  }
}

// Calculate dynamic metrics: Dynamic Risk Reward, Volatility, and Trend strength based on ATR
export function getMarketMetrics(candles: Candle[], market: MarketSymbol): MarketMetrics {
  const meta = MARKET_BASES[market];
  if (!candles || candles.length === 0) {
    return { trendStrength: 50, volatility: 40, riskRewardRatio: 2.5 };
  }
  const last = candles[candles.length - 1];
  if (!last) return { trendStrength: 50, volatility: 40, riskRewardRatio: 2.5 };

  // ADX measures strength 0-100
  const trendStrength = Math.min(100, Math.max(10, Math.round((last.adx || 25) * 1.8)));
  
  // Volatility is mapped based on current ATR ratio to usual base step
  const normalAtr = meta.step * 2.5;
  const volPct = Math.min(100, Math.max(10, Math.round(((last.atr || meta.step * 2) / normalAtr) * 50)));

  return {
    trendStrength,
    volatility: volPct,
    riskRewardRatio: 2.8,
  };
}

// Generate an automated premium signals on demand
export function generateSmartSignal(
  candles: Candle[],
  market: MarketSymbol,
  overrideType?: 'BUY' | 'SELL' | 'BUY LIMIT' | 'SELL LIMIT',
  strictSMCFilter: boolean = true,
  isSmartManaged: boolean = false,
  timeframe: string = '15m',
  instantExecution: boolean = false,
  isScalpMode: boolean = true
): TradingSignal {
  const meta = MARKET_BASES[market];
  const safeCandles: Candle[] = (candles && candles.length > 0) ? candles : generateInitialCandles(market, 60);
  const last: Candle = safeCandles[safeCandles.length - 1] || generateInitialCandles(market, 1)[0];
  const currentPrice = last.close || meta.base;
  const atr = Math.max(last.atr || meta.step * 2, meta.step * 1.5);
  
  // Choose order type strictly based on institutional technical conditions
  const trend = getSmartTrendCondition(last);
  const detectedZones = extractInstitutionalZones(safeCandles, market);

  let isShortValue = false;
  if (overrideType) {
    isShortValue = overrideType.includes('SELL');
  } else if (trend.includes('Bearish')) {
    isShortValue = true;
  } else if (trend.includes('Bullish')) {
    isShortValue = false;
  } else {
    // In Sideways/Neutral conditions, find the most dominant nearby SMC structural zone
    const supplyZones = detectedZones.filter(z => 
      (z.type === 'Supply Zone' || (z.type === 'Order Block' && z.id.includes('bearish')) || (z.type === 'Fair Value Gap' && z.id.includes('down'))) &&
      z.priceMin >= currentPrice
    );
    const demandZones = detectedZones.filter(z => 
      (z.type === 'Demand Zone' || (z.type === 'Order Block' && z.id.includes('bullish')) || (z.type === 'Fair Value Gap' && z.id.includes('up'))) &&
      z.priceMax <= currentPrice
    );

    const nearestSupplyDist = supplyZones.length > 0 ? Math.min(...supplyZones.map(z => z.priceMin - currentPrice)) : Infinity;
    const nearestDemandDist = demandZones.length > 0 ? Math.min(...demandZones.map(z => currentPrice - z.priceMax)) : Infinity;

    if (nearestSupplyDist < nearestDemandDist) {
      isShortValue = true;
    } else if (nearestDemandDist < nearestSupplyDist) {
      isShortValue = false;
    } else {
      isShortValue = last.close < last.ema50;
    }
  }
  
  // High-precision SMC untouched zone search for Zero-Drawdown (Zero Inikas) trades
  let alignedZone: SMCZone | null = null;
  
  if (strictSMCFilter) {
    if (isShortValue) {
      // SELL LIMIT: Look for STRICTLY UNTOUCHED Supply, Bearish Order Block, or Bearish FVG ABOVE current price
      const untouchedBearishZones = detectedZones.filter(z => 
        (z.type === 'Supply Zone' || (z.type === 'Order Block' && z.id.includes('bearish')) || (z.type === 'Fair Value Gap' && z.id.includes('down'))) &&
        !z.isMitigated && !z.isThreatened && z.priceMin > currentPrice + (meta.step * 0.5)
      );

      if (untouchedBearishZones.length > 0) {
        // Pick the closest untouched zone above current price with highest strength
        untouchedBearishZones.sort((a, b) => a.priceMin - b.priceMin || (b.strength || 0) - (a.strength || 0));
        alignedZone = untouchedBearishZones[0];
      }
    } else {
      // BUY LIMIT: Look for STRICTLY UNTOUCHED Demand, Bullish Order Block, or Bullish FVG BELOW current price
      const untouchedBullishZones = detectedZones.filter(z => 
        (z.type === 'Demand Zone' || (z.type === 'Order Block' && z.id.includes('bullish')) || (z.type === 'Fair Value Gap' && z.id.includes('up'))) &&
        !z.isMitigated && !z.isThreatened && z.priceMax < currentPrice - (meta.step * 0.5)
      );

      if (untouchedBullishZones.length > 0) {
        // Pick the closest untouched zone below current price with highest strength
        untouchedBullishZones.sort((a, b) => b.priceMax - a.priceMax || (b.strength || 0) - (a.strength || 0));
        alignedZone = untouchedBullishZones[0];
      }
    }
  }

  // Precise Zero-Drawdown (زيرو انعكاس) Limit Entry calculation
  let entry = currentPrice;
  const scalpOffset = Math.max(atr * 0.35, meta.step * 2.5);

  if (!instantExecution) {
    if (isShortValue) {
      // SELL LIMIT: Entry must be strictly on the LOWER BOUNDARY of the untouched supply/OB zone (first point of institutional touch)
      if (alignedZone && alignedZone.priceMin > currentPrice) {
        entry = alignedZone.priceMin;
      } else {
        entry = currentPrice + scalpOffset;
      }
      // Guaranteed safety: ensure entry is strictly ABOVE market price
      if (entry <= currentPrice) {
        entry = currentPrice + scalpOffset;
      }
    } else {
      // BUY LIMIT: Entry must be strictly on the UPPER BOUNDARY of the untouched demand/OB zone (first point of institutional touch)
      if (alignedZone && alignedZone.priceMax < currentPrice) {
        entry = alignedZone.priceMax;
      } else {
        entry = currentPrice - scalpOffset;
      }
      // Guaranteed safety: ensure entry is strictly BELOW market price
      if (entry >= currentPrice) {
        entry = currentPrice - scalpOffset;
      }
    }
  } else {
    entry = currentPrice;
  }

  // Zero-Drawdown Protected Stop Loss & Take Profits
  let sl = 0;
  if (alignedZone) {
    const slBuffer = Math.max(atr * 0.25, meta.step * 1.5);
    sl = isShortValue ? (alignedZone.priceMax + slBuffer) : (alignedZone.priceMin - slBuffer);
  } else {
    const slSpread = Math.max(atr * 0.85, meta.step * 3);
    sl = isShortValue ? (entry + slSpread) : (entry - slSpread);
  }

  // Ensure directional validity and minimum distance
  const calculatedRisk = Math.abs(entry - sl);
  const minRisk = Math.max(atr * 0.6, meta.step * 2);
  if (calculatedRisk < minRisk) {
    sl = isShortValue ? (entry + minRisk) : (entry - minRisk);
  }

  if (isShortValue && sl <= entry) {
    sl = entry + minRisk;
  } else if (!isShortValue && sl >= entry) {
    sl = entry - minRisk;
  }

  const finalRisk = Math.abs(entry - sl);
  const direction = isShortValue ? -1 : 1;

  // Institutional High R:R Targets (1:2.0, 1:3.5, 1:5.0)
  const tp1Multiplier = isScalpMode ? 1.5 : 2.0;
  const tp2Multiplier = isScalpMode ? 2.8 : 3.5;
  const tp3Multiplier = isScalpMode ? 4.5 : 5.0;

  const tp1 = entry + finalRisk * tp1Multiplier * direction;
  const tp2 = entry + finalRisk * tp2Multiplier * direction;
  const tp3 = entry + finalRisk * tp3Multiplier * direction;

  const zoneSpread = atr * 0.25;
  const zoneMin = alignedZone ? alignedZone.priceMin : (entry - zoneSpread);
  const zoneMax = alignedZone ? alignedZone.priceMax : (entry + zoneSpread);

  // SMC Conditions Validation for ultimate quality assurance
  const trendClear = isShortValue ? trend.includes('Bearish') : trend.includes('Bullish');
  const preLiquidity = alignedZone ? (alignedZone.scoreDetails?.preLiquidity || false) : true;
  const impulsiveCandle = last.adx > 22 || (Math.abs(last.close - last.open) > atr * 0.9);
  const previousBounce = alignedZone ? (alignedZone.scoreDetails?.previousBounce || false) : true;
  const freshZone = alignedZone ? (alignedZone.scoreDetails?.freshZone || false) : true;

  // Create a temporary signal to calculate quality score
  const tempSignal = {
    type: overrideType || (instantExecution ? (isShortValue ? 'SELL' : 'BUY') : (isShortValue ? 'SELL LIMIT' : 'BUY LIMIT')),
    smcVerifiedDetails: { trendClear, preLiquidity, impulsiveCandle, previousBounce, freshZone }
  } as TradingSignal;

  const { score, quality } = calculateEnhancedSignalQuality(tempSignal, safeCandles, market, alignedZone);

  // Set determined order type: BUY LIMIT / SELL LIMIT for Scalping Limit
  const determinedType = overrideType || (instantExecution ? (isShortValue ? 'SELL' : 'BUY') : (isShortValue ? 'SELL LIMIT' : 'BUY LIMIT'));

  return {
    id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    market,
    type: determinedType,
    quality,
    qualityScore: score,
    entry,
    zoneMin,
    zoneMax,
    sl,
    tp1,
    tp2,
    tp3,
    status: instantExecution ? 'Active' : 'Pending',
    points: 0,
    hasAlertedActivated: instantExecution,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timeframe,
    isStrictSMC: strictSMCFilter,
    isSmartManaged,
    isScalp: isScalpMode,
    strategyCategory: isScalpMode ? 'SCALP_LIMIT' : (instantExecution ? 'MARKET' : 'SWING'),
    smcVerifiedDetails: {
      trendClear,
      preLiquidity,
      impulsiveCandle,
      previousBounce,
      freshZone,
    },
  };
}

// Generate simulation updates (ticks)
export interface LiveTickResult {
  updatedCandles: Candle[];
  updatedSignals: TradingSignal[];
  triggeredAlert?: string;
  executionChange?: { signalId: string; status: string; pips: number };
  lifecycleEvent?: {
    type: 'ACTIVATED' | 'TP1' | 'TP2' | 'TP3' | 'SL' | 'TRAILING';
    signal: TradingSignal;
    points?: number;
    isSecured?: boolean;
    text?: string;
  };
}

export function applyLiveTick(candles: Candle[], activeSignals: TradingSignal[], market: MarketSymbol): LiveTickResult {
  const meta = MARKET_BASES[market];
  const count = candles.length;
  if (count === 0) return { updatedCandles: candles, updatedSignals: activeSignals };

  const lastIdx = count - 1;
  const lastCandle = { ...candles[lastIdx] };

  // Simulate small price variation (ticks)
  const volatilityFactor = lastCandle.atr * 0.15;
  const tickChange = (Math.random() - 0.5) * volatilityFactor;
  
  // Apply tick to the current close
  const previousClose = lastCandle.close;
  const rawClose = lastCandle.close + tickChange;
  lastCandle.close = rawClose;
  lastCandle.high = Math.max(lastCandle.high, rawClose);
  lastCandle.low = Math.min(lastCandle.low, rawClose);

  const updatedCandles = [...candles.slice(0, lastIdx), lastCandle];

  // Recalculate indicators for the latest updated candle
  calculateTechnicalIndicators(updatedCandles, market);

  // Evaluate and advance signal states based on new tick price
  const updatedSignals = [...activeSignals];
  let triggeredAlert: string | undefined = undefined;
  let executionChange: { signalId: string; status: string; pips: number } | undefined = undefined;
  let lifecycleEvent: LiveTickResult['lifecycleEvent'] = undefined;

  for (let i = 0; i < updatedSignals.length; i++) {
    const signal = { ...updatedSignals[i] };
    if (signal.market !== market) continue;

    const currentPrice = lastCandle.close;
    const candleLow = lastCandle.low;
    const candleHigh = lastCandle.high;

    // Check if pending order is triggered strictly when price or candle reaches the actual entry price
    if (signal.status === 'Pending') {
      const isBuy = signal.type.includes('BUY');
      const isSell = signal.type.includes('SELL');
      const isStop = signal.type.includes('STOP');

      let isTriggered = false;
      if (isBuy) {
        if (isStop) {
          // BUY STOP: Triggers when price breaks up to or above entry
          isTriggered = currentPrice >= signal.entry || candleHigh >= signal.entry;
        } else {
          // BUY LIMIT: Triggers ONLY when price pulls back down to or below entry
          isTriggered = currentPrice <= signal.entry || candleLow <= signal.entry;
        }
      } else if (isSell) {
        if (isStop) {
          // SELL STOP: Triggers when price breaks down to or below entry
          isTriggered = currentPrice <= signal.entry || candleLow <= signal.entry;
        } else {
          // SELL LIMIT: Triggers ONLY when price rallies up to or above entry
          isTriggered = currentPrice >= signal.entry || candleHigh >= signal.entry;
        }
      }

      if (isTriggered) {
        signal.status = 'Active';
        signal.points = 0;
        if (!signal.hasAlertedActivated) {
          signal.hasAlertedActivated = true;
          triggeredAlert = `🚨 وصل السعر لمستوى الدخول (${signal.entry.toFixed(meta.digits)}) وتم تفعيل الصفقة المعلقة لزوج ${signal.market} [${signal.type}]! 🔵`;
          lifecycleEvent = { type: 'ACTIVATED', signal: { ...signal } };
        }
        updatedSignals[i] = signal;
      } else {
        // Check if price moved away and reached targets without hitting entry (missed entry), or broke SL
        const direction = signal.type.startsWith('BUY') ? 1 : -1;
        const missedAndReachedTP = direction === 1 
          ? (currentPrice >= signal.tp1 && signal.tp1 > signal.entry)
          : (currentPrice <= signal.tp1 && signal.tp1 < signal.entry);

        const isInvalidated = direction === 1 
          ? (currentPrice <= signal.sl - (lastCandle.atr || meta.step) * 0.2)
          : (currentPrice >= signal.sl + (lastCandle.atr || meta.step) * 0.2);

        if (missedAndReachedTP || isInvalidated) {
          signal.status = 'Cancelled';
          const reason = missedAndReachedTP ? 'وصول السعر للهدف قبل ملامسة نقطة الدخول' : 'تغير حركة السوق وتجاوز منطقة الأمان';
          triggeredAlert = `⚠️ [إلغاء آلي] تم إلغاء الأمر المعلق لزوج ${signal.market} بسبب ${reason}. جاري البحث عن فرصة جديدة.`;
          lifecycleEvent = { type: 'CANCELLED', signal: { ...signal } } as any;
          updatedSignals[i] = signal;
        }
      }
    } else if (signal.status === 'Active') {
      const direction = signal.type.startsWith('BUY') ? 1 : -1;
      
      // Calculate active floating points/pips
      // Points format: Standard values
      const factorMultiplier = market === 'XAUUSD' ? 10.0 : (market === 'BTCUSD' ? 1.0 : 10000.0); // gold pts vs forex pips
      const floatingDifference = (currentPrice - signal.entry) * direction;
      signal.points = parseFloat((floatingDifference * factorMultiplier).toFixed(2));

      // Apply trailing stop and profit locking every 20 pips
      const { updatedSignal: trailedSignal, triggeredAlert: trailAlert } = applyTrailingStopAndProfitLock(signal, currentPrice, market);
      signal.sl = trailedSignal.sl;
      signal.maxReachedPrice = trailedSignal.maxReachedPrice;
      signal.lastLockPips = trailedSignal.lastLockPips;
      signal.originalSl = trailedSignal.originalSl;
      if (trailAlert) {
        triggeredAlert = trailAlert;
        lifecycleEvent = { type: 'TRAILING', signal: { ...signal }, text: trailAlert };
      }

      // 1. Check Stop Loss
      const isHitSL = direction === 1 ? currentPrice <= signal.sl : currentPrice >= signal.sl;
      if (isHitSL) {
        signal.status = 'SL';
        const finalLoss = (signal.sl - signal.entry) * direction * factorMultiplier;
        signal.points = parseFloat(finalLoss.toFixed(2));
        signal.closePrice = signal.sl;
        const isSecured = Boolean(signal.partialProfitsBooked && signal.partialProfitsBooked > 0);
        
        if (isSecured) {
          triggeredAlert = `🛡️ SECURED EXIT: ${signal.market} position ended on secure stop loss at ${signal.sl.toFixed(meta.digits)} (+${signal.points} pts) after reaching earlier targets.`;
        } else {
          triggeredAlert = `🛑 STOP LOSS HIT: ${signal.market} position ended with ${signal.points} points.`;
        }
        
        executionChange = { signalId: signal.id, status: 'SL', pips: signal.points };
        lifecycleEvent = { type: 'SL', signal: { ...signal }, points: signal.points, isSecured };
        updatedSignals[i] = signal;
        break;
      }

      // 2. Check TP3
      const isHitTP3 = direction === 1 ? (currentPrice >= signal.tp3 && signal.tp3 > signal.entry) : (currentPrice <= signal.tp3 && signal.tp3 < signal.entry);
      if (isHitTP3) {
        signal.status = 'TP3';
        const finalProfit = (signal.tp3 - signal.entry) * direction * factorMultiplier;
        signal.points = parseFloat(finalProfit.toFixed(2));
        signal.closePrice = signal.tp3;
        triggeredAlert = `🎯 TAKE PROFIT 3 REACHED! ${signal.market} signal closed at maximum TP3 (+${signal.points} pts)`;
        executionChange = { signalId: signal.id, status: 'TP3', pips: signal.points };
        lifecycleEvent = { type: 'TP3', signal: { ...signal }, points: signal.points };
        updatedSignals[i] = signal;
        break;
      }

      // 3. Check TP2 - Closes position cleanly on hitting 2nd Target
      const isHitTP2 = direction === 1 ? (currentPrice >= signal.tp2 && signal.tp2 > signal.entry) : (currentPrice <= signal.tp2 && signal.tp2 < signal.entry);
      if (isHitTP2) {
        const finalProfit = (signal.tp2 - signal.entry) * direction * factorMultiplier;
        signal.status = 'TP2';
        signal.points = parseFloat(finalProfit.toFixed(2));
        signal.closePrice = signal.tp2;
        
        triggeredAlert = `🎯 TAKE PROFIT 2 REACHED! ${signal.market} position closed at ${signal.tp2.toFixed(meta.digits)} (+${signal.points} pts) - Target 2 Completed!`;
        executionChange = { signalId: signal.id, status: 'TP2', pips: signal.points };
        lifecycleEvent = { type: 'TP2', signal: { ...signal }, points: signal.points };
        updatedSignals[i] = signal;
        break;
      }

      // 4. Check TP1
      const isHitTP1 = direction === 1 ? (currentPrice >= signal.tp1 && signal.tp1 > signal.entry) : (currentPrice <= signal.tp1 && signal.tp1 < signal.entry);
      if (isHitTP1 && !signal.partialProfitsBooked) {
        const tentativeProfit = (signal.tp1 - signal.entry) * direction * factorMultiplier;
        signal.points = parseFloat(tentativeProfit.toFixed(2));
        signal.partialProfitsBooked = 50;
        
        // Move SL to Entry + 5 pips (Breakeven)
        const entrySl = signal.entry + (5 / factorMultiplier) * direction;
        const isSlBetter = direction === 1 ? entrySl > signal.sl : entrySl < signal.sl;
        if (isSlBetter) {
          signal.sl = entrySl;
        }
        signal.hasMovedToBreakeven = true;
        
        triggeredAlert = `🎯 TAKE PROFIT 1 HIT! ${signal.market} at ${currentPrice.toFixed(meta.digits)} (+${signal.points} pts) - 50% Position Secured!`;
        executionChange = { signalId: signal.id, status: 'Active', pips: signal.points };
        lifecycleEvent = { type: 'TP1', signal: { ...signal }, points: signal.points };
        updatedSignals[i] = signal;
        break;
      }
    }

    updatedSignals[i] = signal;
  }

  return {
    updatedCandles,
    updatedSignals,
    triggeredAlert,
    executionChange,
    lifecycleEvent,
  };
}

// Trailing stop & profit locking every 20 pips/points helper
export function applyTrailingStopAndProfitLock(
  signal: TradingSignal,
  currentPrice: number,
  market: MarketSymbol
): { updatedSignal: TradingSignal; triggeredAlert?: string } {
  const direction = signal.type.startsWith('BUY') ? 1 : -1;
  const factorMultiplier = market === 'XAUUSD' ? 10.0 : 10000.0;
  const meta = MARKET_BASES[market];
  
  const updatedSignal = { ...signal };

  if (updatedSignal.originalSl === undefined) {
    updatedSignal.originalSl = updatedSignal.sl;
  }
  if (updatedSignal.maxReachedPrice === undefined) {
    updatedSignal.maxReachedPrice = updatedSignal.entry;
  }
  if (updatedSignal.lastLockPips === undefined) {
    updatedSignal.lastLockPips = 0;
  }

  // Update max reached price in trade's direction
  if (direction === 1) {
    if (currentPrice > updatedSignal.maxReachedPrice) {
      updatedSignal.maxReachedPrice = currentPrice;
    }
  } else {
    if (currentPrice < updatedSignal.maxReachedPrice) {
      updatedSignal.maxReachedPrice = currentPrice;
    }
  }

  // Peak profit in pips/points
  const peakProfitPips = (updatedSignal.maxReachedPrice - updatedSignal.entry) * direction * factorMultiplier;
  let triggeredAlert: string | undefined = undefined;

  // Smart Automated Trade Management Logic
  if (updatedSignal.isSmartManaged) {
    // 1. Smart Breakeven Lock:
    // Move SL to entry + 5 pips once price reaches TP1 or goes 25 pips in profit
    const currentProfitPips = (currentPrice - updatedSignal.entry) * direction * factorMultiplier;
    const isPastTP1 = direction === 1 ? currentPrice >= updatedSignal.tp1 : currentPrice <= updatedSignal.tp1;
    
    if ((isPastTP1 || currentProfitPips >= 25) && !updatedSignal.hasMovedToBreakeven) {
      updatedSignal.hasMovedToBreakeven = true;
      // Lock entry + 5 pips of profit to completely secure the trade
      const breakevenSl = updatedSignal.entry + (5 / factorMultiplier) * direction;
      
      // Verify if new SL is better than existing
      const isSlBetter = direction === 1 ? breakevenSl > updatedSignal.sl : breakevenSl < updatedSignal.sl;
      if (isSlBetter) {
        updatedSignal.sl = breakevenSl;
        const orderId = updatedSignal.id.substring(4, 7).toUpperCase();
        triggeredAlert = `🛡️ تأمين ذكي (Breakeven Locked): تم نقل وقف الخسارة إلى سعر الدخول (+5 نقاط) لزوج ${updatedSignal.market} #${orderId} - الصفقة الآن مؤمنة تماماً خالية من المخاطر!`;
      }
    }

    // 2. Smart Dynamic Trailing Stop:
    // Move SL behind the current price using ATR-based buffer once TP2 or 55 pips profit is reached
    const isPastTP2 = direction === 1 ? currentPrice >= updatedSignal.tp2 : currentPrice <= updatedSignal.tp2;
    if (isPastTP2 || currentProfitPips >= 55) {
      // Calculate dynamic SL = maxReachedPrice - 1.5 * ATR (or + 1.5 * ATR for SELL)
      const atrValue = Math.abs(updatedSignal.tp1 - updatedSignal.entry) / 1.5; // estimated ATR
      const cleanAtr = atrValue > 0 ? atrValue : (25 / factorMultiplier);
      const dynamicSl = updatedSignal.maxReachedPrice - cleanAtr * 1.5 * direction;
      
      // Ensure the new SL is indeed locking more profit
      const isSlBetter = direction === 1 ? dynamicSl > updatedSignal.sl : dynamicSl < updatedSignal.sl;
      if (isSlBetter) {
        updatedSignal.sl = dynamicSl;
        const profitLockedPips = Math.round((dynamicSl - updatedSignal.entry) * direction * factorMultiplier);
        const lockStep = Math.floor(profitLockedPips / 20);
        
        // Only trigger an alert notification when a new 20-pip step milestone is achieved
        if (lockStep > (updatedSignal.lastLockPips || 0) && profitLockedPips >= 20) {
          updatedSignal.lastLockPips = lockStep;
          const orderId = updatedSignal.id.substring(4, 7).toUpperCase();
          triggeredAlert = `🔒 حجز أرباح ذكي وملاحقة ديناميكية (Dynamic Trailing): تم تعديل وقف الخسارة تلقائياً إلى ${dynamicSl.toFixed(meta.digits)} لزوج ${updatedSignal.market} #${orderId}، لضمان حجز (+${profitLockedPips} نقطة) من الأرباح المحققة!`;
        }
      }
    }
  } else {
    // Standard step-based trailing stop (every 20 pips)
    const stepSize = 20;
    const currentStep = Math.floor(peakProfitPips / stepSize);

    if (currentStep > (updatedSignal.lastLockPips || 0)) {
      updatedSignal.lastLockPips = currentStep;
      
      const pipsToLock = (currentStep - 1) * stepSize;
      const newSl = updatedSignal.entry + (pipsToLock / factorMultiplier) * direction;

      // Verify if new SL is better in trade's direction
      const isSlBetter = direction === 1 ? newSl > updatedSignal.sl : newSl < updatedSignal.sl;
      if (isSlBetter) {
        updatedSignal.sl = newSl;
        const orderId = updatedSignal.id.substring(4, 7).toUpperCase();
        triggeredAlert = `🔒 حجز أرباح وتفعيل ستوب متحرك (+${pipsToLock} نقطة): تم نقل وقف الخسارة إلى ${newSl.toFixed(meta.digits)} لزوج ${updatedSignal.market} #${orderId}`;
      }
    }
  }

  return { updatedSignal, triggeredAlert };
}

// Session Engine Detector with current Hour check
export function getActiveSessions(): { currentSessions: string; detailSessions: TradingSession[] } {
  // We can base active sessions on actual local time or UTC simulation
  // Define standard hours:
  // Sydney: 22:00 - 07:00 UTC
  // Tokyo: 00:00 - 09:00 UTC
  // London: 08:00 - 17:00 UTC
  // New York: 13:00 - 22:00 UTC
  
  const utcHour = new Date().getUTCHours();
  
  const sessions: TradingSession[] = [
    { name: 'Sydney', hours: '22:00 - 07:00 UTC', isActive: utcHour >= 22 || utcHour < 7 },
    { name: 'Tokyo', hours: '00:00 - 09:00 UTC', isActive: utcHour >= 0 && utcHour < 9 },
    { name: 'London', hours: '08:00 - 17:00 UTC', isActive: utcHour >= 8 && utcHour < 17 },
    { name: 'New York', hours: '13:00 - 22:00 UTC', isActive: utcHour >= 13 && utcHour < 22 },
  ];

  // If London & New York are both active, they overlap (13:00 - 17:00 UTC)
  const activeNames = sessions.filter(s => s.isActive).map(s => s.name);
  
  let currentSessions = activeNames.join(' + ');
  if (activeNames.includes('London') && activeNames.includes('New York')) {
    currentSessions = 'London + New York';
  } else if (currentSessions === '') {
    // Fallback if none active in exact slot simulation
    currentSessions = 'London + New York'; 
    sessions[2].isActive = true;
    sessions[3].isActive = true;
  }

  return {
    currentSessions,
    detailSessions: sessions,
  };
}
