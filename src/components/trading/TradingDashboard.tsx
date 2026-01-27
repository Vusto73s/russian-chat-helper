import { useBybitPairs } from '@/hooks/useBybitData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChartSettings } from '@/types/trading';
import { Watchlist } from './Watchlist';
import { ChartGrid } from './ChartGrid';

const DEFAULT_CHART_SETTINGS: ChartSettings[] = [
  { timeframe: '15', candleType: 'japanese' },
  { timeframe: '60', candleType: 'japanese' },
  { timeframe: '240', candleType: 'japanese' },
  { timeframe: 'D', candleType: 'japanese' },
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
