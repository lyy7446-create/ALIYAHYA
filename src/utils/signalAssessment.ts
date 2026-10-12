import { TradingSignal, MarketSymbol, Candle, SMCZone } from '../types';
import { getMtfScannerResults } from './marketEngine';

export function calculateEnhancedSignalQuality(
  signal: TradingSignal,
  candles: Candle[],
  market: MarketSymbol,
  zone: SMCZone | null
): { score: number; quality: 'A+' | 'A' | 'B+' | 'B' | 'C' } {
  let score = 70; // Base score

  // 1. Existing SMC Criteria (from smcVerifiedDetails)
  if (signal.smcVerifiedDetails?.trendClear) score += 10;
  if (signal.smcVerifiedDetails?.preLiquidity) score += 5;
  if (signal.smcVerifiedDetails?.impulsiveCandle) score += 5;
  if (signal.smcVerifiedDetails?.previousBounce) score += 5;
  if (signal.smcVerifiedDetails?.freshZone) score += 5;

  // 2. MTF Alignment (New)
  const mtfResults = getMtfScannerResults(market);
  const timeframeResults = Object.values(mtfResults);
  const bullishCount = timeframeResults.filter(r => r.includes('Up')).length;
  const bearishCount = timeframeResults.filter(r => r.includes('Down')).length;
  
  if (signal.type.includes('BUY') && bullishCount > 3) score += 10;
  if (signal.type.includes('SELL') && bearishCount > 3) score += 10;

  // 3. Volatility Check
  const lastCandle = candles[candles.length - 1];
  if (lastCandle && lastCandle.adx > 30) score += 5;

  score = Math.min(100, Math.max(50, score));

  let quality: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'B';
  if (score >= 90) quality = 'A+';
  else if (score >= 80) quality = 'A';
  else if (score >= 70) quality = 'B+';
  else if (score >= 60) quality = 'B';
  else quality = 'C';

  return { score, quality };
}
