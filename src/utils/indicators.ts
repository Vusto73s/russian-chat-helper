import { Candle } from '@/types/trading';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsPoint {
  time: number;
  middle: number;
  upper: number;
  lower: number;
}

export interface StochasticPoint {
  time: number;
  k: number;
  d: number;
}

export interface ATRPercentPoint {
  time: number;
  value: number;
  color: string; // Dynamic color based on volatility level
}

// Simple Moving Average
export function calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }
  
  return result;
}

// Exponential Moving Average
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;
  result.push({ time: candles[period - 1].time, value: ema });
  
  // Calculate EMA for rest
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({ time: candles[i].time, value: ema });
  }
  
  return result;
}

// RSI (Relative Strength Index)
export function calculateRSI(candles: Candle[], period: number = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  
  if (candles.length < period + 1) return result;
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // First average
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate RSI
  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    }
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({
      time: candles[i].time,
      value: rsi,
    });
  }
  
  return result;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDPoint[] {
  const result: MACDPoint[] = [];
  
  if (candles.length < slowPeriod + signalPeriod) return result;
  
  // Calculate EMAs
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);
  
  // Align EMAs by time
  const macdLine: IndicatorPoint[] = [];
  const slowStart = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + slowStart;
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }
  
  // Calculate signal line (EMA of MACD)
  if (macdLine.length < signalPeriod) return result;
  
  const multiplier = 2 / (signalPeriod + 1);
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalSum += macdLine[i].value;
  }
  let signal = signalSum / signalPeriod;
  
  result.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal: signal,
    histogram: macdLine[signalPeriod - 1].value - signal,
  });
  
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = (macdLine[i].value - signal) * multiplier + signal;
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: signal,
      histogram: macdLine[i].value - signal,
    });
  }
  
  return result;
}

// Bollinger Bands
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];
  
  if (candles.length < period) return result;
  
  for (let i = period - 1; i < candles.length; i++) {
    // Calculate SMA (middle band)
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const middle = sum / period;
    
    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - middle;
      sumSquaredDiff += diff * diff;
    }
    const std = Math.sqrt(sumSquaredDiff / period);
    
    result.push({
      time: candles[i].time,
      middle,
      upper: middle + stdDev * std,
      lower: middle - stdDev * std,
    });
  }
  
  return result;
}

// Stochastic Oscillator
export function calculateStochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smooth: number = 3
): StochasticPoint[] {
  const result: StochasticPoint[] = [];
  
  if (candles.length < kPeriod + dPeriod + smooth - 2) return result;
  
  // Calculate raw %K values
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, candles[i - j].high);
      lowestLow = Math.min(lowestLow, candles[i - j].low);
    }
    
    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
    rawK.push(k);
  }
  
  // Smooth %K with SMA (this becomes the final %K)
  const smoothedK: number[] = [];
  for (let i = smooth - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = 0; j < smooth; j++) {
      sum += rawK[i - j];
    }
    smoothedK.push(sum / smooth);
  }
  
  // Calculate %D as SMA of smoothed %K
  for (let i = dPeriod - 1; i < smoothedK.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += smoothedK[i - j];
    }
    const d = sum / dPeriod;
    
    // Calculate the time index
    const timeIndex = kPeriod - 1 + smooth - 1 + i;
    
    result.push({
      time: candles[timeIndex].time,
      k: smoothedK[i],
      d,
    });
  }
  
  return result;
}

// ATR Percent - Average True Range as percentage of price
export function calculateATRPercent(
  candles: Candle[],
  period: number = 14,
  lowThreshold: number = 0.5,
  mediumThreshold: number = 1.5,
  highThreshold: number = 3
): ATRPercentPoint[] {
  const result: ATRPercentPoint[] = [];
  
  if (candles.length < period + 1) return result;
  
  // Calculate True Range for each candle
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    // True Range = max(high - low, |high - prevClose|, |low - prevClose|)
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Calculate first ATR as simple average
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Helper function to get color based on ATR%
  const getColor = (atrPercent: number): string => {
    if (atrPercent < lowThreshold) return '#22C55E';      // Green - low volatility
    if (atrPercent < mediumThreshold) return '#EAB308';   // Yellow - medium volatility
    if (atrPercent < highThreshold) return '#F97316';     // Orange - high volatility
    return '#EF4444';                                      // Red - very high volatility
  };
  
  // Calculate ATR% for first point
  const firstAtrPercent = (atr / candles[period].close) * 100;
  result.push({
    time: candles[period].time,
    value: firstAtrPercent,
    color: getColor(firstAtrPercent),
  });
  
  // Calculate rest using Wilder's smoothing (RMA)
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    const atrPercent = (atr / candles[i + 1].close) * 100;
    
    result.push({
      time: candles[i + 1].time,
      value: atrPercent,
      color: getColor(atrPercent),
    });
  }
  
  return result;
}
