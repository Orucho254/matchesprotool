import React from 'react';
import { CheckCircle2, Clock, Sparkles, BarChart2 } from 'lucide-react';

export interface DigitStatItem {
  digit: number;
  count: number;
  matchPercent: number;
  differPercent: number;
  absence: number;
}

export interface RecommendationCardData {
  marketName: string;
  targetDigit: number | null;
  confidence: number;
  totalTicks: number;
  occurrences: number;
  absence: number;
  reason: string;
  recommendedTrade: string;
  validitySec: number;
  digitStats: DigitStatItem[];
}

interface TradingRecommendationCardProps {
  mode: 'matches' | 'differs' | 'signal';
  data: RecommendationCardData;
}

export const TradingRecommendationCard: React.FC<TradingRecommendationCardProps> = ({
  mode,
  data,
}) => {
  const {
    targetDigit,
    confidence,
    totalTicks,
    reason,
    recommendedTrade,
    validitySec,
    digitStats,
  } = data;

  const isMatches = mode === 'matches';
  const isDiffers = mode === 'differs';

  const headerTitle = isMatches
    ? 'TRADING RECOMMENDATION (MATCHES)'
    : isDiffers
    ? 'TRADING RECOMMENDATION (DIFFERS)'
    : 'TRADING RECOMMENDATION (SIGNAL)';

  const barrierLabel = isDiffers ? 'DIFFERING DIGIT' : 'MATCHING DIGIT';

  const engineLabel = isMatches
    ? 'Deriv Statistical Edge (Matches Engine)'
    : isDiffers
    ? 'Deriv Statistical Edge (Differs Engine)'
    : 'Deriv Statistical Edge (Composite Signal)';

  const activeDigit = targetDigit !== null ? targetDigit : null;
  const hasTarget = activeDigit !== null;

  return (
    <div
      id={`md-trading-signals-card-${mode}`}
      className="rounded-2xl bg-[#09101f] border border-[#16233b] p-5 shadow-2xl space-y-5"
    >
      {/* 1. Top Header Row: Title, Badges, and Target Digit Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              {headerTitle}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#06261d] text-[#00e599] border border-[#0d4f39] flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-[#00e599]" />
              STATUS: DERIV LIVE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0c1527] text-slate-400 border border-[#192740] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              {validitySec}s left
            </span>
          </div>

          {/* Main Recommendation Headline */}
          <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-center gap-3 pt-1">
            <span className="text-[#f59e0b] font-mono font-black">{recommendedTrade}</span>
            <span className="text-base sm:text-lg font-normal text-slate-400 font-sans">
              ({confidence}% Probability)
            </span>
          </div>
        </div>

        {/* Right-Side Barrier Card */}
        <div className="flex items-center gap-3.5 bg-[#0c1527] border border-[#192740] rounded-xl px-4 py-2.5 self-start sm:self-auto">
          <div className="text-left font-mono">
            <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
              {barrierLabel}
            </div>
            <div className="text-xs text-slate-400">Contract Barrier</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#00e599] text-slate-950 font-black text-2xl flex items-center justify-center font-mono shadow-[0_0_20px_rgba(0,229,153,0.35)]">
            {hasTarget ? activeDigit : '—'}
          </div>
        </div>
      </div>

      {/* 2. Statistical Edge Engine Label & Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">{engineLabel}</span>
          <span className="font-bold text-[#00e599]">{confidence}% Probability</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#111a2e] overflow-hidden">
          <div
            className="h-full bg-[#00e599] rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, confidence))}%`,
            }}
          />
        </div>
      </div>

      {/* 3. Quantitative Rationale Box */}
      <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#162238] text-xs font-mono space-y-1">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Quantitative Rationale:</span>
        </div>
        <p className="text-slate-400 leading-relaxed">{reason}</p>
      </div>

      {/* 4. Digit Frequency Distribution (Embedded inside the card exactly as shown in screenshot) */}
      <div className="pt-3 border-t border-[#16233b]/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-slate-300">
            <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
            <span>
              DIGIT FREQUENCY DISTRIBUTION ({totalTicks} LIVE DERIV TICKS ANALYZED)
            </span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Active Barrier Digit:{' '}
            <strong className="text-[#00e599] font-bold">{hasTarget ? activeDigit : '—'}</strong>
          </div>
        </div>

        {/* 10-Digit Boxes Grid (0 to 9) */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {digitStats.map((item) => {
            const digit = item.digit;
            const count = item.count;
            const isActiveBarrier = hasTarget && digit === activeDigit;

            const displayPercent = isDiffers
              ? `${item.differPercent}%`
              : `${item.matchPercent}%`;

            return (
              <div
                key={digit}
                className={`p-2 rounded-xl border text-center transition-all font-mono ${
                  isActiveBarrier
                    ? 'bg-[#06281e] border-[#00e599] shadow-[0_0_15px_rgba(0,229,153,0.25)] ring-1 ring-[#00e599]/50'
                    : 'bg-[#0c1527] border-[#18263e]'
                }`}
              >
                <div
                  className={`text-xs font-black ${
                    isActiveBarrier ? 'text-[#00e599]' : 'text-slate-200'
                  }`}
                >
                  {digit}
                </div>

                <div className="text-sm font-black text-white mt-0.5">{count}</div>

                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {displayPercent}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
