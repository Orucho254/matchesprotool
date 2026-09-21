import React from 'react';
import { DerivMarketItem, ToolType } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Activity,
} from 'lucide-react';
import { calculateDigitPredictionSignal } from '../utils/signalCalculator';
import { SignalEntryCard } from './SignalEntryCard';
import { EvenOddTwoPartAnalysis } from './EvenOddTwoPartAnalysis';
import { SmcRiseFallAnalysis } from './SmcRiseFallAnalysis';

interface MarketCardProps {
  market: DerivMarketItem;
  toolType: ToolType;
  onOpenModal: (market: DerivMarketItem) => void;
  isHighestPick?: boolean;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  toolType,
  onOpenModal,
  isHighestPick = false,
}) => {
  const {
    displayName,
    currentPrice,
    priceDelta,
    lastDigit,
    recentDigits,
    countdown,
    totalCycleTime,
    scanState,
    scanProgress,
    signalStability,
    invalidationAlert,
    prediction,
    pipSize,
    stats,
  } = market;

  const formattedPrice = currentPrice.toFixed(pipSize);
  const isTradeEligible = prediction.confidence >= 85;
  const digitSignal = calculateDigitPredictionSignal(market);

  // States
  const isScanning = scanState === 'SCANNING' || scanState === 'ANALYZING';
  const isSignalActive = scanState === 'SIGNAL_ACTIVE';
  const isMarketChanging = scanState === 'MARKET_CHANGING';
  const isInvalidated = scanState === 'SIGNAL_INVALIDATED';
  const isWait = scanState === 'WAIT';

  // Format seconds to mm:ss format (e.g. 00:58)
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress for the circular ring
  const ringProgress = isScanning
    ? scanProgress
    : Math.max(0, Math.min(100, Math.round((countdown / Math.max(1, totalCycleTime)) * 100)));

  const strokeDashoffset = isScanning
    ? Math.max(0, 100 - ringProgress)
    : Math.max(0, 100 - ringProgress);

  return (
    <div
      onClick={() => onOpenModal(market)}
      className={`group relative bg-gradient-to-b from-[#1c1236] via-[#150c2a] to-[#0e071e] hover:from-[#231744] hover:via-[#1a0f34] hover:to-[#130927] border rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden ${
        isHighestPick
          ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35),0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-cyan-400/50'
          : isInvalidated
          ? 'border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/40'
          : isMarketChanging
          ? 'border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          : isSignalActive && isTradeEligible
          ? 'border-emerald-500/60 hover:border-emerald-400 shadow-[0_8px_30px_rgba(16,185,129,0.25),0_0_20px_rgba(147,51,234,0.15)]'
          : isScanning
          ? 'border-pink-500/40 hover:border-pink-400/60 shadow-[0_8px_28px_rgba(236,72,153,0.15)]'
          : 'border-purple-800/40 hover:border-purple-500/60 shadow-[0_8px_28px_rgba(88,28,135,0.2)]'
      }`}
    >
      {/* Luminous Purple/Violet Underglow Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1.5 transition-all shadow-[0_2px_14px_rgba(192,132,252,0.7)] ${
          isInvalidated
            ? 'bg-gradient-to-r from-rose-600 via-rose-400 to-amber-500'
            : isMarketChanging
            ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-500'
            : isSignalActive
            ? 'bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-500'
            : 'bg-gradient-to-r from-purple-600 via-fuchsia-400 to-indigo-500 group-hover:from-purple-500 group-hover:via-fuchsia-300'
        }`}
      />

      {/* Top glow highlight */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all ${
          isHighestPick
            ? 'from-cyan-400 via-sky-300 to-cyan-400'
            : isInvalidated
            ? 'from-rose-500 via-rose-400 to-rose-500'
            : isMarketChanging
            ? 'from-amber-500 via-yellow-400 to-amber-500'
            : isSignalActive
            ? 'from-emerald-500 via-teal-400 to-emerald-500'
            : 'from-pink-500/60 via-fuchsia-400 to-pink-500/60'
        }`}
      />

      {/* 1. Header: Market Title & Contract */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h3 className="text-base font-bold text-[#f472b6] group-hover:text-[#f9a8d4] tracking-tight transition-colors">
            {displayName}
          </h3>
          {isHighestPick && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 flex items-center gap-0.5">
              <Award className="w-2.5 h-2.5 text-cyan-300" />
              TOP PICK
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-purple-300/80 uppercase font-bold tracking-wider">
          {prediction.contractType || 'OVER / UNDER'}
        </div>
      </div>

      {/* 2. Center: Circular Countdown Timer + Pink Ring */}
      <div className="my-3 flex flex-col items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
            <defs>
              <linearGradient id={`grad-ring-${market.symbol}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {isInvalidated ? (
                  <>
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </>
                ) : isMarketChanging ? (
                  <>
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </>
                )}
              </linearGradient>
            </defs>
            {/* Background ring */}
            <path
              className="text-purple-950/80"
              strokeWidth="2.8"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Animated countdown ring */}
            <path
              className="transition-all duration-700 ease-out"
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="2.8"
              strokeLinecap="round"
              stroke={`url(#grad-ring-${market.symbol})`}
              fill="none"
              style={{
                filter: isInvalidated
                  ? 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.7))'
                  : 'drop-shadow(0 0 5px rgba(236, 72, 153, 0.6))',
              }}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>

          {/* Center inner dark pill */}
          <div className="absolute inset-2 rounded-full bg-[#120824] border border-purple-800/60 flex flex-col items-center justify-center shadow-inner group-hover:border-pink-500/40 transition-colors">
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tighter">
              {countdown}s
            </span>
          </div>
        </div>

        {/* Live State Badge under circular ring */}
        <div className="flex items-center gap-1.5 mt-2">
          {isScanning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-950/60 border border-pink-500/30 text-pink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping shrink-0" />
              <span className="text-[11px] font-bold tracking-wide">
                SCANNING ({scanProgress}%)
              </span>
            </div>
          ) : isInvalidated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-[11px] font-black tracking-wide">
                SIGNAL INVALIDATED
              </span>
            </div>
          ) : isMarketChanging ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-300">
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-[11px] font-black tracking-wide">
                MARKET CHANGING
              </span>
            </div>
          ) : isSignalActive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[11px] font-black tracking-wide">
                SIGNAL ACTIVE
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] font-bold">
                WAIT FOR SETUP
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Live Prediction / Signal Monitoring Box */}
      <div className="space-y-2.5">
        {/* Case A: Invalidation Alert Banner */}
        {isInvalidated ? (
          <div className="p-3.5 rounded-xl border border-rose-500/60 bg-gradient-to-b from-[#2a0d1e] via-[#1f0917] to-[#14050f] shadow-[0_0_20px_rgba(244,63,94,0.25)] space-y-2 animate-pulse">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>⚠ MARKET CHANGED</span>
            </div>
            <div className="text-[11px] text-rose-200/90 font-mono space-y-0.5">
              <div>
                Previous signal:{' '}
                <span className="font-bold text-white line-through">
                  {invalidationAlert?.previousSignal || prediction.primarySignal}
                </span>
              </div>
              <div className="text-rose-400 font-bold">Signal invalidated.</div>
              <div className="text-purple-300 text-[10px] pt-1">
                Re-analyzing market...
              </div>
            </div>
          </div>
        ) : isScanning ? (
          /* Case B: Scanning Mode */
          <div className="p-3.5 rounded-xl border border-pink-500/30 bg-gradient-to-b from-[#1a0e30] via-[#130826] to-[#0d051a] shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-pink-500/20 flex items-center justify-center border border-pink-500/40">
                  <Zap className="w-3 h-3 text-pink-400 animate-pulse" />
                </div>
                <span className="text-xs font-black font-mono text-pink-200 uppercase tracking-wide">
                  Scanning market…
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-950/90 text-pink-300 border border-pink-700/60 animate-pulse">
                {scanProgress}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden relative border border-purple-900/60">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-400 to-pink-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                  style={{ width: `${Math.max(8, scanProgress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-purple-300/70 font-mono">
                <span>Collecting market data…</span>
                <span className="text-pink-400 font-bold">{countdown}s to signal</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Trade Status:</span>
              <span className="font-bold text-pink-400 flex items-center gap-1 font-mono uppercase text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                ANALYZING TICKS
              </span>
            </div>
          </div>
        ) : (
          /* Case C: Active Signal Monitoring Mode (with 40–60s trading window) */
          <div
            className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
              isMarketChanging
                ? 'border-amber-500/60 bg-gradient-to-b from-[#221305] via-[#1a0e04] to-[#120902]'
                : isTradeEligible
                ? 'border-emerald-500/50 bg-gradient-to-b from-[#1c0e35] via-[#150a29] to-[#0e041d] shadow-[0_0_18px_rgba(16,185,129,0.14)]'
                : 'border-amber-500/40 bg-gradient-to-b from-[#1c0e35] via-[#160a26] to-[#0e041d]'
            }`}
          >
            {/* Top Row: Signal Status & Trade Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                    isMarketChanging
                      ? 'bg-amber-950 text-amber-300 border border-amber-600/60'
                      : 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60'
                  }`}
                >
                  {isMarketChanging ? 'MARKET CHANGING' : 'SIGNAL ACTIVE'}
                </span>
              </div>

              {isTradeEligible ? (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                  STATUS: TRADE
                </span>
              ) : (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-xs">
                  STATUS: WAIT
                </span>
              )}
            </div>

            {/* Middle Grid: PREDICTION & RECOMMENDED TRADE */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* PREDICTION */}
              <div className="p-2.5 rounded-lg bg-[#0e051c] border border-purple-900/60 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  PREDICTION
                </span>
                <span
                  className={`text-base font-black font-mono mt-0.5 tracking-wide ${
                    isTradeEligible ? 'text-[#00f59b]' : 'text-amber-400'
                  }`}
                >
                  {prediction.primarySignal}
                </span>
              </div>

              {/* RECOMMENDED TRADE */}
              <div className="p-2.5 rounded-lg bg-[#0e051c] border border-purple-900/60 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  RECOMMENDED TRADE
                </span>
                <span
                  className={`text-base font-black font-mono mt-0.5 tracking-wide ${
                    isTradeEligible ? 'text-[#2dd4bf]' : 'text-amber-400'
                  }`}
                >
                  {prediction.recommendedTrade || prediction.primarySignal}
                </span>
              </div>
            </div>

            {/* Confidence, Trading Window & Signal Strength */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-purple-900/50 text-[11px] font-mono">
              {/* Confidence */}
              <div className="p-1.5 rounded bg-[#0b0416] border border-purple-950 text-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">CONFIDENCE</div>
                <div
                  className={`font-black ${
                    prediction.confidence >= 85 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {prediction.confidence}%
                </div>
              </div>

              {/* Trading Window */}
              <div className="p-1.5 rounded bg-[#0b0416] border border-purple-950 text-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">WINDOW</div>
                <div className="font-black text-pink-300">
                  {formatTime(countdown)}
                </div>
              </div>

              {/* Signal Strength */}
              <div className="p-1.5 rounded bg-[#0b0416] border border-purple-950 text-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">STRENGTH</div>
                <div
                  className={`font-black text-[10px] ${
                    signalStability === 'WEAKENING'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {signalStability === 'WEAKENING' ? 'WEAKENING' : 'STABLE'}
                </div>
              </div>
            </div>

            {/* Over 1–8 Strategy Breakdown Banner (Active when overStrategy is available) */}
            {prediction.overStrategy && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#170a2d] to-[#0e041d] border border-purple-800/70 space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-pink-400 font-extrabold uppercase">
                      OVER {prediction.overStrategy.level} STRATEGY
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                      Valid: {prediction.overStrategy.validRangeLabel}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      prediction.overStrategy.isAllConditionsMet
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-amber-950/90 text-amber-300 border border-amber-600/60'
                    }`}
                  >
                    {prediction.overStrategy.isAllConditionsMet ? 'STRATEGY VERIFIED' : 'CONDITIONS PENDING'}
                  </span>
                </div>

                {/* Green & Red Bar Indicators */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {/* Green Bar (≥12% & increasing momentum) */}
                  <div
                    className={`p-1.5 rounded-lg border ${
                      prediction.overStrategy.conditions.greenBarValid
                        ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-[9px] uppercase font-bold text-slate-400">Green-Bar Driver (≥12% ↗)</div>
                    <div className="font-extrabold truncate mt-0.5">
                      {prediction.overStrategy.greenBarDigits.length > 0 ? (
                        <span>
                          Digit {prediction.overStrategy.greenBarDigits[0].digit} (
                          {prediction.overStrategy.greenBarDigits[0].percent}%, +
                          {prediction.overStrategy.greenBarDigits[0].momentumDelta}% ↗)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">None ≥12% &amp; Increasing</span>
                      )}
                    </div>
                  </div>

                  {/* Lower Barrier Digits (<10% Red) */}
                  <div
                    className={`p-1.5 rounded-lg border ${
                      prediction.overStrategy.conditions.lowerRangeValid
                        ? 'bg-purple-950/50 border-purple-800/60 text-purple-200'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="text-[9px] uppercase font-bold text-slate-400">
                      Lower Barrier [{prediction.overStrategy.losingRangeLabel}]
                    </div>
                    <div className="font-extrabold truncate mt-0.5">
                      Avg {prediction.overStrategy.lowerRangeAvgPercent}%{' '}
                      {prediction.overStrategy.conditions.lowerRangeValid ? '(Suppressed)' : '(High >10%)'}
                    </div>
                  </div>
                </div>

                {/* 4 Strategy Conditions Checklist */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-purple-900/40 text-[9px]">
                  <span className="text-emerald-400 font-bold">
                    Range [{prediction.overStrategy.validRangeLabel}] ✓
                  </span>
                  <span
                    className={
                      prediction.overStrategy.conditions.greenBarValid ? 'text-emerald-400 font-bold' : 'text-amber-400'
                    }
                  >
                    Green Bar: {prediction.overStrategy.conditions.greenBarValid ? '✓' : 'Pending'}
                  </span>
                  <span
                    className={
                      prediction.overStrategy.conditions.lowerRangeValid ? 'text-emerald-400 font-bold' : 'text-amber-400'
                    }
                  >
                    Lower &lt;10%: {prediction.overStrategy.conditions.lowerRangeValid ? '✓' : 'Pending'}
                  </span>
                  <span
                    className={
                      prediction.overStrategy.conditions.edgeValid ? 'text-emerald-400 font-bold' : 'text-amber-400'
                    }
                  >
                    Mass Edge: {prediction.overStrategy.conditions.edgeValid ? '✓' : 'Pending'}
                  </span>
                </div>
              </div>
            )}

            {/* Even/Odd Quantitative Two-Part Strategy Breakdown (Active when evenOddStrategy is available) */}
            {prediction.evenOddStrategy && (
              <EvenOddTwoPartAnalysis analysis={prediction.evenOddStrategy} compact={true} />
            )}

            {/* BABYOIL SPEEDBOT on D-Xpert SMC Rise/Fall Strategy Section */}
            {prediction.smcStrategy && (
              <SmcRiseFallAnalysis
                analysis={prediction.smcStrategy}
                compact={true}
                pipSize={pipSize}
              />
            )}

            {/* Matches / Differs Strategy Breakdown Section */}
            {toolType === 'MATCHES' && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#1f1508] to-[#120a03] border border-amber-800/60 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-amber-400 font-extrabold uppercase">
                      MATCHES / DIFFERS ENGINE
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-600/70">
                    TARGET: DIGIT {prediction.targetDigit ?? stats.coldestDigits[0] ?? 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="p-1 rounded bg-black/30 border border-amber-900/40 text-amber-200">
                    <span className="text-[9px] text-slate-400 block">Coldest Digits:</span>
                    <span className="font-bold">
                      {stats.coldestDigits.slice(0, 3).join(', ')} (Low Decay)
                    </span>
                  </div>
                  <div className="p-1 rounded bg-black/30 border border-amber-900/40 text-amber-200">
                    <span className="text-[9px] text-slate-400 block">Differ Safety Edge:</span>
                    <span className="font-bold text-emerald-400">
                      {stats.differsPercent || 95}% Probability
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="pt-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                REASON:
              </div>
              <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-2">
                {prediction.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Binary Trading Signal Rule Pill */}
        {!isScanning && !isInvalidated && (
          <SignalEntryCard signal={digitSignal} marketName={displayName} />
        )}

        {/* 4. Live Price & Last Digit Bar */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <span>Live Price:</span>
            <span className="font-mono text-slate-200 font-bold">{formattedPrice}</span>
            {priceDelta >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400 inline" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-400 inline" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Last Digit:</span>
            <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs bg-[#c2410c] text-white shadow-xs border border-orange-500/40">
              {lastDigit}
            </span>
          </div>
        </div>

        {/* 5. Rolling Mini Digits Stream Tape */}
        <div className="flex items-center justify-between gap-1 pt-0.5 overflow-hidden">
          <div className="text-[10px] text-purple-300/70 font-bold shrink-0 uppercase tracking-wider">
            TAPE:
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {recentDigits.slice(-7).map((d, i) => (
              <span
                key={i}
                className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-transform ${
                  i === recentDigits.slice(-7).length - 1
                    ? 'bg-[#9333ea] text-white shadow-md scale-105'
                    : 'bg-[#160d2b] text-[#2dd4bf] border border-purple-900/60'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
