import { useState, useEffect, useCallback, useRef } from 'react';
import { Candle } from '@/types/trading';
import { detectHAReversal, HASignal, PatternDirection } from '@/utils/haPatterns';
import { toast } from '@/hooks/use-toast';

const BYBIT_API = 'https://api.bybit.com';
const SCAN_INTERVAL = 10_000; // check every 10 seconds if it's time to scan
const CANDLE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
const PRE_CLOSE_WINDOW_MS = 60 * 1000; // scan within last 1 minute before candle close
const SIGNAL_DURATION = 10 * 60 * 1000; // 10 minutes display

// Soft chime sound using Web Audio API
function playAlertSound(direction: PatternDirection) {
  try {
    const ctx = new AudioContext();

    // Use a soft triangle wave for a gentle chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    const baseFreq = direction === 'bullish' ? 523 : 440; // C5 or A4
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    // Gentle fade in/out
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);

    // Second soft note after a pause
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = 'triangle';
      const freq2 = direction === 'bullish' ? 659 : 392; // E5 or G4
      osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.8);
    }, 500);
  } catch (e) {
    console.warn('Could not play alert sound:', e);
  }
}

async function fetchCandles15m(symbol: string): Promise<Candle[]> {
  try {
    const response = await fetch(
      `${BYBIT_API}/v5/market/kline?category=linear&symbol=${symbol}&interval=15&limit=10`
    );
    const data = await response.json();
    
    if (data.retCode === 0) {
      return data.result.list
        .map((item: string[]) => ({
          time: Math.floor(parseInt(item[0]) / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        }))
        .reverse();
    }
  } catch (e) {
    console.warn(`Failed to fetch candles for ${symbol}:`, e);
  }
  return [];
}

export function useHAScanner(watchlist: string[], enabled: boolean = true) {
  const [signals, setSignals] = useState<HASignal[]>([]);
  // Track which symbol+candle_time combos we already alerted on
  const alertedRef = useRef<Set<string>>(new Set());

  // Clean up expired signals
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSignals(prev => prev.filter(s => s.expiresAt > now));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const scan = useCallback(async () => {
    if (!enabled || watchlist.length === 0) return;

    // Only scan within 1 minute before 15m candle close
    const now = Date.now();
    const timeInCandle = now % CANDLE_PERIOD_MS;
    const timeUntilClose = CANDLE_PERIOD_MS - timeInCandle;
    
    if (timeUntilClose > PRE_CLOSE_WINDOW_MS) return; // not yet time to scan

    // Scan each symbol sequentially with small delay to avoid rate limiting
    for (const symbol of watchlist) {
      const candles = await fetchCandles15m(symbol);
      if (candles.length < 5) continue;

      const direction = detectHAReversal(candles);
      if (!direction) continue;

      // Use the last candle's time as unique key to avoid duplicate alerts
      const lastCandleTime = candles[candles.length - 1].time;
      const alertKey = `${symbol}_${lastCandleTime}_${direction}`;

      if (alertedRef.current.has(alertKey)) continue;
      alertedRef.current.add(alertKey);

      // Create signal
      const signal: HASignal = {
        symbol,
        direction,
        timestamp: now,
        expiresAt: now + SIGNAL_DURATION,
      };

      setSignals(prev => {
        // Replace existing signal for same symbol or add new
        const filtered = prev.filter(s => s.symbol !== symbol);
        return [...filtered, signal];
      });

      // Sound alert
      playAlertSound(direction);

      // Toast notification
      const dirLabel = direction === 'bullish' ? '🟢 Разворот ВВЕРХ' : '🔴 Разворот ВНИЗ';
      toast({
        title: `${dirLabel}`,
        description: `${symbol.replace('USDT', '/USDT')} — HA 15м паттерн`,
        duration: Infinity, // Force manual close
      });

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    // Clean old alert keys (older than 30 min)
    if (alertedRef.current.size > 500) {
      alertedRef.current.clear();
    }
  }, [watchlist, enabled]);

  // Run scanner on interval
  useEffect(() => {
    if (!enabled) return;
    
    // Initial scan after short delay
    const timeout = setTimeout(scan, 3000);
    const interval = setInterval(scan, SCAN_INTERVAL);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [scan, enabled]);

  // Get signal for a specific symbol
  const getSignal = useCallback((symbol: string): HASignal | undefined => {
    return signals.find(s => s.symbol === symbol && s.expiresAt > Date.now());
  }, [signals]);

  return { signals, getSignal };
}
