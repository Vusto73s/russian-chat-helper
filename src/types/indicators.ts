// Indicator type definitions

export type OverlayIndicatorType = 'sma' | 'ema' | 'bb';
export type PaneIndicatorType = 'rsi' | 'macd' | 'stochastic' | 'atr' | 'volume';
export type IndicatorType = OverlayIndicatorType | PaneIndicatorType;

// Base configuration
interface BaseIndicatorConfig {
  id: string; // Unique instance ID
  enabled: boolean;
  color: string;
}

// SMA Configuration
export interface SMAConfig extends BaseIndicatorConfig {
  type: 'sma';
  period: number;
  lineStyle: 'solid' | 'stepped';
}

// EMA Configuration
export interface EMAConfig extends BaseIndicatorConfig {
  type: 'ema';
  period: number;
}

// Bollinger Bands Configuration
export interface BBConfig extends BaseIndicatorConfig {
  type: 'bb';
  period: number;
  stdDev: number;
  bandColor: string; // Color for upper/lower bands
}

// RSI Configuration
export interface RSIConfig extends BaseIndicatorConfig {
  type: 'rsi';
  period: number;
  overbought: number;
  oversold: number;
}

// MACD Configuration
export interface MACDConfig extends BaseIndicatorConfig {
  type: 'macd';
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  signalColor: string;
  histogramUpColor: string;
  histogramDownColor: string;
}

// Stochastic Configuration
export interface StochasticConfig extends BaseIndicatorConfig {
  type: 'stochastic';
  kPeriod: number;
  dPeriod: number;
  smooth: number;
  dColor: string;
  overbought: number;
  oversold: number;
}

// ATR Percent Configuration
export interface ATRConfig extends BaseIndicatorConfig {
  type: 'atr';
  period: number;
  // Volatility thresholds for color coding
  lowThreshold: number;    // Below this = green (low volatility)
  mediumThreshold: number; // Below this = yellow
  highThreshold: number;   // Below this = orange, above = red
}

// Volume Configuration
export interface VolumeConfig extends BaseIndicatorConfig {
  type: 'volume';
  upColor: string;
  downColor: string;
}

// Union type for all indicator configs
export type IndicatorConfig = 
  | SMAConfig 
  | EMAConfig 
  | BBConfig 
  | RSIConfig 
  | MACDConfig 
  | StochasticConfig
  | ATRConfig
  | VolumeConfig;

// Helper to check if indicator is overlay (on main chart)
export function isOverlayIndicator(type: IndicatorType): type is OverlayIndicatorType {
  return type === 'sma' || type === 'ema' || type === 'bb';
}

// Default configurations for each indicator type
export const DEFAULT_INDICATOR_CONFIGS: Record<IndicatorType, () => IndicatorConfig> = {
  sma: () => ({
    id: crypto.randomUUID(),
    type: 'sma',
    enabled: true,
    period: 20,
    color: '#FFD700',
    lineStyle: 'stepped',
  }),
  ema: () => ({
    id: crypto.randomUUID(),
    type: 'ema',
    enabled: true,
    period: 12,
    color: '#00BFFF',
  }),
  bb: () => ({
    id: crypto.randomUUID(),
    type: 'bb',
    enabled: true,
    period: 20,
    stdDev: 2,
    color: '#FF6B6B',
    bandColor: 'rgba(255, 107, 107, 0.3)',
  }),
  rsi: () => ({
    id: crypto.randomUUID(),
    type: 'rsi',
    enabled: true,
    period: 14,
    color: '#9B59B6',
    overbought: 70,
    oversold: 30,
  }),
  macd: () => ({
    id: crypto.randomUUID(),
    type: 'macd',
    enabled: true,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    color: '#3498DB',
    signalColor: '#E74C3C',
    histogramUpColor: 'rgba(38, 166, 154, 0.6)',
    histogramDownColor: 'rgba(239, 83, 80, 0.6)',
  }),
  stochastic: () => ({
    id: crypto.randomUUID(),
    type: 'stochastic',
    enabled: true,
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
    color: '#2ECC71',
    dColor: '#E74C3C',
    overbought: 80,
    oversold: 20,
  }),
  atr: () => ({
    id: crypto.randomUUID(),
    type: 'atr',
    enabled: true,
    period: 14,
    color: '#2ECC71',
    lowThreshold: 0.5,
    mediumThreshold: 1.5,
    highThreshold: 3,
  }),
  volume: () => ({
    id: crypto.randomUUID(),
    type: 'volume',
    enabled: true,
    color: '#26A69A',
    upColor: 'rgba(38, 166, 154, 0.5)',
    downColor: 'rgba(239, 83, 80, 0.5)',
  }),
};

// Indicator display names
export const INDICATOR_LABELS: Record<IndicatorType, string> = {
  sma: 'SMA (Simple Moving Average)',
  ema: 'EMA (Exponential Moving Average)',
  bb: 'Bollinger Bands',
  rsi: 'RSI (Relative Strength Index)',
  macd: 'MACD',
  stochastic: 'Stochastic Oscillator',
  atr: 'ATR % (Average True Range)',
  volume: 'Volume (Объём)',
};

// Short labels for display
export const INDICATOR_SHORT_LABELS: Record<IndicatorType, string> = {
  sma: 'SMA',
  ema: 'EMA',
  bb: 'BB',
  rsi: 'RSI',
  macd: 'MACD',
  stochastic: 'Stoch',
  atr: 'ATR%',
  volume: 'Vol',
};

// Maximum instances per indicator type
export const MAX_INDICATOR_INSTANCES = 3;
