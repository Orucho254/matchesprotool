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
  // Find the symbol with the highest percentage confidence
  const topMarketSymbol = useMemo(() => {
    if (markets.length === 0) return null;
    let highest = markets[0];
    for (const m of markets) {
      if (m.prediction.confidence > highest.prediction.confidence) {
        highest = m;
      }
    }
    return highest.symbol;
  }, [markets]);

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
      {markets.map((market) => (
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
