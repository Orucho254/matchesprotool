import React, { useMemo } from 'react';
import { DerivMarketItem, ToolType } from '../types';
import { MarketCard } from './MarketCard';
import { AlertCircle } from 'lucide-react';

interface MarketGridProps {
  markets: DerivMarketItem[];
  toolType: ToolType;
  onOpenModal: (market: DerivMarketItem) => void;
}

export const MarketGrid: React.FC<MarketGridProps> = ({
  markets,
  toolType,
  onOpenModal,
}) => {
  // Prioritize active valid signals at the top, with the newest valid signal shown first
  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => {
      const aValid = (a.scanState === 'SIGNAL_ACTIVE' || a.scanState === 'MARKET_CHANGING') && a.prediction.confidence >= 85 ? 1 : 0;
      const bValid = (b.scanState === 'SIGNAL_ACTIVE' || b.scanState === 'MARKET_CHANGING') && b.prediction.confidence >= 85 ? 1 : 0;

      if (aValid !== bValid) {
        return bValid - aValid; // Valid active signals prioritized at top
      }

      if (aValid && bValid) {
        const aTime = a.signalGeneratedAt || a.lastUpdated || 0;
        const bTime = b.signalGeneratedAt || b.lastUpdated || 0;
        if (bTime !== aTime) {
          return bTime - aTime; // Newest valid signal first
        }
      }

      return b.prediction.confidence - a.prediction.confidence;
    });
  }, [markets]);

  // Find the symbol with the highest percentage confidence
  const topMarketSymbol = useMemo(() => {
    if (sortedMarkets.length === 0) return null;
    let highest = sortedMarkets[0];
    for (const m of sortedMarkets) {
      if (m.prediction.confidence > highest.prediction.confidence) {
        highest = m;
      }
    }
    return highest.symbol;
  }, [sortedMarkets]);

  if (markets.length === 0) {
    return (
      <div className="bg-[#0b1328] border border-blue-900/40 rounded-2xl p-12 text-center space-y-3 shadow-xl">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">No matching markets found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Try clearing your search query or switching the category filter to view active Deriv synthetic indices.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {sortedMarkets.map((market) => (
        <MarketCard
          key={market.symbol}
          market={market}
          toolType={toolType}
          onOpenModal={onOpenModal}
          isHighestPick={market.symbol === topMarketSymbol}
        />
      ))}
    </div>
  );
};
