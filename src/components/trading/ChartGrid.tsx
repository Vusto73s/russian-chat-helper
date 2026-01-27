import { TradingChart } from './TradingChart';
import { ChartSettings } from '@/types/trading';

interface ChartGridProps {
  symbol: string;
  chartSettings: ChartSettings[];
  onChartSettingsChange: (index: number, settings: ChartSettings) => void;
}

export function ChartGrid({ symbol, chartSettings, onChartSettingsChange }: ChartGridProps) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
      {chartSettings.map((settings, index) => (
        <TradingChart
          key={index}
          symbol={symbol}
          chartIndex={index}
          settings={settings}
          onSettingsChange={(newSettings) => onChartSettingsChange(index, newSettings)}
        />
      ))}
    </div>
  );
}
