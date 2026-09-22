import React from 'react';
import { ToolType, MarketCategory, OverLevel, SignalFilterOption } from '../types';
import {
  Search,
  Target,
  Binary,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  Layers,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';

interface ToolHeaderProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedCategory: MarketCategory;
  onSelectCategory: (cat: MarketCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalMarkets: number;
  totalFilteredMarkets: number;
  selectedOverLevel?: OverLevel | null;
  onSelectOverLevel?: (level: OverLevel | null) => void;
  signalFilter: SignalFilterOption;
  onSignalFilterChange: (filter: SignalFilterOption) => void;
  categorySignalCounts: Record<'EVEN_ODD' | 'OVER_UNDER' | 'MATCHES' | 'RISE_FALL', number>;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  currentTool,
  onSelectTool,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  totalMarkets,
  totalFilteredMarkets,
  selectedOverLevel = null,
  onSelectOverLevel,
  signalFilter,
  onSignalFilterChange,
  categorySignalCounts,
}) => {
  // The 4 requested market categories in exact horizontal order:
  // Even/Odd, Over/Under, Matches/Differs, and Rise/Fall
  const marketCategories: {
    type: ToolType;
    label: string;
    contractCode: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    activeBorder: string;
    activeBg: string;
    badgeBg: string;
    badgeText: string;
  }[] = [
    {
      type: 'EVEN_ODD',
      label: 'Even / Odd',
      contractCode: 'EVEN_ODD',
      subtitle: '0–4 & 5–9 Odd Strategy',
      icon: Binary,
      accentColor: 'text-emerald-400',
      activeBorder: 'border-emerald-500 shadow-emerald-500/20',
      activeBg: 'bg-gradient-to-b from-emerald-950/60 to-[#0b1318]',
      badgeBg: 'bg-emerald-900/60 border-emerald-700/60',
      badgeText: 'text-emerald-300',
    },
    {
      type: 'OVER_UNDER',
      label: 'Over / Under',
      contractCode: 'OVER_UNDER',
      subtitle: 'Over 1–8 Barrier Momentum',
      icon: ArrowUpDown,
      accentColor: 'text-pink-400',
      activeBorder: 'border-pink-500 shadow-pink-500/20',
      activeBg: 'bg-gradient-to-b from-pink-950/60 to-[#14081c]',
      badgeBg: 'bg-pink-900/60 border-pink-700/60',
      badgeText: 'text-pink-300',
    },
    {
      type: 'MATCHES',
      label: 'Matches / Differs',
      contractCode: 'MATCHES',
      subtitle: 'Cold Decay & Differ 95%+',
      icon: Sparkles,
      accentColor: 'text-amber-400',
      activeBorder: 'border-amber-500 shadow-amber-500/20',
      activeBg: 'bg-gradient-to-b from-amber-950/60 to-[#160d05]',
      badgeBg: 'bg-amber-900/60 border-amber-700/60',
      badgeText: 'text-amber-300',
    },
    {
      type: 'RISE_FALL',
      label: 'Rise / Fall',
      contractCode: 'RISE_FALL',
      subtitle: '1m SMC Trend & Key Zones',
      icon: TrendingUp,
      accentColor: 'text-blue-400',
      activeBorder: 'border-blue-500 shadow-blue-500/20',
      activeBg: 'bg-gradient-to-b from-blue-950/60 to-[#080e1c]',
      badgeBg: 'bg-blue-900/60 border-blue-700/60',
      badgeText: 'text-blue-300',
    },
  ];

  const syntheticGroups: { id: MarketCategory; label: string }[] = [
    { id: 'ALL', label: 'All Indices' },
    { id: 'VOLATILITY_1S', label: 'Volatility (1s)' },
    { id: 'VOLATILITY_CONTINUOUS', label: 'Volatility Standard' },
    { id: 'CRASH_BOOM', label: 'Crash / Boom' },
    { id: 'JUMP', label: 'Jump Indices' },
    { id: 'STEP_RANGE', label: 'Step & Range' },
  ];

  const signalFilters: { id: SignalFilterOption; label: string }[] = [
    { id: 'ALL', label: 'All Signals' },
    { id: 'TRADE_READY', label: 'Trade Ready (≥85%)' },
    { id: 'HIGH_CONFIDENCE', label: 'Strong (≥90%)' },
    { id: 'ACTIVE_SIGNALS', label: 'Active Window' },
  ];

  const overLevels: { level: OverLevel | null; label: string; range: string }[] = [
    { level: null, label: 'Auto (Best Level)', range: '1–8 Scanned' },
    { level: 1, label: 'Over 1', range: '2–9' },
    { level: 2, label: 'Over 2', range: '3–9' },
    { level: 3, label: 'Over 3', range: '4–9' },
    { level: 4, label: 'Over 4', range: '5–9' },
    { level: 5, label: 'Over 5', range: '6–9' },
    { level: 6, label: 'Over 6', range: '7–9' },
    { level: 7, label: 'Over 7', range: '8–9' },
    { level: 8, label: 'Over 8', range: '9' },
  ];

  const getCategoryTitle = () => {
    switch (currentTool) {
      case 'EVEN_ODD':
        return 'Even / Odd Market Analysis';
      case 'OVER_UNDER':
        return 'Over / Under Market Analysis';
      case 'MATCHES':
        return 'Matches / Differs Market Analysis';
      case 'RISE_FALL':
        return 'Rise / Fall Market Analysis';
      case 'SCANNER':
        return 'All Markets Live Scanner Matrix';
    }
  };

  const getCategoryHeadlineInfo = () => {
    switch (currentTool) {
      case 'EVEN_ODD':
        return 'Displaying exclusively Even/Odd contract signals filtered by the quantitative 2-part (0–4 & 5–9) parity momentum rules.';
      case 'OVER_UNDER':
        return 'Displaying exclusively Over/Under contract signals with Over 1–8 barrier momentum, green-bar drivers (≥12%), and suppressed floors (<10%).';
      case 'MATCHES':
        return 'Displaying exclusively Matches/Differs contract signals based on cold digit mean decay and consecutive clustering analysis.';
      case 'RISE_FALL':
        return 'Displaying exclusively Rise/Fall contract signals driven by BABYOIL SPEEDBOT 1m trend, supply/demand POIs, and confirmation bars.';
      case 'SCANNER':
        return 'Real-time multi-market scanner monitoring all derivative indices simultaneously.';
    }
  };

  return (
    <div className="space-y-4 pt-3 pb-1">
      {/* 1. Category Selector Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
              {getCategoryTitle()}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 max-w-3xl">
            {getCategoryHeadlineInfo()}
          </p>
        </div>

        {/* Scanner quick switch */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectTool('SCANNER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              currentTool === 'SCANNER'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 font-black'
                : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Scanner Matrix</span>
          </button>
        </div>
      </div>

      {/* 2. HORIZONTAL MARKET CATEGORIES: Even/Odd, Over/Under, Matches/Differs, and Rise/Fall */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 text-[11px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Market Categories (Select to Filter Signals)</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Horizontally arranged for instant one-click filtering
          </span>
        </div>

        {/* Horizontal Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none">
          {marketCategories.map((cat) => {
            const isActive = currentTool === cat.type;
            const Icon = cat.icon;
            const signalCount =
              cat.type in categorySignalCounts
                ? categorySignalCounts[cat.type as keyof typeof categorySignalCounts]
                : 0;

            return (
              <button
                key={cat.type}
                type="button"
                onClick={() => onSelectTool(cat.type)}
                className={`group relative p-3 sm:p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between gap-2 select-none ${
                  isActive
                    ? `${cat.activeBg} ${cat.activeBorder} shadow-lg ring-1 ring-white/10 scale-[1.01]`
                    : 'bg-[#0e1422] hover:bg-[#131b2e] border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                {/* Active Indicator Pip */}
                {isActive && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}

                {/* Top: Icon + Title */}
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isActive
                        ? 'bg-black/40 border-white/15'
                        : 'bg-slate-800/60 border-slate-700/60 group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${cat.accentColor}`} />
                  </div>
                  <div className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                    {cat.label}
                  </div>
                </div>

                {/* Bottom: Subtitle & Live Signals Badge */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    {cat.subtitle}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                      signalCount > 0
                        ? `${cat.badgeBg} ${cat.badgeText}`
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {signalCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 inline" />
                        {signalCount} Ready
                      </span>
                    ) : (
                      'Scanning'
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. OVER 1–8 STRATEGY LEVEL INSPECTOR (Displayed when Over/Under is active) */}
      {currentTool === 'OVER_UNDER' && onSelectOverLevel && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1b0e35] via-[#140828] to-[#0f051e] border border-pink-900/60 shadow-lg space-y-2 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-pink-200 font-mono flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-pink-400 inline" />
                Over 1–8 Trading Strategy Inspector
              </span>
            </div>
            <div className="text-[11px] text-purple-300/80 font-mono">
              {selectedOverLevel ? (
                <span>
                  Locked to <strong className="text-pink-300">Over {selectedOverLevel}</strong> (Valid range:{' '}
                  <strong className="text-emerald-400">
                    {overLevels.find((l) => l.level === selectedOverLevel)?.range}
                  </strong>
                  )
                </span>
              ) : (
                <span>
                  Evaluating <strong className="text-emerald-400">All Levels (Over 1–8)</strong> for highest probability setup
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {overLevels.map((lvl) => {
              const isActive = selectedOverLevel === lvl.level;
              return (
                <button
                  key={lvl.label}
                  type="button"
                  onClick={() => onSelectOverLevel(lvl.level)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30 ring-1 ring-pink-400'
                      : 'bg-[#10061e] text-purple-300/80 hover:text-white hover:bg-purple-950/60 border border-purple-900/60'
                  }`}
                >
                  <span>{lvl.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-black/30 text-pink-100' : 'bg-purple-950 text-purple-400'
                    }`}
                  >
                    {lvl.range}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Filter, Status & Search Bar (Only shown for grid tools, hidden on MATCHES which has its own dedicated template) */}
      {currentTool !== 'MATCHES' && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          {/* Left: Signal Quality Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 px-1 shrink-0 uppercase tracking-wider">
              Signal:
            </span>
            {signalFilters.map((flt) => {
              const isSelected = signalFilter === flt.id;
              return (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => onSignalFilterChange(flt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
                  }`}
                >
                  {flt.label}
                </button>
              );
            })}
          </div>

          {/* Middle & Right: Market Indices Filter & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Synthetic Index Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {syntheticGroups.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search index (10, 75, Crash)..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Summary status line */}
      {currentTool !== 'MATCHES' && (
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Displaying <strong className="text-white">{totalFilteredMarkets}</strong> of{' '}
              <strong className="text-slate-300">{totalMarkets}</strong> markets
            </span>
            {signalFilter !== 'ALL' && (
              <span className="text-[11px] text-emerald-400 font-mono">
                (Filtered: {signalFilters.find((f) => f.id === signalFilter)?.label})
              </span>
            )}
            {searchQuery && (
              <span className="text-[11px] text-purple-400 font-mono">
                (Query: &ldquo;{searchQuery}&rdquo;)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Category: <span className="text-slate-300 font-bold">{currentTool}</span>
          </div>
        </div>
      )}
    </div>
  );
};
