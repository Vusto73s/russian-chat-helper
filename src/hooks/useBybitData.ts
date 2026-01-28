import { useState, useEffect, useCallback } from 'react';
import { TradingPair, Candle, Timeframe } from '@/types/trading';

const BYBIT_API = 'https://api.bybit.com';

export function useBybitPairs() {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = useCallback(async () => {
    try {
      const response = await fetch(`${BYBIT_API}/v5/market/tickers?category=linear`);
      const data = await response.json();
      
      if (data.retCode === 0) {
        const usdtPairs = data.result.list
          .filter((item: any) => item.symbol.endsWith('USDT'))
          .sort((a: any, b: any) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
          .slice(0, 50)
          .map((item: any) => ({
            symbol: item.symbol,
            lastPrice: item.lastPrice,
            price24hPcnt: item.price24hPcnt,
            volume24h: item.volume24h,
          }));
        setPairs(usdtPairs);
        setError(null);
      } else {
        setError(data.retMsg);
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPairs();
    const interval = setInterval(fetchPairs, 10000);
    return () => clearInterval(interval);
  }, [fetchPairs]);

  return { pairs, loading, error, refetch: fetchPairs };
}

export function useBybitCandles(symbol: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandles = useCallback(async (isInitial = false) => {
    if (!symbol) return;
    
    try {
      if (isInitial) setLoading(true);
      const response = await fetch(
        `${BYBIT_API}/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=200`
      );
      const data = await response.json();
      
      if (data.retCode === 0) {
        const candleData = data.result.list
          .map((item: string[]) => ({
            time: Math.floor(parseInt(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
          }))
          .reverse();
        setCandles(candleData);
        setError(null);
      } else {
        setError(data.retMsg);
      }
    } catch (err) {
      setError('Ошибка загрузки свечей');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchCandles(true);
    const interval = setInterval(() => fetchCandles(false), 10000);
    return () => clearInterval(interval);
  }, [fetchCandles]);

  return { candles, loading, error, refetch: fetchCandles };
}
