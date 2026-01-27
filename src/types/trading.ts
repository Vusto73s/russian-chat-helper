export interface TradingPair {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  volume24h: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type Timeframe = '1' | '5' | '15' | '60' | '240' | 'D';

export type CandleType = 'japanese' | 'heikinashi';

export interface ChartSettings {
  timeframe: Timeframe;
  candleType: CandleType;
}

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  'D': '1D',
};
