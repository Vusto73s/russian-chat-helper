import { Candle } from '@/types/trading';
import { convertToHeikinAshi } from './heikinAshi';

export type PatternDirection = 'bullish' | 'bearish';

export interface HASignal {
  symbol: string;
  direction: PatternDirection;
  timestamp: number; // when signal was detected
  expiresAt: number; // when to hide from watchlist (10 min)
}

/**
 * Detect Heikin Ashi reversal patterns:
 * - Bullish: 3 red HA candles followed by a closed green candle
 * - Bearish: 3 green HA candles followed by a closed red candle
 * 
 * We check the last 4 closed candles (ignore the current forming candle).
 */
export function detectHAReversal(candles: Candle[]): PatternDirection | null {
  if (candles.length < 5) return null;

  const haCandles = convertToHeikinAshi(candles);

  // Last closed candle is second-to-last (last one may still be forming)
  // Actually with API data all candles are closed except possibly the last
  // We'll check the last 4 candles
  const len = haCandles.length;
  const c4 = haCandles[len - 1]; // most recent closed
  const c3 = haCandles[len - 2];
  const c2 = haCandles[len - 3];
  const c1 = haCandles[len - 4];

  const isGreen = (c: Candle) => c.close > c.open;
  const isRed = (c: Candle) => c.close < c.open;

  // Bullish: 3 red then 1 green
  if (isRed(c1) && isRed(c2) && isRed(c3) && isGreen(c4)) {
    return 'bullish';
  }

  // Bearish: 3 green then 1 red
  if (isGreen(c1) && isGreen(c2) && isGreen(c3) && isRed(c4)) {
    return 'bearish';
  }

  return null;
}
