import { useEffect, useRef, useMemo } from 'react';
import { 
  createChart, 
  IChartApi, 
  CandlestickData, 
  Time, 
  ISeriesApi, 
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineData,
  HistogramData,
  LineStyle
} from 'lightweight-charts';
import { useBybitCandles } from '@/hooks/useBybitData';
import { ChartSettings, TIMEFRAME_LABELS, Timeframe, CandleType } from '@/types/trading';
import { convertToHeikinAshi } from '@/utils/heikinAshi';
import { calculateSMA, calculateRSI, calculateMACD } from '@/utils/indicators';
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
  const sma3Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const isFirstLoadRef = useRef(true);
  
  const { candles, loading } = useBybitCandles(symbol, settings.timeframe);

  const displayCandles = useMemo(() => {
    if (settings.candleType === 'heikinashi') {
      return convertToHeikinAshi(candles);
    }
    return candles;
  }, [candles, settings.candleType]);

  // Calculate indicators
  const indicators = useMemo(() => {
    if (candles.length === 0) return { sma3: [], sma20: [], rsi: [], macd: [] };
    
    return {
      sma3: calculateSMA(candles, 3),
      sma20: calculateSMA(candles, 20),
      rsi: calculateRSI(candles, 14),
      macd: calculateMACD(candles, 12, 26, 9),
    };
  }, [candles]);

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

    // Candlestick series - leave room at bottom for indicators
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142, 76%, 36%)',
      downColor: 'hsl(0, 84%, 60%)',
      borderUpColor: 'hsl(142, 76%, 36%)',
      borderDownColor: 'hsl(0, 84%, 60%)',
      wickUpColor: 'hsl(142, 76%, 36%)',
      wickDownColor: 'hsl(0, 84%, 60%)',
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.35 },
    });
    seriesRef.current = candleSeries;

    // SMA 3 - White stepped line (same scale as candles)
    const sma3Series = chart.addSeries(LineSeries, {
      color: '#FFFFFF',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      lineType: 1, // Stepped line
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma3Ref.current = sma3Series;

    // SMA 20 - Yellow stepped line
    const sma20Series = chart.addSeries(LineSeries, {
      color: '#FFD700',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      lineType: 1, // Stepped line
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma20Ref.current = sma20Series;

    // RSI Pane - positioned below main chart
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#9B59B6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      priceScaleId: 'rsi',
    });
    rsiSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.68, bottom: 0.18 },
      borderVisible: false,
    });
    rsiRef.current = rsiSeries;

    // MACD Pane
    const macdLineSeries = chart.addSeries(LineSeries, {
      color: '#3498DB',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    macdLineRef.current = macdLineSeries;

    const macdSignalSeries = chart.addSeries(LineSeries, {
      color: '#E74C3C',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    macdSignalRef.current = macdSignalSeries;

    const macdHistogramSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    macdHistogramSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0.02 },
      borderVisible: false,
    });
    macdHistogramRef.current = macdHistogramSeries;

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
      sma3Ref.current = null;
      sma20Ref.current = null;
      rsiRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistogramRef.current = null;
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || displayCandles.length === 0) return;

    // Candlestick data
    const chartData: CandlestickData<Time>[] = displayCandles.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    seriesRef.current.setData(chartData);

    // SMA data
    if (sma3Ref.current && indicators.sma3.length > 0) {
      const sma3Data: LineData<Time>[] = indicators.sma3.map((point) => ({
        time: point.time as Time,
        value: point.value,
      }));
      sma3Ref.current.setData(sma3Data);
    }

    if (sma20Ref.current && indicators.sma20.length > 0) {
      const sma20Data: LineData<Time>[] = indicators.sma20.map((point) => ({
        time: point.time as Time,
        value: point.value,
      }));
      sma20Ref.current.setData(sma20Data);
    }

    // RSI data
    if (rsiRef.current && indicators.rsi.length > 0) {
      const rsiData: LineData<Time>[] = indicators.rsi.map((point) => ({
        time: point.time as Time,
        value: point.value,
      }));
      rsiRef.current.setData(rsiData);
    }

    // MACD data
    if (macdLineRef.current && macdSignalRef.current && macdHistogramRef.current && indicators.macd.length > 0) {
      const macdLineData: LineData<Time>[] = indicators.macd.map((point) => ({
        time: point.time as Time,
        value: point.macd,
      }));
      macdLineRef.current.setData(macdLineData);

      const macdSignalData: LineData<Time>[] = indicators.macd.map((point) => ({
        time: point.time as Time,
        value: point.signal,
      }));
      macdSignalRef.current.setData(macdSignalData);

      const macdHistogramData: HistogramData<Time>[] = indicators.macd.map((point) => ({
        time: point.time as Time,
        value: point.histogram,
        color: point.histogram >= 0 ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)',
      }));
      macdHistogramRef.current.setData(macdHistogramData);
    }
    
    // Fit content only on first load
    if (isFirstLoadRef.current) {
      chartRef.current?.timeScale().fitContent();
      isFirstLoadRef.current = false;
    }
  }, [displayCandles, indicators]);

  // Reset first load flag when symbol or timeframe changes
  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [symbol, settings.timeframe]);

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
