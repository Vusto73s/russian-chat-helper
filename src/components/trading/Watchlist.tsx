import { useState } from 'react';
import { TradingPair } from '@/types/trading';
import { HASignal } from '@/utils/haPatterns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, StarOff, RefreshCw, TrendingUp, TrendingDown, Flag, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FlagColor = 'gray' | 'yellow' | 'green' | 'red';

const FLAG_CYCLE: FlagColor[] = ['gray', 'yellow', 'green', 'red'];

const FLAG_COLOR_CLASSES: Record<FlagColor, string> = {
  gray: 'text-muted-foreground fill-muted-foreground',
  yellow: 'text-yellow-400 fill-yellow-400',
  green: 'text-green-500 fill-green-500',
  red: 'text-red-500 fill-red-500',
};

interface WatchlistProps {
  pairs: TradingPair[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  loading: boolean;
  onRefresh: () => void;
  getSignal?: (symbol: string) => HASignal | undefined;
  flags: Record<string, FlagColor>;
  onToggleFlag: (symbol: string) => void;
  onResetFlags: () => void;
}

export function Watchlist({
  pairs,
  selectedSymbol,
  onSelectSymbol,
  watchlist,
  onToggleWatchlist,
  loading,
  onRefresh,
  getSignal,
  flags,
  onToggleFlag,
  onResetFlags,
}: WatchlistProps) {
  const [search, setSearch] = useState('');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  const filteredPairs = pairs
    .filter((pair) => {
      const matchesSearch = pair.symbol.toLowerCase().includes(search.toLowerCase());
      const inWatchlist = watchlist.includes(pair.symbol);
      
      if (showWatchlistOnly) {
        return matchesSearch && inWatchlist;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      const aInWatchlist = watchlist.includes(a.symbol);
      const bInWatchlist = watchlist.includes(b.symbol);
      
      // If both are in watchlist or both are not, sort alphabetically
      if (aInWatchlist === bInWatchlist) {
        return a.symbol.localeCompare(b.symbol);
      }
      // Watchlist items first
      return aInWatchlist ? -1 : 1;
    });

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
  };

  const formatTurnover = (turnover: string) => {
    const num = parseFloat(turnover);
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Торговые пары</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onResetFlags}
              title="Сбросить все флажки"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        
        <Button
          variant={showWatchlistOnly ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
        >
          <Star className="mr-2 h-3 w-3" />
          Избранное ({watchlist.length})
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredPairs.map((pair) => {
            const isSelected = pair.symbol === selectedSymbol;
            const isInWatchlist = watchlist.includes(pair.symbol);
            const signal = getSignal?.(pair.symbol);

            return (
              <div
                key={pair.symbol}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition-colors",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-accent",
                  signal && "ring-1 ring-inset",
                  signal?.direction === 'bullish' && "ring-green-500/50",
                  signal?.direction === 'bearish' && "ring-red-500/50"
                )}
                onClick={() => onSelectSymbol(pair.symbol)}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag(pair.symbol);
                    }}
                    className="hover:opacity-80"
                    title="Флажок"
                  >
                    <Flag className={cn("h-3 w-3", FLAG_COLOR_CLASSES[flags[pair.symbol] || 'gray'])} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(pair.symbol);
                    }}
                    className="opacity-50 hover:opacity-100"
                  >
                    {isInWatchlist ? (
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    ) : (
                      <StarOff className="h-3 w-3" />
                    )}
                  </button>
                  <span className="text-xs font-medium">
                    {pair.symbol.replace('USDT', '')}
                  </span>
                  {pair.maxLeverage && (
                    <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">
                      {pair.maxLeverage}x
                    </span>
                  )}
                  {signal && (
                    signal.direction === 'bullish' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                    )
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-xs font-mono">
                    {formatPrice(pair.lastPrice)}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    ${formatTurnover(pair.turnover24h)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
