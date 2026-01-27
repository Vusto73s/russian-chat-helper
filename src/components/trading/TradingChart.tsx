import { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, CandlestickData, Time, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { useBybitCandles } from '@/hooks/useBybitData';
import { ChartSettings, TIMEFRAME_LABELS, Timeframe, CandleType } from '@/types/trading';
import { convertToHeikinAshi } from '@/utils/heikinAshi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  chartIndex: number;
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
}

export function TradingChart({ symbol, chartIndex, settings, onSettingsChange }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  const { candles, loading } = useBybitCandles(symbol, settings.timeframe);

  const displayCandles = useMemo(() => {
    if (settings.candleType === 'heikinashi') {
      return convertToHeikinAshi(candles);
    }
    return candles;
  }, [candles, settings.candleType]);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(210, 40%, 70%)',
      },
      grid: {
        vertLines: { color: 'hsl(220, 20%, 18%)' },
        horzLines: { color: 'hsl(220, 20%, 18%)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'hsl(220, 20%, 20%)',
      },
      timeScale: {
        borderColor: 'hsl(220, 20%, 20%)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142, 76%, 36%)',
      downColor: 'hsl(0, 84%, 60%)',
      borderUpColor: 'hsl(142, 76%, 36%)',
      borderDownColor: 'hsl(0, 84%, 60%)',
      wickUpColor: 'hsl(142, 76%, 36%)',
      wickDownColor: 'hsl(0, 84%, 60%)',
    });

    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || displayCandles.length === 0) return;

    const chartData: CandlestickData<Time>[] = displayCandles.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [displayCandles]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {symbol.replace('USDT', '/USDT')}
          </span>
          <span className="text-xs text-muted-foreground">
            График {chartIndex + 1}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={settings.timeframe}
            onValueChange={(value: Timeframe) =>
              onSettingsChange({ ...settings, timeframe: value })
            }
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={settings.candleType}
            onValueChange={(value: CandleType) =>
              onSettingsChange({ ...settings, candleType: value })
            }
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="japanese" className="text-xs">
                Японские
              </SelectItem>
              <SelectItem value="heikinashi" className="text-xs">
                Heikin Ashi
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
