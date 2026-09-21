import React from 'react';
import { EvenOddStrategyAnalysis, EvenOddDigitPartItem } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';

interface EvenOddTwoPartAnalysisProps {
  analysis?: EvenOddStrategyAnalysis;
  compact?: boolean;
}

export const EvenOddTwoPartAnalysis: React.FC<EvenOddTwoPartAnalysisProps> = ({
  analysis,
  compact = false,
}) => {
  if (!analysis) return null;

  const {
    part1Digits,
    part2Digits,
    allDigits,
    totalPercentage,
    greenBarDigit,
    redBarDigit,
    secondMostDigit,
    oddDigits,
    evenDigits,
    conditions,
    isAllConditionsMet,
    confidence,
    recommendedTrade,
    strategyReason,
  } = analysis;

  const totalOddPercent = Math.round(oddDigits.reduce((acc, d) => acc + d.percent, 0) * 10) / 10;
  const totalEvenPercent = Math.round(evenDigits.reduce((acc, d) => acc + d.percent, 0) * 10) / 10;

  const renderDigitBlock = (item: EvenOddDigitPartItem) => {
    const isGreen = item.isGreenBar;
    const isRed = item.isRedBar;
    const isSecond = item.isSecondMost;

    return (
      <div
        key={item.digit}
        className={`relative p-2 rounded-xl border text-center transition-all flex flex-col justify-between ${
          isGreen
            ? 'bg-gradient-to-b from-emerald-950/80 to-[#0c1f17] border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/40'
            : isRed
            ? 'bg-gradient-to-b from-rose-950/80 to-[#1f0a12] border-rose-500 shadow-md shadow-rose-950/50 ring-1 ring-rose-400/40'
            : isSecond
            ? 'bg-gradient-to-b from-purple-950/70 to-[#180829] border-purple-500 shadow-sm ring-1 ring-purple-400/30'
            : item.isOdd
            ? 'bg-[#140b26] border-purple-800/50 hover:border-purple-700'
            : 'bg-[#0f091c] border-purple-900/40 hover:border-purple-800'
        }`}
      >
        {/* Parity & Rank Badge */}
        <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
          <span
            className={`px-1 py-0.5 rounded font-bold ${
              item.isOdd
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            }`}
          >
            {item.isOdd ? 'ODD' : 'EVEN'}
          </span>
          <span className="text-purple-300/70 text-[9px]">#{item.rank}</span>
        </div>

        {/* Digit Number */}
        <div className="my-1 flex items-center justify-center">
          <span
            className={`text-xl font-black font-mono tracking-tight ${
              isGreen
                ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : isRed
                ? 'text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : isSecond
                ? 'text-purple-200'
                : 'text-white'
            }`}
          >
            {item.digit}
          </span>
        </div>

        {/* Percentage inside the digit */}
        <div className="space-y-1">
          <div
            className={`text-xs font-mono font-black ${
              isGreen
                ? 'text-emerald-400'
                : isRed
                ? 'text-rose-400'
                : isSecond
                ? 'text-purple-300'
                : 'text-pink-300'
            }`}
          >
            {item.percent}%
          </div>
          {/* Mini progress fill */}
          <div className="w-full h-1 rounded-full bg-purple-950 overflow-hidden">
            <div
              className={`h-full ${
                isGreen
                  ? 'bg-emerald-400'
                  : isRed
                  ? 'bg-rose-400'
                  : isSecond
                  ? 'bg-purple-400'
                  : item.isOdd
                  ? 'bg-amber-400/80'
                  : 'bg-blue-400/80'
              }`}
              style={{ width: `${Math.min(100, Math.max(10, item.percent * 4))}%` }}
            />
          </div>
        </div>

        {/* Role Tag */}
        <div className="mt-1 pt-1 border-t border-purple-900/40 min-h-[18px] flex items-center justify-center">
          {isGreen && (
            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 whitespace-nowrap tracking-tight">
              GREEN BAR
            </span>
          )}
          {isRed && (
            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-500 text-white whitespace-nowrap tracking-tight">
              RED BAR
            </span>
          )}
          {isSecond && !isGreen && !isRed && (
            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-500/40 text-purple-200 border border-purple-400/50 whitespace-nowrap tracking-tight">
              2ND MOST
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Strategy Header & Rules Overview */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          isAllConditionsMet
            ? 'bg-gradient-to-r from-emerald-950/60 via-[#11241a] to-[#0c1813] border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'bg-gradient-to-r from-purple-950/50 via-[#150a26] to-[#0f071c] border-purple-800/60'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black flex items-center gap-1 ${
                isAllConditionsMet
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isAllConditionsMet ? (
                <>
                  <CheckCircle2 className="w-3 h-3 inline" />
                  EVEN/ODD STRATEGY VERIFIED
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 inline" />
                  CONDITIONS PENDING
                </>
              )}
            </span>
            <span className="text-xs font-bold text-white font-mono">
              Action: <strong className={isAllConditionsMet ? 'text-emerald-400' : 'text-amber-400'}>{recommendedTrade}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-purple-300/80 text-[11px]">Confidence:</span>
            <span
              className={`font-black px-2 py-0.5 rounded ${
                confidence >= 85
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  : 'bg-purple-950 text-purple-300 border border-purple-800/50'
              }`}
            >
              {confidence}%
            </span>
          </div>
        </div>

        {/* Strategy Rules Note */}
        {!compact && (
          <p className="text-[11px] text-purple-200/90 pt-2 leading-relaxed">
            <strong>Strategy Requirements:</strong> Both Green Bar and Red Bar on Odd digits (Green ≥ 10.5% / 11.5% rec, Red ≤ 10% / 9% rec). All remaining Odd digits ≥ 10.5%, and the 2nd most appearing digit must also be an Odd digit.
          </p>
        )}
      </div>

      {/* TWO EQUAL PARTS ANALYSIS: 0 TO 4 & 5 TO 9 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono px-1">
          <span className="font-bold text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            Digit Distribution (Divided into 0–4 and 5–9)
          </span>
          <span className="text-[10px] text-purple-400/80">
            Total Equilibrium: <strong>{totalPercentage}%</strong>
          </span>
        </div>

        {/* VERTICAL TWO-PART DISTRIBUTION: PART 1 (0-4) ABOVE PART 2 (5-9) ACROSS ALL MARKETS */}
        <div className="flex flex-col gap-3">
          {/* PART 1: DIGITS 0 TO 4 */}
          <div className="p-3 rounded-xl bg-[#120722] border border-purple-900/60 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/50">
              <span className="text-xs font-bold text-pink-300 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                PART 1: DIGITS 0 TO 4
              </span>
              <span className="text-[11px] font-mono text-purple-300/80">
                Evens: 0, 2, 4 | Odds: 1, 3
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {part1Digits.map((item) => renderDigitBlock(item))}
            </div>
          </div>

          {/* PART 2: DIGITS 5 TO 9 */}
          <div className="p-3 rounded-xl bg-[#120722] border border-purple-900/60 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/50">
              <span className="text-xs font-bold text-sky-300 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                PART 2: DIGITS 5 TO 9
              </span>
              <span className="text-[11px] font-mono text-purple-300/80">
                Evens: 6, 8 | Odds: 5, 7, 9
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {part2Digits.map((item) => renderDigitBlock(item))}
            </div>
          </div>
        </div>

        {/* Equilibrium and Aggregate Strip */}
        <div className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-[#0e051c] border border-purple-950 text-[11px] font-mono gap-2">
          <div className="flex items-center gap-3">
            <span className="text-purple-300/80">
              Odd Digits Total (1, 3, 5, 7, 9):{' '}
              <strong className="text-amber-400">{totalOddPercent}%</strong>
            </span>
            <span className="text-purple-300/80">
              Even Digits Total (0, 2, 4, 6, 8):{' '}
              <strong className="text-blue-400">{totalEvenPercent}%</strong>
            </span>
          </div>
          <span className="text-emerald-400 font-bold">
            Total: {totalPercentage.toFixed(1)}% ✓
          </span>
        </div>
      </div>

      {/* 5-RULE STRATEGY VERIFICATION CHECKLIST */}
      <div className="p-3 rounded-xl bg-[#100720] border border-purple-900/60 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/50">
          <span className="font-bold text-purple-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Strategy Conditions Verification Matrix
          </span>
          <span className="text-[10px] text-purple-400">
            {isAllConditionsMet ? 'All 5 Passed' : 'Verification in progress'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {/* Rule 1: Both Green and Red Bar on Odd digits */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
              conditions.greenAndRedOnTargetParity
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-[#140b26] border-purple-900/50 text-slate-300'
            }`}
          >
            <div>
              <div className="font-bold">1. Green &amp; Red on Odd Digits</div>
              <div className="text-[10px] text-purple-300/80">
                Green: {greenBarDigit.digit} ({greenBarDigit.isOdd ? 'Odd ✓' : 'Even ✗'}) | Red:{' '}
                {redBarDigit.digit} ({redBarDigit.isOdd ? 'Odd ✓' : 'Even ✗'})
              </div>
            </div>
            {conditions.greenAndRedOnTargetParity ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>

          {/* Rule 2: Green Bar >= 10.5% (11.5% rec) */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
              conditions.greenBarValid
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-[#140b26] border-purple-900/50 text-slate-300'
            }`}
          >
            <div>
              <div className="font-bold">2. Green Bar (≥10.5%, ≥11.5% rec)</div>
              <div className="text-[10px] text-purple-300/80">
                Digit {greenBarDigit.digit}: {greenBarDigit.percent}%{' '}
                {conditions.greenBarHighlyRecommended && (
                  <span className="text-emerald-400 font-bold">★ HIGH REC</span>
                )}
              </div>
            </div>
            {conditions.greenBarValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>

          {/* Rule 3: Red Bar <= 10.0% (9% rec) */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
              conditions.redBarValid
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-[#140b26] border-purple-900/50 text-slate-300'
            }`}
          >
            <div>
              <div className="font-bold">3. Red Bar (≤10.0%, ≤9.0% rec)</div>
              <div className="text-[10px] text-purple-300/80">
                Digit {redBarDigit.digit}: {redBarDigit.percent}%{' '}
                {conditions.redBarHighlyRecommended && (
                  <span className="text-emerald-400 font-bold">★ HIGH REC</span>
                )}
              </div>
            </div>
            {conditions.redBarValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>

          {/* Rule 4: All remaining odd digits >= 10.5% (11.5% rec) */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
              conditions.remainingDigitsValid
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-[#140b26] border-purple-900/50 text-slate-300'
            }`}
          >
            <div>
              <div className="font-bold">4. Remaining Odds (≥10.5%, ≥11.5% rec)</div>
              <div className="text-[10px] text-purple-300/80">
                {oddDigits
                  .filter((d) => d.digit !== redBarDigit.digit)
                  .map((d) => `${d.digit}:${d.percent}%`)
                  .join(' ')}
              </div>
            </div>
            {conditions.remainingDigitsValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>

          {/* Rule 5: Second most appearing number is also ODD */}
          <div
            className={`p-2 rounded-lg border flex items-center justify-between gap-2 sm:col-span-2 ${
              conditions.secondMostValid
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-[#140b26] border-purple-900/50 text-slate-300'
            }`}
          >
            <div>
              <div className="font-bold">5. 2nd Most Appearing Digit Must Be ODD</div>
              <div className="text-[10px] text-purple-300/80">
                Digit {secondMostDigit.digit} ({secondMostDigit.percent}%) is{' '}
                {secondMostDigit.isOdd ? 'an ODD digit ✓' : 'an EVEN digit ✗'}
              </div>
            </div>
            {conditions.secondMostValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>
        </div>

        {/* Reason summary */}
        <div className="pt-1 text-[11px] text-purple-200/80 border-t border-purple-900/40 leading-snug">
          {strategyReason}
        </div>
      </div>
    </div>
  );
};
