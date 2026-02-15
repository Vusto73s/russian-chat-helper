import { Candle } from '@/types/trading';

export function convertToHeikinAshi(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];

  const heikinAshi: Candle[] = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    
    if (i === 0) {
      // Первая свеча HA
      const haClose = (current.open + current.high + current.low + current.close) / 4;
      const haOpen = (current.open + current.close) / 2;
      const haHigh = Math.max(current.high, haOpen, haClose);
      const haLow = Math.min(current.low, haOpen, haClose);
      
      heikinAshi.push({
        time: current.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: current.volume,
      });
    } else {
      const prev = heikinAshi[i - 1];
      const haClose = (current.open + current.high + current.low + current.close) / 4;
      const haOpen = (prev.open + prev.close) / 2;
      const haHigh = Math.max(current.high, haOpen, haClose);
      const haLow = Math.min(current.low, haOpen, haClose);
      
      heikinAshi.push({
        time: current.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: current.volume,
      });
    }
  }

  return heikinAshi;
}
