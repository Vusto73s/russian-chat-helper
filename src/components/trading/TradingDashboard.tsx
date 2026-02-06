import { useBybitPairs } from '@/hooks/useBybitData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useHAScanner } from '@/hooks/useHAScanner';
import { ChartSettings } from '@/types/trading';
import { IndicatorConfig } from '@/types/indicators';
import { Watchlist } from './Watchlist';
import { ChartGrid } from './ChartGrid';

// Default indicators for new charts
const createDefaultIndicators = (): IndicatorConfig[] => [
  {
    id: crypto.randomUUID(),
    type: 'sma',
    enabled: true,
    period: 3,
    color: '#FFFFFF',
    lineStyle: 'stepped',
  },
  {
    id: crypto.randomUUID(),
    type: 'sma',
    enabled: true,
    period: 20,
    color: '#FFD700',
    lineStyle: 'stepped',
  },
  {
    id: crypto.randomUUID(),
    type: 'rsi',
    enabled: true,
    period: 14,
    color: '#9B59B6',
    overbought: 70,
    oversold: 30,
  },
  {
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
  },
];

const DEFAULT_CHART_SETTINGS: ChartSettings[] = [
  { timeframe: '15', candleType: 'japanese', indicators: createDefaultIndicators() },
  { timeframe: '60', candleType: 'japanese', indicators: createDefaultIndicators() },
  { timeframe: '240', candleType: 'japanese', indicators: createDefaultIndicators() },
  { timeframe: 'D', candleType: 'japanese', indicators: createDefaultIndicators() },
];

export function TradingDashboard() {
  const { pairs, loading, refetch } = useBybitPairs();
  
  const [selectedSymbol, setSelectedSymbol] = useLocalStorage<string>(
    'trading-selected-symbol',
    'BTCUSDT'
  );
  
  const [watchlist, setWatchlist] = useLocalStorage<string[]>(
    'trading-watchlist',
    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
  );
  
  const [chartSettings, setChartSettings] = useLocalStorage<ChartSettings[]>(
    'trading-chart-settings',
    DEFAULT_CHART_SETTINGS
  );

  // HA pattern scanner for favorites on 15m timeframe
  const { getSignal } = useHAScanner(watchlist);

  const handleToggleWatchlist = (symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleChartSettingsChange = (index: number, settings: ChartSettings) => {
    setChartSettings((prev) => {
      const updated = [...prev];
      updated[index] = settings;
      return updated;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Watchlist Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border">
        <Watchlist
          pairs={pairs}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
          loading={loading}
          onRefresh={refetch}
          getSignal={getSignal}
        />
      </div>

      {/* Chart Grid */}
      <div className="flex-1">
        <ChartGrid
          symbol={selectedSymbol}
          chartSettings={chartSettings}
          onChartSettingsChange={handleChartSettingsChange}
        />
      </div>
    </div>
  );
}
