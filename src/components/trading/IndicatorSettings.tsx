import { useState } from 'react';
import { Settings, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  IndicatorConfig,
  IndicatorType,
  INDICATOR_LABELS,
  INDICATOR_SHORT_LABELS,
  DEFAULT_INDICATOR_CONFIGS,
  MAX_INDICATOR_INSTANCES,
  isOverlayIndicator,
  SMAConfig,
  EMAConfig,
  BBConfig,
  RSIConfig,
  MACDConfig,
  StochasticConfig,
  ATRConfig,
  VolumeConfig,
} from '@/types/indicators';

interface IndicatorSettingsProps {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
}

const AVAILABLE_COLORS = [
  '#FFFFFF', '#FFD700', '#00BFFF', '#FF6B6B', '#9B59B6', 
  '#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#1ABC9C'
];

const INDICATOR_TYPES: IndicatorType[] = ['sma', 'ema', 'bb', 'rsi', 'macd', 'stochastic', 'atr', 'volume'];

export function IndicatorSettings({ indicators, onIndicatorsChange }: IndicatorSettingsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  const getIndicatorCount = (type: IndicatorType) => {
    return indicators.filter(i => i.type === type).length;
  };

  const canAddIndicator = (type: IndicatorType) => {
    return getIndicatorCount(type) < MAX_INDICATOR_INSTANCES;
  };

  const addIndicator = (type: IndicatorType) => {
    if (!canAddIndicator(type)) return;
    const newIndicator = DEFAULT_INDICATOR_CONFIGS[type]();
    onIndicatorsChange([...indicators, newIndicator]);
  };

  const removeIndicator = (id: string) => {
    onIndicatorsChange(indicators.filter(i => i.id !== id));
  };

  const updateIndicator = <T extends IndicatorConfig>(id: string, updates: Partial<T>) => {
    onIndicatorsChange(
      indicators.map(i => (i.id === id ? { ...i, ...updates } as IndicatorConfig : i))
    );
  };

  const toggleEnabled = (id: string) => {
    const indicator = indicators.find(i => i.id === id);
    if (indicator) {
      updateIndicator(id, { enabled: !indicator.enabled });
    }
  };

  const getIndicatorLabel = (indicator: IndicatorConfig) => {
    switch (indicator.type) {
      case 'sma':
        return `SMA (${indicator.period})`;
      case 'ema':
        return `EMA (${indicator.period})`;
      case 'bb':
        return `BB (${indicator.period}, ${indicator.stdDev})`;
      case 'rsi':
        return `RSI (${indicator.period})`;
      case 'macd':
        return `MACD (${indicator.fastPeriod}, ${indicator.slowPeriod}, ${indicator.signalPeriod})`;
      case 'stochastic':
        return `Stoch (${indicator.kPeriod}, ${indicator.dPeriod}, ${indicator.smooth})`;
      case 'atr':
        return `ATR% (${indicator.period})`;
      case 'volume':
        return `Vol`;
    }
  };

  const renderIndicatorSettings = (indicator: IndicatorConfig) => {
    switch (indicator.type) {
      case 'sma':
        return <SMASettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'ema':
        return <EMASettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'bb':
        return <BBSettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'rsi':
        return <RSISettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'macd':
        return <MACDSettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'stochastic':
        return <StochasticSettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'atr':
        return <ATRSettings indicator={indicator} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      case 'volume':
        return <VolumeSettings indicator={indicator as VolumeConfig} onUpdate={(u) => updateIndicator(indicator.id, u)} />;
      default:
        return null;
    }
  };

  const overlayIndicators = indicators.filter(i => isOverlayIndicator(i.type));
  const paneIndicators = indicators.filter(i => !isOverlayIndicator(i.type));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Индикаторы</h4>
          </div>

          {/* Add Indicator Button */}
          <Select onValueChange={(value: IndicatorType) => addIndicator(value)}>
            <SelectTrigger className="h-8 text-xs">
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                <span>Добавить индикатор</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {INDICATOR_TYPES.map(type => {
                const count = getIndicatorCount(type);
                const canAdd = count < MAX_INDICATOR_INSTANCES;
                return (
                  <SelectItem 
                    key={type} 
                    value={type} 
                    disabled={!canAdd}
                    className="text-xs"
                  >
                    {INDICATOR_LABELS[type]}
                    {count > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({count}/{MAX_INDICATOR_INSTANCES})
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Overlay Indicators (on main chart) */}
          {overlayIndicators.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs text-muted-foreground font-medium">На графике</h5>
              {overlayIndicators.map(indicator => (
                <Collapsible 
                  key={indicator.id} 
                  open={openItems.has(indicator.id)}
                  onOpenChange={() => toggleItem(indicator.id)}
                >
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <Switch 
                      checked={indicator.enabled} 
                      onCheckedChange={() => toggleEnabled(indicator.id)}
                      className="scale-75"
                    />
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: indicator.color }}
                    />
                    <span className="flex-1 text-xs font-medium">
                      {getIndicatorLabel(indicator)}
                    </span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ChevronDown className={`h-3 w-3 transition-transform ${openItems.has(indicator.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeIndicator(indicator.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <CollapsibleContent className="pt-2 pl-4">
                    {renderIndicatorSettings(indicator)}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Pane Indicators (separate panes) */}
          {paneIndicators.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs text-muted-foreground font-medium">Отдельные панели</h5>
              {paneIndicators.map(indicator => (
                <Collapsible 
                  key={indicator.id} 
                  open={openItems.has(indicator.id)}
                  onOpenChange={() => toggleItem(indicator.id)}
                >
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <Switch 
                      checked={indicator.enabled} 
                      onCheckedChange={() => toggleEnabled(indicator.id)}
                      className="scale-75"
                    />
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: indicator.color }}
                    />
                    <span className="flex-1 text-xs font-medium">
                      {getIndicatorLabel(indicator)}
                    </span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ChevronDown className={`h-3 w-3 transition-transform ${openItems.has(indicator.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeIndicator(indicator.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <CollapsibleContent className="pt-2 pl-4">
                    {renderIndicatorSettings(indicator)}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {indicators.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Нет добавленных индикаторов
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual indicator settings components
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {AVAILABLE_COLORS.map(color => (
        <button
          key={color}
          className={`w-5 h-5 rounded border-2 ${value === color ? 'border-primary' : 'border-transparent'}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

function SMASettings({ indicator, onUpdate }: { indicator: SMAConfig; onUpdate: (u: Partial<SMAConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Период</Label>
        <Input
          type="number"
          value={indicator.period}
          onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 1 })}
          className="h-7 text-xs"
          min={1}
          max={200}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs">Ступенчатая линия</Label>
        <Switch
          checked={indicator.lineStyle === 'stepped'}
          onCheckedChange={(checked) => onUpdate({ lineStyle: checked ? 'stepped' : 'solid' })}
          className="scale-75"
        />
      </div>
    </div>
  );
}

function EMASettings({ indicator, onUpdate }: { indicator: EMAConfig; onUpdate: (u: Partial<EMAConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Период</Label>
        <Input
          type="number"
          value={indicator.period}
          onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 1 })}
          className="h-7 text-xs"
          min={1}
          max={200}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
    </div>
  );
}

function BBSettings({ indicator, onUpdate }: { indicator: BBConfig; onUpdate: (u: Partial<BBConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Период</Label>
          <Input
            type="number"
            value={indicator.period}
            onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 1 })}
            className="h-7 text-xs"
            min={1}
            max={200}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Std Dev</Label>
          <Input
            type="number"
            value={indicator.stdDev}
            onChange={(e) => onUpdate({ stdDev: parseFloat(e.target.value) || 1 })}
            className="h-7 text-xs"
            min={0.5}
            max={5}
            step={0.5}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет средней</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
    </div>
  );
}

function RSISettings({ indicator, onUpdate }: { indicator: RSIConfig; onUpdate: (u: Partial<RSIConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Период</Label>
        <Input
          type="number"
          value={indicator.period}
          onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 1 })}
          className="h-7 text-xs"
          min={1}
          max={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Перекупленность</Label>
          <Input
            type="number"
            value={indicator.overbought}
            onChange={(e) => onUpdate({ overbought: parseInt(e.target.value) || 70 })}
            className="h-7 text-xs"
            min={50}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Перепроданность</Label>
          <Input
            type="number"
            value={indicator.oversold}
            onChange={(e) => onUpdate({ oversold: parseInt(e.target.value) || 30 })}
            className="h-7 text-xs"
            min={0}
            max={50}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
    </div>
  );
}

function MACDSettings({ indicator, onUpdate }: { indicator: MACDConfig; onUpdate: (u: Partial<MACDConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Fast</Label>
          <Input
            type="number"
            value={indicator.fastPeriod}
            onChange={(e) => onUpdate({ fastPeriod: parseInt(e.target.value) || 12 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Slow</Label>
          <Input
            type="number"
            value={indicator.slowPeriod}
            onChange={(e) => onUpdate({ slowPeriod: parseInt(e.target.value) || 26 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Signal</Label>
          <Input
            type="number"
            value={indicator.signalPeriod}
            onChange={(e) => onUpdate({ signalPeriod: parseInt(e.target.value) || 9 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет MACD</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет Signal</Label>
        <ColorPicker value={indicator.signalColor} onChange={(signalColor) => onUpdate({ signalColor })} />
      </div>
    </div>
  );
}

function StochasticSettings({ indicator, onUpdate }: { indicator: StochasticConfig; onUpdate: (u: Partial<StochasticConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">%K</Label>
          <Input
            type="number"
            value={indicator.kPeriod}
            onChange={(e) => onUpdate({ kPeriod: parseInt(e.target.value) || 14 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">%D</Label>
          <Input
            type="number"
            value={indicator.dPeriod}
            onChange={(e) => onUpdate({ dPeriod: parseInt(e.target.value) || 3 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Smooth</Label>
          <Input
            type="number"
            value={indicator.smooth}
            onChange={(e) => onUpdate({ smooth: parseInt(e.target.value) || 3 })}
            className="h-7 text-xs"
            min={1}
            max={100}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Перекупленность</Label>
          <Input
            type="number"
            value={indicator.overbought}
            onChange={(e) => onUpdate({ overbought: parseInt(e.target.value) || 80 })}
            className="h-7 text-xs"
            min={50}
            max={100}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Перепроданность</Label>
          <Input
            type="number"
            value={indicator.oversold}
            onChange={(e) => onUpdate({ oversold: parseInt(e.target.value) || 20 })}
            className="h-7 text-xs"
            min={0}
            max={50}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет %K</Label>
        <ColorPicker value={indicator.color} onChange={(color) => onUpdate({ color })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет %D</Label>
        <ColorPicker value={indicator.dColor} onChange={(dColor) => onUpdate({ dColor })} />
      </div>
    </div>
  );
}

function ATRSettings({ indicator, onUpdate }: { indicator: ATRConfig; onUpdate: (u: Partial<ATRConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Период ATR</Label>
        <Input
          type="number"
          value={indicator.period}
          onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 14 })}
          className="h-7 text-xs"
          min={1}
          max={100}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Пороги волатильности (%)</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Низкий
            </Label>
            <Input
              type="number"
              value={indicator.lowThreshold}
              onChange={(e) => onUpdate({ lowThreshold: parseFloat(e.target.value) || 0.5 })}
              className="h-7 text-xs"
              min={0.1}
              max={5}
              step={0.1}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Средний
            </Label>
            <Input
              type="number"
              value={indicator.mediumThreshold}
              onChange={(e) => onUpdate({ mediumThreshold: parseFloat(e.target.value) || 1.5 })}
              className="h-7 text-xs"
              min={0.5}
              max={10}
              step={0.1}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Высокий
            </Label>
            <Input
              type="number"
              value={indicator.highThreshold}
              onChange={(e) => onUpdate({ highThreshold: parseFloat(e.target.value) || 3 })}
              className="h-7 text-xs"
              min={1}
              max={20}
              step={0.5}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Выше высокого порога = красный (очень высокая волатильность)
        </p>
      </div>
    </div>
  );
}

function VolumeSettings({ indicator, onUpdate }: { indicator: VolumeConfig; onUpdate: (u: Partial<VolumeConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Цвет роста</Label>
        <ColorPicker value={indicator.upColor} onChange={(upColor) => onUpdate({ upColor })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Цвет падения</Label>
        <ColorPicker value={indicator.downColor} onChange={(downColor) => onUpdate({ downColor })} />
      </div>
    </div>
  );
}
