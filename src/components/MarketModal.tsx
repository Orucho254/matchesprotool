import React, { useState } from 'react';
import { DerivMarketItem, ToolType, OverLevel } from '../types';
import {
  X,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Activity,
  BarChart2,
  Hash,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Target,
  ArrowRight,
  TrendingDown as ArrowDownRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line } from 'recharts';
import { calculateDigitPredictionSignal } from '../utils/signalCalculator';
import { SignalEntryCard } from './SignalEntryCard';
import { computeDigitMomentumMap, evaluateOverLevelStrategy } from '../utils/overStrategy';
import { EvenOddTwoPartAnalysis } from './EvenOddTwoPartAnalysis';
import { evaluateEvenOddStrategy } from '../utils/evenOddStrategy';
import { CandlestickChart } from './CandlestickChart';
import { SmcRiseFallAnalysis } from './SmcRiseFallAnalysis';

interface MarketModalProps {
  market: DerivMarketItem | null;
  toolType: ToolType;
  onClose: () => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  market,
  toolType,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'SMC_STRATEGY'
    | 'OVER_STRATEGY'
    | 'EVEN_ODD_STRATEGY'
    | 'BARRIERS'
    | 'RADAR'
    | 'TICKS'
    | 'STRATEGY'
  >(
    toolType === 'RISE_FALL'
      ? 'SMC_STRATEGY'
      : toolType === 'EVEN_ODD'
      ? 'EVEN_ODD_STRATEGY'
      : toolType === 'OVER_UNDER'
      ? 'OVER_STRATEGY'
      : 'BARRIERS'
  );

  const [inspectOverLevel, setInspectOverLevel] = useState<OverLevel>(
    market?.prediction?.overStrategy?.level || 2
  );

  if (!market) return null;

  const {
    displayName,
    symbol,
    currentPrice,
    priceDelta,
    lastDigit,
    recentDigits,
    recentPrices,
    stats,
    prediction,
    pipSize,
    countdown,
  } = market;

  const isTradeEligible = prediction.confidence >= 85;
  const digitSignal = calculateDigitPredictionSignal(market);

  const isInvalidated = market.scanState === 'SIGNAL_INVALIDATED';
  const isMarketChanging = market.scanState === 'MARKET_CHANGING';
  const isSignalActive = market.scanState === 'SIGNAL_ACTIVE';

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Prepare digit frequency data for Recharts
  const digitChartData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
    const count = stats.digitFrequencies[digit] || 0;
    const total = Math.max(1, recentDigits.length);
    const percentage = Math.round((count / total) * 100);
    const isHot = stats.hottestDigits.includes(digit);
    const isCold = stats.coldestDigits.includes(digit);
    return {
      digit: `Digit ${digit}`,
      digitNum: digit,
      count,
      percentage,
      isHot,
      isCold,
      fill: isHot ? '#ec4899' : isCold ? '#38bdf8' : '#818cf8',
    };
  });

  // Prepare price chart data
  const priceChartData = recentPrices.map((p, idx) => ({
    tick: `#${idx + 1}`,
    price: p,
    digit: recentDigits[idx] ?? 0,
  }));

  // Barriers data (Over 1..8 and Under 9..1)
  const overBarriers = [1, 2, 3, 4, 5, 6, 7, 8].map((b) => {
    const item = prediction.barrierAnalyses?.find((ba) => ba.type === 'OVER' && ba.barrier === b);
    const percent = item ? item.percentage : (stats.overBarriers[b]?.percent ?? 50);
    return {
      barrier: b,
      label: `Over ${b}`,
      percent,
      isEligible: percent >= 85,
    };
  });

  const underBarriers = [9, 8, 7, 6, 5, 4, 3, 2, 1].map((b) => {
    const item = prediction.barrierAnalyses?.find((ba) => ba.type === 'UNDER' && ba.barrier === b);
    const percent = item ? item.percentage : (stats.underBarriers[b]?.percent ?? 50);
    return {
      barrier: b,
      label: `Under ${b}`,
      percent,
      isEligible: percent >= 85,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative overflow-hidden bg-gradient-to-b from-[#1a1132] via-[#140b28] to-[#0e061e] border border-purple-800/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(147,51,234,0.25)] space-y-5 p-6 text-slate-200">
        {/* Luminous Purple Underglow Bar directly under modal template */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-400 to-indigo-500 shadow-[0_2px_14px_rgba(192,132,252,0.7)]" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-purple-900/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#f472b6] tracking-tight">
                {displayName}
              </h2>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono text-xs font-bold border border-purple-800/60">
                {symbol}
              </span>
              {isTradeEligible ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-xs font-bold border border-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  TRADE READY (≥85%)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300/80 font-mono text-xs font-bold border border-purple-900/60">
                  MONITORING (&lt;85%)
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300/70 mt-1">
              Live quantitative analysis and barrier breakdown across {recentDigits.length} recent ticks
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-purple-950/80 text-purple-300 hover:text-white hover:bg-purple-900 transition-colors cursor-pointer border border-purple-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invalidation Alert Banner */}
        {isInvalidated && (
          <div className="p-3.5 rounded-xl border border-rose-500/60 bg-gradient-to-b from-[#2a0d1e] via-[#1f0917] to-[#14050f] shadow-[0_0_20px_rgba(244,63,94,0.25)] space-y-1.5 animate-pulse">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>⚠ MARKET CHANGED — SIGNAL INVALIDATED</span>
            </div>
            <div className="text-xs text-rose-200/90 font-mono">
              {market.invalidationAlert?.message || `Market conditions shifted against ${prediction.primarySignal}. Invalidation triggered.`}
            </div>
          </div>
        )}

        {/* Real-time Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-[#130a26] border border-purple-900/50">
            <span className="text-[11px] text-purple-300/70 font-medium block">Current Quote</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-extrabold font-mono text-slate-100">
                {currentPrice.toFixed(pipSize)}
              </span>
              {priceDelta >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#130a26] border border-purple-900/50">
            <span className="text-[11px] text-purple-300/70 font-medium block">PREDICTION</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="w-4 h-4 text-[#00f59b]" />
              <span className={`text-sm font-extrabold font-mono ${isTradeEligible ? 'text-[#00f59b]' : 'text-amber-400'}`}>
                {prediction.primarySignal || 'UNDER 9'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#130a26] border border-purple-900/50">
            <span className="text-[11px] text-purple-300/70 font-medium block">RECOMMENDED TRADE</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-sm font-extrabold font-mono ${isTradeEligible ? 'text-[#2dd4bf]' : 'text-amber-400'}`}>
                {prediction.recommendedTrade || prediction.primarySignal || 'UNDER 9'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#130a26] border border-purple-900/50">
            <span className="text-[11px] text-purple-300/70 font-medium block">TRADING WINDOW</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-extrabold font-mono text-pink-300">
                {formatTime(countdown)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#130a26] border border-purple-900/50 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-purple-300/70 font-medium block">CONFIDENCE &amp; STATUS</span>
            <div className="flex items-center justify-between gap-1.5 mt-0.5">
              <div className="flex items-center gap-1">
                <ShieldCheck className={`w-4 h-4 ${isTradeEligible ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`text-sm font-extrabold font-mono ${isTradeEligible ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {prediction.confidence}%
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                isInvalidated
                  ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                  : isMarketChanging
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50'
                  : isTradeEligible
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
              }`}>
                {isInvalidated ? 'INVALID' : isMarketChanging ? 'CHANGING' : isTradeEligible ? 'ACTIVE' : 'WAIT'}
              </span>
            </div>
          </div>
        </div>

        {/* Prediction Reasoning Banner */}
        <div className="p-3 rounded-xl bg-[#120822] border border-purple-900/60 text-xs flex items-center gap-2">
          <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px] shrink-0">
            Analysis Reason:
          </span>
          <span className="text-slate-300 leading-snug font-medium">
            {prediction.reasoning}
          </span>
        </div>

        {/* Real-time Dynamic Digit-Based Binary Trading Prediction Section */}
        <SignalEntryCard signal={digitSignal} marketName={displayName} />

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-purple-900/50 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('SMC_STRATEGY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'SMC_STRATEGY'
                ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-pink-600/30 ring-1 ring-pink-400'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-pink-400" />
            BABYOIL SPEEDBOT (Rise/Fall 1m SMC)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OVER_STRATEGY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'OVER_STRATEGY'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Over 1–8 Trading Strategy Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EVEN_ODD_STRATEGY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'EVEN_ODD_STRATEGY'
                ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white shadow-md shadow-amber-500/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Even/Odd Strategy (0–4 &amp; 5–9)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BARRIERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'BARRIERS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            Over 1-8 &amp; Under 9-1 Analysis (≥85%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RADAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'RADAR'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            Digit Frequency Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TICKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'TICKS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            Live Price Tape &amp; Ticks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STRATEGY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'STRATEGY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white bg-[#130a26] border border-purple-900/50'
            }`}
          >
            Multi-Contract Breakdown
          </button>
        </div>

        {/* TAB: BABYOIL SPEEDBOT SMC STRATEGY & 1M CANDLESTICK CHART */}
        {activeTab === 'SMC_STRATEGY' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. Interactive Live 1m Candlestick Chart with SMC Annotations */}
            <CandlestickChart
              data={market.candlestickData1m || []}
              symbol={symbol}
              marketName={displayName}
              pipSize={pipSize}
              height={420}
              smcAnalysis={market.prediction.smcStrategy}
              showSmcAnnotations={true}
            />

            {/* 2. Comprehensive SMC Rise/Fall Strategy Analysis & Rule Breakdown */}
            <SmcRiseFallAnalysis
              analysis={market.prediction.smcStrategy}
              compact={false}
              pipSize={pipSize}
            />
          </div>
        )}

        {/* TAB 0: OVER 1–8 TRADING STRATEGY ENGINE */}
        {activeTab === 'OVER_STRATEGY' && (() => {
          const momentumMap = computeDigitMomentumMap(recentDigits);
          const currentOver = evaluateOverLevelStrategy(
            inspectOverLevel,
            recentDigits,
            momentumMap
          );

          const overLevelsList: { level: OverLevel; label: string; range: string }[] = [
            { level: 1, label: 'Over 1', range: '2–9' },
            { level: 2, label: 'Over 2', range: '3–9' },
            { level: 3, label: 'Over 3', range: '4–9' },
            { level: 4, label: 'Over 4', range: '5–9' },
            { level: 5, label: 'Over 5', range: '6–9' },
            { level: 6, label: 'Over 6', range: '7–9' },
            { level: 7, label: 'Over 7', range: '8–9' },
            { level: 8, label: 'Over 8', range: '9' },
          ];

          return (
            <div className="space-y-4 font-sans animate-fadeIn">
              {/* Strategy Rules Reference Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 to-[#130826] border border-purple-700/60 text-xs text-purple-100 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-pink-300 text-xs uppercase tracking-wider">
                  <Target className="w-4 h-4 text-pink-400" />
                  <span>Over 1–8 Trading Strategy Framework</span>
                </div>
                <p className="text-[11px] text-purple-200/90 leading-relaxed">
                  When analyzing <strong>Over 1 to Over 8</strong>, the valid range adapts directly to the selected barrier. Green-bar digits inside the valid range must demonstrate strong momentum (<strong>≥ 12% and increasing</strong>). Digits at or below the barrier should be suppressed (<strong>&lt; 10% red bars</strong>), creating a statistical edge.
                </p>
              </div>

              {/* Over Level Selector (Over 1 to Over 8) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Select Over Level to Inspect (1–8):
                  </span>
                  <span className="text-pink-400 font-mono font-bold text-xs">
                    Target: Over {inspectOverLevel} (Valid: {currentOver.validRangeLabel})
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {overLevelsList.map((item) => {
                    const isSelected = inspectOverLevel === item.level;
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setInspectOverLevel(item.level)}
                        className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-gradient-to-b from-pink-500 to-purple-600 border-pink-400 text-white shadow-md shadow-pink-500/30 ring-1 ring-pink-300'
                            : 'bg-[#120722] hover:bg-purple-950/60 border-purple-900/60 text-purple-300'
                        }`}
                      >
                        <div className="font-extrabold text-xs font-mono">{item.label}</div>
                        <div className="text-[10px] text-purple-200/80 font-mono mt-0.5">
                          {item.range}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strategy Verification Status Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  currentOver.isAllConditionsMet
                    ? 'bg-gradient-to-r from-emerald-950/50 via-[#10291f] to-[#0e1d16] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'bg-[#130a26] border-purple-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-900/40">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono flex items-center gap-1.5 ${
                        currentOver.isAllConditionsMet
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {currentOver.isAllConditionsMet ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 inline" />
                          TRADE SIGNAL VERIFIED
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 inline" />
                          MONITORING / CONDITIONS PENDING
                        </>
                      )}
                    </span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      Contract: <strong>OVER {currentOver.level}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-purple-300">
                      Calculated Confidence:{' '}
                      <strong className={currentOver.confidence >= 85 ? 'text-emerald-400' : 'text-amber-400'}>
                        {currentOver.confidence}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 4 Conditions Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                  {/* Condition 1: Valid Range */}
                  <div className="p-3 rounded-lg bg-[#0e051c] border border-purple-900/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">1. Target Range Adaptation</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                        ACTIVE ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      Analyzing digits <strong>{currentOver.validRangeLabel}</strong> for Over {currentOver.level}. Target range dynamically adapts to level.
                    </p>
                  </div>

                  {/* Condition 2: Green Bar Momentum */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      currentOver.conditions.greenBarValid
                        ? 'bg-emerald-950/30 border-emerald-700/60'
                        : 'bg-[#0e051c] border-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">2. Green-Bar Momentum (≥12% ↗)</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          currentOver.conditions.greenBarValid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {currentOver.conditions.greenBarValid ? 'PASSED ✓' : 'PENDING ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      {currentOver.greenBarDigits.length > 0 ? (
                        <span>
                          Green-bar digit(s):{' '}
                          {currentOver.greenBarDigits
                            .map((g) => `Digit ${g.digit} (${g.percent}%, +${g.momentumDelta}% ↗)`)
                            .join(', ')}
                        </span>
                      ) : (
                        <span>No digit in range {currentOver.validRangeLabel} has reached ≥ 12% with increasing momentum.</span>
                      )}
                    </p>
                  </div>

                  {/* Condition 3: Lower Barrier & Red Bars */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      currentOver.conditions.lowerRangeValid
                        ? 'bg-purple-950/30 border-purple-700/60'
                        : 'bg-[#0e051c] border-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">3. Lower Barrier (&lt;10% Red Bars)</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          currentOver.conditions.lowerRangeValid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {currentOver.conditions.lowerRangeValid ? 'PASSED ✓' : 'HIGH ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      Losing digits [{currentOver.losingRangeLabel}] average <strong>{currentOver.lowerRangeAvgPercent}%</strong>. Red-bar digits (&lt;10%):{' '}
                      {currentOver.redBarDigits.length > 0
                        ? currentOver.redBarDigits.map((r) => `Digit ${r.digit} (${r.percent}%)`).join(', ')
                        : 'None below 10%'}
                    </p>
                  </div>

                  {/* Condition 4: Probabilistic Mass Edge */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      currentOver.conditions.edgeValid
                        ? 'bg-emerald-950/30 border-emerald-700/60'
                        : 'bg-[#0e051c] border-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">4. Valid vs Lower Edge</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          currentOver.conditions.edgeValid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {currentOver.conditions.edgeValid ? 'PASSED ✓' : 'DEFICIT ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      Valid range {currentOver.validRangeLabel} has <strong>{currentOver.validRangeTotalPercent}%</strong> total frequency vs{' '}
                      <strong>{currentOver.lowerRangeTotalPercent}%</strong> in lower range {currentOver.losingRangeLabel}.
                    </p>
                  </div>
                </div>

                {/* Reason Explanation */}
                <div className="mt-3 pt-2 border-t border-purple-900/40 text-xs text-purple-200 flex items-center gap-2">
                  <span className="text-pink-400 font-bold uppercase tracking-wider text-[10px] shrink-0 font-mono">
                    Evaluation Verdict:
                  </span>
                  <span className="font-medium text-slate-300">{currentOver.strategyReason}</span>
                </div>
              </div>

              {/* Complete Digits 0–9 Momentum & Bar Classification Matrix */}
              <div className="p-4 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Digit Momentum &amp; Bar Classification Matrix (Digits 0–9)
                    </h4>
                    <p className="text-[10px] text-purple-300/70">
                      Color classification reflects Strategy rules: Green (≥12% &amp; increasing momentum), Red (&lt;10%), Neutral.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Green Bar (≥12% ↗)
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Red Bar (&lt;10%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                    const info = momentumMap[digit];
                    const isValidRange = digit > inspectOverLevel;
                    const isGreenBar = info.isGreenBar;
                    const isRedBar = info.isRedBar;

                    return (
                      <div
                        key={digit}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isGreenBar && isValidRange
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-900/30'
                            : isRedBar && !isValidRange
                            ? 'bg-rose-950/50 border-rose-600/70'
                            : isGreenBar
                            ? 'bg-emerald-950/30 border-emerald-700/40'
                            : isRedBar
                            ? 'bg-rose-950/30 border-rose-800/40'
                            : isValidRange
                            ? 'bg-[#180e2f] border-purple-700/40'
                            : 'bg-[#100720] border-purple-950'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">
                          {isValidRange ? `Win (> ${inspectOverLevel})` : `Loss (≤ ${inspectOverLevel})`}
                        </div>
                        <div className="text-xl font-black font-mono my-1 text-white flex items-center justify-center gap-1">
                          <span>{digit}</span>
                          {info.momentumDirection === 'INCREASING' && (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {info.momentumDirection === 'DECREASING' && (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </div>
                        <div className="text-xs font-mono font-extrabold text-pink-300">
                          {info.percent}%
                        </div>
                        <div
                          className={`text-[10px] font-mono font-bold mt-1 ${
                            info.momentumDelta > 0
                              ? 'text-emerald-400'
                              : info.momentumDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {info.momentumDelta > 0 ? `+${info.momentumDelta}%` : `${info.momentumDelta}%`}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              isGreenBar
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                                : isRedBar
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60'
                                : 'bg-purple-950 text-purple-400'
                            }`}
                          >
                            {isGreenBar ? 'GREEN' : isRedBar ? 'RED' : 'NEUTRAL'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB: EVEN / ODD TWO-PART STRATEGY ENGINE (0 to 4 & 5 to 9) */}
        {activeTab === 'EVEN_ODD_STRATEGY' && (
          <div className="space-y-4 animate-fadeIn">
            <EvenOddTwoPartAnalysis
              analysis={prediction.evenOddStrategy || evaluateEvenOddStrategy(recentDigits)}
              compact={false}
            />
          </div>
        )}

        {/* TAB 0: BARRIERS (Over 1..8 and Under 9..1) */}
        {activeTab === 'BARRIERS' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
              <strong>Trade Strategy Rule:</strong> Only contracts reaching <strong>≥ 85% confidence</strong> are marked for trading. High probability contracts give superior edge in Deriv synthetic markets.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Over 1 to Over 8 Table */}
              <div className="p-4 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                  <span className="text-xs font-bold text-pink-300">OVER 1 to OVER 8 Analysis</span>
                  <span className="text-[10px] text-purple-300/70 uppercase font-mono">Prob. (%)</span>
                </div>
                <div className="space-y-2">
                  {overBarriers.map((b) => (
                    <div
                      key={b.label}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors ${
                        b.isEligible
                          ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                          : 'bg-[#180e2f]/80 border border-purple-900/40 text-purple-300/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{b.label}</span>
                        {b.isEligible && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold">
                            TRADE (≥85%)
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm">{b.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Under 9 to Under 1 Table */}
              <div className="p-4 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                  <span className="text-xs font-bold text-sky-300">UNDER 9 to UNDER 1 Analysis</span>
                  <span className="text-[10px] text-purple-300/70 uppercase font-mono">Prob. (%)</span>
                </div>
                <div className="space-y-2">
                  {underBarriers.map((b) => (
                    <div
                      key={b.label}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors ${
                        b.isEligible
                          ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                          : 'bg-[#180e2f]/80 border border-purple-900/40 text-purple-300/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{b.label}</span>
                        {b.isEligible && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold">
                            TRADE (≥85%)
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm">{b.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: RADAR (0-9 Digit Distribution) */}
        {activeTab === 'RADAR' && (
          <div className="space-y-4">
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={digitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="digitNum" stroke="#a855f7" fontSize={11} />
                  <YAxis stroke="#a855f7" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#120824',
                      borderColor: '#7e22ce',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="percentage" name="Frequency %" radius={[4, 4, 0, 0]}>
                    {digitChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hot vs Cold badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-900/50">
                <span className="font-bold text-pink-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  Hottest Digits (High Repeat Probabilities)
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {stats.hottestDigits.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-md bg-pink-600 text-white font-mono font-extrabold text-xs"
                    >
                      Digit {d} ({stats.digitFrequencies[d]}x)
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-900/50">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  Coldest Digits (Optimal Differ Targets)
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {stats.coldestDigits.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-md bg-sky-600 text-white font-mono font-extrabold text-xs"
                    >
                      Digit {d} ({stats.digitFrequencies[d]}x)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TICKS (Price Chart and History Table) */}
        {activeTab === 'TICKS' && (
          <div className="space-y-4">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceChartData}>
                  <XAxis dataKey="tick" stroke="#a855f7" fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke="#a855f7" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#120824',
                      borderColor: '#7e22ce',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Micro Ticks Tape */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-purple-300/70">Recent 25 Ticks Stream:</span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#130a26] rounded-xl border border-purple-900/50">
                {recentDigits.map((d, i) => (
                  <span
                    key={i}
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shadow-xs ${
                      d > 4 ? 'bg-purple-900 text-purple-200 border border-purple-700/60' : 'bg-[#180e2f] text-teal-300 border border-purple-900/50'
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STRATEGY (Multi-Contract Breakdown) */}
        {activeTab === 'STRATEGY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-1.5">
              <span className="font-bold text-purple-300">Even vs Odd Parity</span>
              <div className="flex items-center justify-between font-mono font-bold text-sm">
                <span className="text-blue-400">Even: {stats.evenPercent}% ({stats.evenCount})</span>
                <span className="text-amber-400">Odd: {stats.oddPercent}% ({stats.oddCount})</span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                <div className="bg-blue-500 h-full" style={{ width: `${stats.evenPercent}%` }} />
                <div className="bg-amber-500 h-full" style={{ width: `${stats.oddPercent}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-1.5">
              <span className="font-bold text-purple-300">Over vs Under (Barrier 4/5)</span>
              <div className="flex items-center justify-between font-mono font-bold text-sm">
                <span className="text-purple-400">Over: {stats.overPercent}% ({stats.overCount})</span>
                <span className="text-teal-400">Under: {stats.underPercent}% ({stats.underCount})</span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                <div className="bg-purple-500 h-full" style={{ width: `${stats.overPercent}%` }} />
                <div className="bg-teal-500 h-full" style={{ width: `${stats.underPercent}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-1.5">
              <span className="font-bold text-purple-300">Matches vs Differs Distribution</span>
              <div className="flex items-center justify-between font-mono font-bold text-sm">
                <span className="text-emerald-400">Differs: {stats.differsPercent}%</span>
                <span className="text-pink-400">Matches: {stats.matchesPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${stats.differsPercent}%` }} />
                <div className="bg-pink-500 h-full" style={{ width: `${stats.matchesPercent}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130a26] border border-purple-900/50 space-y-1.5">
              <span className="font-bold text-purple-300">Rise vs Fall Momentum</span>
              <div className="flex items-center justify-between font-mono font-bold text-sm">
                <span className="text-emerald-400">Rise: {stats.risePercent}%</span>
                <span className="text-rose-400">Fall: {stats.fallPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${stats.risePercent}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${stats.fallPercent}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-purple-900/50 text-xs">
          <div className="flex items-center gap-2">
            {market.scanState === 'SCANNING' ? (
              <span className="flex items-center gap-1.5 text-pink-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                Scanning market ({market.scanProgress}%) &bull; Next prediction in <strong className="text-pink-400 font-mono">{countdown}s</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Analysis complete &bull; Next scan in <strong className="text-pink-400 font-mono">{countdown}s</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

