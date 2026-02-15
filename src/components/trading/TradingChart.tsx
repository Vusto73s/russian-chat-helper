import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
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
  LineStyle,
  CreatePriceLineOptions
} from 'lightweight-charts';
import { useBybitCandles } from '@/hooks/useBybitData';
import { ChartSettings, TIMEFRAME_LABELS, Timeframe, CandleType } from '@/types/trading';
import { IndicatorConfig, SMAConfig, EMAConfig, BBConfig, RSIConfig, MACDConfig, StochasticConfig, ATRConfig, VolumeConfig, isOverlayIndicator } from '@/types/indicators';
import { convertToHeikinAshi } from '@/utils/heikinAshi';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateStochastic, calculateATRPercent } from '@/utils/indicators';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndicatorSettings } from './IndicatorSettings';
import { Loader2, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Timeframe durations in milliseconds
const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1': 60 * 1000,
  '5': 5 * 60 * 1000,
  '15': 15 * 60 * 1000,
  '60': 60 * 60 * 1000,
  '240': 4 * 60 * 60 * 1000,
  'D': 24 * 60 * 60 * 1000,
};

interface TradingChartProps {
  symbol: string;
  chartIndex: number;
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  tickSize: string;
}

// Series reference type for dynamic indicators
interface IndicatorSeries {
  id: string;
  type: string;
  series: ISeriesApi<'Line'>[];
  histogram?: ISeriesApi<'Histogram'>;
}

export function TradingChart({ symbol, chartIndex, settings, onSettingsChange, tickSize }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<IndicatorSeries[]>([]);
  const isFirstLoadRef = useRef(true);
  const [countdown, setCountdown] = useState<string>('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [priceLines, setPriceLines] = useState<number[]>([]);
  const priceLinesRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[]>([]);
  
  const { candles, loading } = useBybitCandles(symbol, settings.timeframe);

  // Calculate countdown to candle close
  const calculateCountdown = useCallback(() => {
    const now = Date.now();
    const intervalMs = TIMEFRAME_MS[settings.timeframe];
    const msUntilClose = intervalMs - (now % intervalMs);
    
    const totalSeconds = Math.floor(msUntilClose / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [settings.timeframe]);

  // Update countdown every second
  useEffect(() => {
    setCountdown(calculateCountdown());
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, [calculateCountdown]);

  const draggingLineRef = useRef<{ index: number; startY: number; startPrice: number } | null>(null);

  // Add horizontal line at price level
  const addPriceLine = useCallback((price: number) => {
    if (!seriesRef.current) return;
    const line = seriesRef.current.createPriceLine({
      price,
      color: '#2196F3',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
    });
    priceLinesRef.current.push(line);
    setPriceLines(prev => [...prev, price]);
  }, []);

  // Remove all horizontal lines
  const removeAllPriceLines = useCallback(() => {
    if (!seriesRef.current) return;
    priceLinesRef.current.forEach(line => {
      seriesRef.current?.removePriceLine(line);
    });
    priceLinesRef.current = [];
    setPriceLines([]);
  }, []);

  // Handle chart click for drawing mode
  useEffect(() => {
    if (!chartRef.current || !drawingMode) return;
    const chart = chartRef.current;

    const handler = (param: any) => {
      if (!param.point || !seriesRef.current) return;
      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price !== null && price !== undefined) {
        addPriceLine(price as number);
        setDrawingMode(false);
      }
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [drawingMode, addPriceLine]);

  // Draggable price lines via mouse events
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !seriesRef.current) return;

    const DRAG_THRESHOLD = 5; // px proximity to "grab" a line

    const handleMouseDown = (e: MouseEvent) => {
      if (drawingMode || priceLinesRef.current.length === 0 || !seriesRef.current) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Find closest price line
      for (let i = 0; i < priceLinesRef.current.length; i++) {
        const linePrice = (priceLinesRef.current[i].options() as any).price;
        const lineY = seriesRef.current.priceToCoordinate(linePrice);
        if (lineY !== null && Math.abs(y - lineY) <= DRAG_THRESHOLD) {
          draggingLineRef.current = { index: i, startY: y, startPrice: linePrice };
          container.style.cursor = 'ns-resize';
          e.preventDefault();
          // Disable chart interactions while dragging
          chartRef.current?.applyOptions({ handleScroll: false, handleScale: false });
          return;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingLineRef.current || !seriesRef.current) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newPrice = seriesRef.current.coordinateToPrice(y);
      if (newPrice === null) return;

      const line = priceLinesRef.current[draggingLineRef.current.index];
      if (line) {
        line.applyOptions({ price: newPrice as number });
      }
    };

    const handleMouseUp = () => {
      if (draggingLineRef.current) {
        // Update stored prices
        const newPrices = priceLinesRef.current.map(l => (l.options() as any).price as number);
        setPriceLines(newPrices);
        draggingLineRef.current = null;
        container.style.cursor = '';
        chartRef.current?.applyOptions({ handleScroll: true, handleScale: true });
      }
    };

    // Show grab cursor on hover over lines
    const handleHoverCursor = (e: MouseEvent) => {
      if (draggingLineRef.current || drawingMode || priceLinesRef.current.length === 0 || !seriesRef.current) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      let nearLine = false;
      for (const line of priceLinesRef.current) {
        const linePrice = (line.options() as any).price;
        const lineY = seriesRef.current.priceToCoordinate(linePrice);
        if (lineY !== null && Math.abs(y - lineY) <= DRAG_THRESHOLD) {
          nearLine = true;
          break;
        }
      }
      container.style.cursor = nearLine ? 'ns-resize' : '';
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousemove', handleHoverCursor);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousemove', handleHoverCursor);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawingMode, priceLines]);

  const displayCandles = useMemo(() => {
    if (settings.candleType === 'heikinashi') {
      return convertToHeikinAshi(candles);
    }
    return candles;
  }, [candles, settings.candleType]);

  // Get enabled indicators
  const enabledIndicators = useMemo(() => {
    return settings.indicators.filter(i => i.enabled);
  }, [settings.indicators]);

  // Calculate pane layout based on enabled indicators
  const paneLayout = useMemo(() => {
    const paneIndicators = enabledIndicators.filter(i => !isOverlayIndicator(i.type));
    const numPanes = paneIndicators.length;
    
    if (numPanes === 0) {
      return { mainBottom: 0.02, panes: [] };
    }
    
    // Each pane gets ~18% of chart height with gaps
    const paneHeight = 0.16;
    const gap = 0.02;
    const bottomMargin = 0.02;
    
    // Total space for panes
    const totalPaneHeight = numPanes * paneHeight + (numPanes - 1) * gap + bottomMargin;
    const mainBottom = totalPaneHeight;
    
    const panes = paneIndicators.map((indicator, index) => {
      // Stack panes from bottom to top
      // First pane (index 0) at bottom, next ones above
      const distanceFromBottom = bottomMargin + index * (paneHeight + gap);
      
      return {
        id: indicator.id,
        // For scaleMargins: top = how much to leave at top, bottom = how much to leave at bottom
        scaleTop: 1 - distanceFromBottom - paneHeight, // Leave space above
        scaleBottom: distanceFromBottom, // Leave space below
      };
    });
    
    return { mainBottom, panes };
  }, [enabledIndicators]);

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
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'hsl(220, 20%, 20%)',
      },
      timeScale: {
        borderColor: 'hsl(220, 20%, 20%)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('pl-PL', {
            timeZone: 'Europe/Warsaw',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series
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
      indicatorSeriesRef.current = [];
    };
  }, []);

  // Update price format based on tickSize from exchange
  useEffect(() => {
    if (!seriesRef.current || !tickSize) return;
    const minMove = parseFloat(tickSize);
    if (isNaN(minMove) || minMove <= 0) return;
    const precision = Math.max(0, Math.round(-Math.log10(minMove)));
    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });
  }, [tickSize]);

  // Update price scale margins when layout changes
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.05, bottom: paneLayout.mainBottom },
    });
  }, [paneLayout.mainBottom]);

  // Manage indicator series based on enabled indicators
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Get current indicator IDs
    const currentIds = indicatorSeriesRef.current.map(s => s.id);
    const enabledIds = enabledIndicators.map(i => i.id);

    // Remove series for disabled indicators
    indicatorSeriesRef.current = indicatorSeriesRef.current.filter(indSeries => {
      if (!enabledIds.includes(indSeries.id)) {
        indSeries.series.forEach(s => chart.removeSeries(s));
        if (indSeries.histogram) chart.removeSeries(indSeries.histogram);
        return false;
      }
      return true;
    });

    // Add series for new indicators
    enabledIndicators.forEach(indicator => {
      if (currentIds.includes(indicator.id)) return;

      const newSeries: IndicatorSeries = {
        id: indicator.id,
        type: indicator.type,
        series: [],
      };

      const paneConfig = paneLayout.panes.find(p => p.id === indicator.id);

      switch (indicator.type) {
        case 'sma':
        case 'ema': {
          const series = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            lineType: indicator.type === 'sma' && (indicator as SMAConfig).lineStyle === 'stepped' ? 1 : 0,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          newSeries.series.push(series);
          break;
        }
        case 'bb': {
          // Middle band
          const middle = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          // Upper band
          const upper = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          // Lower band
          const lower = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          newSeries.series.push(middle, upper, lower);
          break;
        }
        case 'rsi': {
          const series = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: `rsi_${indicator.id}`,
            crosshairMarkerVisible: false,
          });
          if (paneConfig) {
            series.priceScale().applyOptions({
              scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
              borderVisible: false,
            });
          }
          newSeries.series.push(series);
          break;
        }
        case 'macd': {
          const macdConfig = indicator as MACDConfig;
          const macdLine = chart.addSeries(LineSeries, {
            color: macdConfig.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: `macd_${indicator.id}`,
            crosshairMarkerVisible: false,
          });
          const signalLine = chart.addSeries(LineSeries, {
            color: macdConfig.signalColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: `macd_${indicator.id}`,
            crosshairMarkerVisible: false,
          });
          const histogram = chart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: `macd_${indicator.id}`,
          });
          if (paneConfig) {
            histogram.priceScale().applyOptions({
              scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
              borderVisible: false,
            });
          }
          newSeries.series.push(macdLine, signalLine);
          newSeries.histogram = histogram;
          break;
        }
        case 'stochastic': {
          const stochConfig = indicator as StochasticConfig;
          const kLine = chart.addSeries(LineSeries, {
            color: stochConfig.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: `stoch_${indicator.id}`,
            crosshairMarkerVisible: false,
          });
          const dLine = chart.addSeries(LineSeries, {
            color: stochConfig.dColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: `stoch_${indicator.id}`,
            crosshairMarkerVisible: false,
          });
          if (paneConfig) {
            kLine.priceScale().applyOptions({
              scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
              borderVisible: false,
            });
          }
          newSeries.series.push(kLine, dLine);
          break;
        }
        case 'atr': {
          const atrConfig = indicator as ATRConfig;
          const histogram = chart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: `atr_${indicator.id}`,
            priceFormat: {
              type: 'price',
              precision: 3,
              minMove: 0.001,
            },
          });
          if (paneConfig) {
            histogram.priceScale().applyOptions({
              scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
              borderVisible: false,
            });
          }
          newSeries.histogram = histogram;
          break;
        }
        case 'volume': {
          const volConfig = indicator as VolumeConfig;
          const histogram = chart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: `volume_${indicator.id}`,
            priceFormat: {
              type: 'volume',
            },
          });
          if (paneConfig) {
            histogram.priceScale().applyOptions({
              scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
              borderVisible: false,
            });
          }
          newSeries.histogram = histogram;
          break;
        }
      }

      indicatorSeriesRef.current.push(newSeries);
    });
  }, [enabledIndicators.map(i => i.id).join(','), paneLayout.panes]);

  // Update pane scale margins whenever layout changes (fixes overlapping panes)
  useEffect(() => {
    if (!chartRef.current) return;

    indicatorSeriesRef.current.forEach(indSeries => {
      const paneConfig = paneLayout.panes.find(p => p.id === indSeries.id);
      if (!paneConfig) return;

      // Apply margins to the primary scale-setting series for each pane type
      const applyMargins = (series: ISeriesApi<any>) => {
        series.priceScale().applyOptions({
          scaleMargins: { top: paneConfig.scaleTop, bottom: paneConfig.scaleBottom },
          borderVisible: false,
        });
      };

      switch (indSeries.type) {
        case 'rsi':
        case 'stochastic':
          if (indSeries.series[0]) applyMargins(indSeries.series[0]);
          break;
        case 'macd':
        case 'atr':
        case 'volume':
          if (indSeries.histogram) applyMargins(indSeries.histogram);
          else if (indSeries.series[0]) applyMargins(indSeries.series[0]);
          break;
      }
    });
  }, [paneLayout.panes]);

  // Update series colors when indicator config changes
  useEffect(() => {
    indicatorSeriesRef.current.forEach(indSeries => {
      const config = enabledIndicators.find(i => i.id === indSeries.id);
      if (!config) return;

      switch (config.type) {
        case 'sma':
        case 'ema': {
          indSeries.series[0]?.applyOptions({ color: config.color });
          break;
        }
        case 'bb': {
          const bbConfig = config as BBConfig;
          indSeries.series[0]?.applyOptions({ color: bbConfig.color });
          indSeries.series[1]?.applyOptions({ color: bbConfig.color });
          indSeries.series[2]?.applyOptions({ color: bbConfig.color });
          break;
        }
        case 'rsi': {
          indSeries.series[0]?.applyOptions({ color: config.color });
          break;
        }
        case 'macd': {
          const macdConfig = config as MACDConfig;
          indSeries.series[0]?.applyOptions({ color: macdConfig.color });
          indSeries.series[1]?.applyOptions({ color: macdConfig.signalColor });
          break;
        }
        case 'stochastic': {
          const stochConfig = config as StochasticConfig;
          indSeries.series[0]?.applyOptions({ color: stochConfig.color });
          indSeries.series[1]?.applyOptions({ color: stochConfig.dColor });
          break;
        }
      }
    });
  }, [enabledIndicators]);

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
    try {
      seriesRef.current.setData(chartData);
    } catch (e) {
      console.error('Error setting candle data:', e);
      return;
    }

    // Update indicator data
    indicatorSeriesRef.current.forEach(indSeries => {
      const config = enabledIndicators.find(i => i.id === indSeries.id);
      if (!config) return;

      try {
        switch (config.type) {
          case 'sma': {
            const smaConfig = config as SMAConfig;
            const data = calculateSMA(candles, smaConfig.period);
            const lineData: LineData<Time>[] = data.map(p => ({ time: p.time as Time, value: p.value }));
            indSeries.series[0]?.setData(lineData);
            break;
          }
          case 'ema': {
            const emaConfig = config as EMAConfig;
            const data = calculateEMA(candles, emaConfig.period);
            const lineData: LineData<Time>[] = data.map(p => ({ time: p.time as Time, value: p.value }));
            indSeries.series[0]?.setData(lineData);
            break;
          }
          case 'bb': {
            const bbConfig = config as BBConfig;
            const data = calculateBollingerBands(candles, bbConfig.period, bbConfig.stdDev);
            indSeries.series[0]?.setData(data.map(p => ({ time: p.time as Time, value: p.middle })));
            indSeries.series[1]?.setData(data.map(p => ({ time: p.time as Time, value: p.upper })));
            indSeries.series[2]?.setData(data.map(p => ({ time: p.time as Time, value: p.lower })));
            break;
          }
          case 'rsi': {
            const rsiConfig = config as RSIConfig;
            const data = calculateRSI(candles, rsiConfig.period);
            const lineData: LineData<Time>[] = data.map(p => ({ time: p.time as Time, value: p.value }));
            indSeries.series[0]?.setData(lineData);
            break;
          }
          case 'macd': {
            const macdConfig = config as MACDConfig;
            const data = calculateMACD(candles, macdConfig.fastPeriod, macdConfig.slowPeriod, macdConfig.signalPeriod);
            indSeries.series[0]?.setData(data.map(p => ({ time: p.time as Time, value: p.macd })));
            indSeries.series[1]?.setData(data.map(p => ({ time: p.time as Time, value: p.signal })));
            const histData: HistogramData<Time>[] = data.map(p => ({
              time: p.time as Time,
              value: p.histogram,
              color: p.histogram >= 0 ? macdConfig.histogramUpColor : macdConfig.histogramDownColor,
            }));
            indSeries.histogram?.setData(histData);
            break;
          }
          case 'stochastic': {
            const stochConfig = config as StochasticConfig;
            const data = calculateStochastic(candles, stochConfig.kPeriod, stochConfig.dPeriod, stochConfig.smooth);
            indSeries.series[0]?.setData(data.map(p => ({ time: p.time as Time, value: p.k })));
            indSeries.series[1]?.setData(data.map(p => ({ time: p.time as Time, value: p.d })));
            break;
          }
          case 'atr': {
            const atrConfig = config as ATRConfig;
            const data = calculateATRPercent(
              candles, 
              atrConfig.period, 
              atrConfig.lowThreshold, 
              atrConfig.mediumThreshold, 
              atrConfig.highThreshold
            );
            const histData: HistogramData<Time>[] = data.map(p => ({
              time: p.time as Time,
              value: p.value,
              color: p.color,
            }));
            indSeries.histogram?.setData(histData);
            break;
          }
          case 'volume': {
            const volConfig = config as VolumeConfig;
            // Always use original candles for volume data (HA candles may lack volume)
            const histData: HistogramData<Time>[] = candles.map((c) => ({
              time: c.time as Time,
              value: c.volume || 0,
              color: c.close >= c.open ? volConfig.upColor : volConfig.downColor,
            }));
            indSeries.histogram?.setData(histData);
            break;
          }
        }
      } catch (e) {
        console.error(`Error updating indicator ${config.type}:`, e);
      }
    });
    
    // Fit content only on first load or timeframe change
    if (isFirstLoadRef.current) {
      chartRef.current?.timeScale().fitContent();
      isFirstLoadRef.current = false;
    }
  }, [displayCandles, candles, enabledIndicators]);

  // Reset first load flag only when timeframe changes
  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [settings.timeframe]);

  const handleIndicatorsChange = (newIndicators: IndicatorConfig[]) => {
    onSettingsChange({ ...settings, indicators: newIndicators });
  };

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

          <IndicatorSettings 
            indicators={settings.indicators}
            onIndicatorsChange={handleIndicatorsChange}
          />

          <Button
            variant={drawingMode ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setDrawingMode(!drawingMode)}
            title="Добавить горизонтальную линию"
          >
            <Minus className="h-4 w-4" />
          </Button>

          {priceLines.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={removeAllPriceLines}
              title="Удалить все линии"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className={cn("relative flex-1", drawingMode && "cursor-crosshair")}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={chartContainerRef} className="h-full w-full" />
        
        {/* Countdown overlay - top left corner */}
        <div className="absolute top-2 left-2 z-20">
          <div className="bg-muted/90 border border-border rounded px-1.5 py-0.5">
            <span className="text-[12px] font-mono text-white">{countdown}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
