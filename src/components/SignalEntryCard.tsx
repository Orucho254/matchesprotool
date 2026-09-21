import React, { useState } from 'react';
import { DigitPredictionSignal } from '../types';
import {
  Activity,
  Zap,
  Clock,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  Target,
  Sparkles,
} from 'lucide-react';

interface SignalEntryCardProps {
  signal: DigitPredictionSignal;
  compact?: boolean;
  marketName?: string;
  className?: string;
}

export const SignalEntryCard: React.FC<SignalEntryCardProps> = ({
  signal,
  compact = false,
  marketName,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const {
    tradeInstruction,
    actionType,
    contractCategory,
    confidence,
    riskRewardRatio,
    payoutEst,
    recommendedDuration,
    isTradeReady,
    statusText,
    tacticalReason,
  } = signal;

  const displayName = marketName || 'Volatility Index';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${displayName} - Prediction Signal\nAction: ${tradeInstruction}\nContract: ${contractCategory}\nConfidence: ${confidence}%\nDuration: ${recommendedDuration}\nR:R: ${riskRewardRatio}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine badge and color theme based on action type
  const isOverUnder = actionType.startsWith('OVER') || actionType.startsWith('UNDER');
  const isEvenOdd = actionType === 'EVEN' || actionType === 'ODD';
  const isDiffersMatches = actionType.includes('DIFF') || actionType.includes('MATCH');
  const isRiseFall = actionType === 'RISE' || actionType === 'FALL';

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 ${
        isTradeReady
          ? 'bg-gradient-to-b from-[#180e2f] via-[#130a26] to-[#0d061c] border-emerald-500/50 shadow-[0_4px_16px_rgba(16,185,129,0.15)]'
          : 'bg-[#120822]/95 border-purple-900/60 shadow-md'
      } ${compact ? 'p-2.5' : 'p-3'} ${className}`}
    >
      {/* 1. Top Header: Dynamic Market Auto-Branding & Contract Category */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
            <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black tracking-wide uppercase font-mono text-purple-200 truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-purple-300/70 font-mono">
                ({contractCategory})
              </span>
            </div>
          </div>
        </div>

        {/* Risk / Reward & One-Click Copy */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-2xs">
            R:R {riskRewardRatio}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Prediction Rule"
            className="p-1 rounded-md bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 hover:text-white border border-purple-800/60 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Bold Digit-Based Prediction Display Box (Replaces old SL/TP boxes) */}
      <div
        className={`rounded-lg border p-2.5 flex flex-col justify-center gap-1.5 ${
          isTradeReady
            ? 'bg-gradient-to-r from-[#170a2c]/95 via-[#1c0e35]/95 to-[#120623]/95 border-emerald-500/40 shadow-inner'
            : 'bg-[#140826]/90 border-purple-900/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Main Trade Action Text (e.g., TRADE: OVER 1, TRADE: UNDER 9, TRADE: EVEN) */}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                isTradeReady
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                  : 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
              }`}
            >
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-purple-300/70 font-bold block">
                Recommended Bet
              </span>
              <span
                className={`text-sm sm:text-base font-black tracking-wide font-mono ${
                  isTradeReady ? 'text-emerald-300' : 'text-slate-200'
                }`}
              >
                {tradeInstruction}
              </span>
            </div>
          </div>

          {/* Probability / Win Rate Badge */}
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-purple-300/70 font-bold block">
              Confidence
            </span>
            <span
              className={`text-xs sm:text-sm font-black font-mono flex items-center justify-end gap-1 ${
                isTradeReady ? 'text-emerald-400' : 'text-purple-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 inline text-emerald-400" />
              {confidence}%
            </span>
          </div>
        </div>

        {/* Sub-Metrics: Duration & Est Payout */}
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-purple-900/40 font-mono text-[10px]">
          <div className="flex items-center justify-between px-2 py-1 rounded bg-[#180a30]/80 border border-purple-900/50">
            <span className="text-purple-300/70 font-sans font-medium flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              Duration:
            </span>
            <span className="font-bold text-cyan-300">{recommendedDuration}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded bg-[#180a30]/80 border border-purple-900/50">
            <span className="text-purple-300/70 font-sans font-medium flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-amber-400" />
              Est. Payout:
            </span>
            <span className="font-bold text-emerald-300">{payoutEst}</span>
          </div>
        </div>
      </div>

      {/* 3. Execution Target Status Line */}
      <div className="mt-2 pt-1.5 border-t border-purple-900/40 flex items-center justify-between text-[10px]">
        <span className="text-purple-300/70 font-medium truncate">
          Execution Target:
        </span>
        <span
          className={`font-mono font-bold flex items-center gap-1 ${
            isTradeReady ? 'text-emerald-400' : 'text-amber-400/90'
          }`}
        >
          {isTradeReady ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>TRADE READY: {tradeInstruction}</span>
            </>
          ) : (
            <>
              <Clock className="w-2.5 h-2.5 inline" />
              <span>ANALYZING (NEEDS ≥85%): {actionType}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};
