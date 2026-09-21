import { DigitMomentumInfo, OverLevel, OverLevelStrategy, OverStrategyConditions } from '../types';

export const OVER_LEVELS: OverLevel[] = [1, 2, 3, 4, 5, 6, 7, 8];

export interface OverLevelConfig {
  validDigits: number[];
  losingDigits: number[];
  validRangeLabel: string;
  losingRangeLabel: string;
}

export const OVER_LEVEL_CONFIGS: Record<OverLevel, OverLevelConfig> = {
  1: { validDigits: [2, 3, 4, 5, 6, 7, 8, 9], losingDigits: [0, 1], validRangeLabel: '2–9', losingRangeLabel: '0–1' },
  2: { validDigits: [3, 4, 5, 6, 7, 8, 9], losingDigits: [0, 1, 2], validRangeLabel: '3–9', losingRangeLabel: '0–2' },
  3: { validDigits: [4, 5, 6, 7, 8, 9], losingDigits: [0, 1, 2, 3], validRangeLabel: '4–9', losingRangeLabel: '0–3' },
  4: { validDigits: [5, 6, 7, 8, 9], losingDigits: [0, 1, 2, 3, 4], validRangeLabel: '5–9', losingRangeLabel: '0–4' },
  5: { validDigits: [6, 7, 8, 9], losingDigits: [0, 1, 2, 3, 4, 5], validRangeLabel: '6–9', losingRangeLabel: '0–5' },
  6: { validDigits: [7, 8, 9], losingDigits: [0, 1, 2, 3, 4, 5, 6], validRangeLabel: '7–9', losingRangeLabel: '0–6' },
  7: { validDigits: [8, 9], losingDigits: [0, 1, 2, 3, 4, 5, 6, 7], validRangeLabel: '8–9', losingRangeLabel: '0–7' },
  8: { validDigits: [9], losingDigits: [0, 1, 2, 3, 4, 5, 6, 7, 8], validRangeLabel: '9', losingRangeLabel: '0–8' },
};

/**
 * Computes frequency percentages and momentum dynamics for all 10 digits (0–9).
 * Momentum compares the recent micro-window against the prior baseline window.
 */
export function computeDigitMomentumMap(digits: number[]): Record<number, DigitMomentumInfo> {
  const total = Math.max(1, digits.length);
  const result: Record<number, DigitMomentumInfo> = {};

  // Define split windows for momentum calculation
  // Recent window: last 10-14 ticks
  const recentSize = Math.max(6, Math.min(14, Math.floor(total * 0.4)));
  const recentSlice = digits.slice(-recentSize);
  const priorSlice = digits.slice(0, -recentSize);
  const priorSize = Math.max(1, priorSlice.length);

  for (let d = 0; d <= 9; d++) {
    const count = digits.filter((x) => x === d).length;
    const percent = Math.round((count / total) * 100);

    const recentCount = recentSlice.filter((x) => x === d).length;
    const recentPercent = (recentCount / recentSize) * 100;

    const priorCount = priorSlice.filter((x) => x === d).length;
    const priorPercent = priorSlice.length > 0 ? (priorCount / priorSize) * 100 : 10;

    // Delta between recent micro-frequency and prior window
    const rawDelta = recentPercent - priorPercent;
    const momentumDelta = Number(rawDelta.toFixed(1));

    let momentumDirection: 'INCREASING' | 'CONSTANT' | 'DECREASING';
    if (momentumDelta >= 0.4) {
      momentumDirection = 'INCREASING';
    } else if (momentumDelta <= -0.4) {
      momentumDirection = 'DECREASING';
    } else {
      momentumDirection = 'CONSTANT';
    }

    // Green Bar: Strong momentum percentage of 12% or above AND momentum is INCREASING (not constant or decreasing)
    const isGreenBar = percent >= 12 && momentumDirection === 'INCREASING';

    // Red Bar: Digits below 10%
    const isRedBar = percent < 10;

    const barColor: 'GREEN' | 'RED' | 'NEUTRAL' = isGreenBar
      ? 'GREEN'
      : isRedBar
      ? 'RED'
      : 'NEUTRAL';

    result[d] = {
      digit: d,
      percent,
      recentCount,
      momentumDelta,
      momentumDirection,
      barColor,
      isGreenBar,
      isRedBar,
    };
  }

  return result;
}

/**
 * Evaluates the Over 1–8 Trading Strategy for a specified Over level.
 * Implements the 4-part quantitative framework:
 * 1. Specific range applied: Over b checks digits (b+1)..9 (target is not restricted to 8/9).
 * 2. Green-bar digit(s) in valid range have >= 12% and INCREASING momentum.
 * 3. Digits at or below level preferably < 10% and red-bar concentrated; valid % > lower %.
 * 4. All conditions combined for final trade confirmation.
 */
export function evaluateOverLevelStrategy(
  level: OverLevel,
  digits: number[],
  digitMomentums?: Record<number, DigitMomentumInfo>
): OverLevelStrategy {
  const momentums = digitMomentums || computeDigitMomentumMap(digits);
  const config = OVER_LEVEL_CONFIGS[level];

  const validDigits = config.validDigits;
  const losingDigits = config.losingDigits;

  // 1. Valid Range Info
  const rangeValid = true;

  // Valid digits momentum info
  const validDigitInfos = validDigits.map((d) => momentums[d]);
  const losingDigitInfos = losingDigits.map((d) => momentums[d]);

  // Total and average percentages
  const validRangeTotalPercent = validDigitInfos.reduce((acc, curr) => acc + curr.percent, 0);
  const validRangeAvgPercent = Number((validRangeTotalPercent / validDigits.length).toFixed(1));

  const lowerRangeTotalPercent = losingDigitInfos.reduce((acc, curr) => acc + curr.percent, 0);
  const lowerRangeAvgPercent = Number((lowerRangeTotalPercent / Math.max(1, losingDigits.length)).toFixed(1));

  // 2. Green-bar digit(s) in valid range:
  // Must have percentage >= 12% and INCREASING momentum (not constant or decreasing)
  const greenBarDigits = validDigitInfos
    .filter((d) => d.isGreenBar)
    .sort((a, b) => b.percent - a.percent);

  const greenBarValid = greenBarDigits.length > 0;

  // Primary driver digit: top green bar, or highest valid digit with best momentum
  const topGreen = greenBarDigits[0];
  const targetDigit = topGreen ? topGreen.digit : validDigitInfos.sort((a, b) => b.percent - a.percent)[0]?.digit ?? validDigits[0];

  // 3. Lower range digits (at or below level b):
  // Preferably < 10% and red-bar digits should fall within this lower range
  const redBarDigits = losingDigitInfos
    .filter((d) => d.isRedBar)
    .sort((a, b) => a.percent - b.percent);

  // Condition 3: lower avg is below 11%, or at least one red-bar digit present, and valid digits total > lower digits total
  const lowerRangeValid = (lowerRangeAvgPercent <= 10.5 || redBarDigits.length >= 1) && lowerRangeAvgPercent < validRangeAvgPercent;
  const edgeValid = validRangeTotalPercent > lowerRangeTotalPercent;

  // 4. Combined Strategy Conditions
  const conditions: OverStrategyConditions = {
    rangeValid,
    greenBarValid,
    lowerRangeValid,
    edgeValid,
  };

  const isAllConditionsMet = conditions.rangeValid && conditions.greenBarValid && conditions.lowerRangeValid && conditions.edgeValid;

  // Calculate high-fidelity confidence score
  let baseScore = validRangeTotalPercent;

  // Boost for high green-bar presence
  if (greenBarDigits.length >= 2) {
    baseScore += 5;
  } else if (greenBarDigits.length === 1 && greenBarDigits[0].percent >= 14) {
    baseScore += 4;
  }

  // Boost for suppressed lower barrier
  if (lowerRangeAvgPercent < 8) {
    baseScore += 4;
  }

  const confidence = isAllConditionsMet
    ? Math.min(96, Math.max(86, Math.round(baseScore)))
    : Math.min(84, Math.max(60, Math.round(validRangeTotalPercent * 0.9)));

  let statusText = '';
  let strategyReason = '';

  if (isAllConditionsMet) {
    const greenSummary = greenBarDigits
      .map((g) => `Digit ${g.digit} (${g.percent}%, +${g.momentumDelta}% ↗)`)
      .join(', ');
    statusText = `TRADE READY: OVER ${level}`;
    strategyReason = `Over ${level} strategy verified on digits [${config.validRangeLabel}]: Green driver ${greenSummary}. Lower barrier [${config.losingRangeLabel}] suppressed at ${lowerRangeAvgPercent}% avg.`;
  } else {
    statusText = `MONITORING: OVER ${level}`;
    const missing: string[] = [];
    if (!greenBarValid) {
      missing.push(`Requires green-bar digit (≥12% & increasing momentum) in range [${config.validRangeLabel}]`);
    }
    if (!lowerRangeValid) {
      missing.push(`Lower digits [${config.losingRangeLabel}] must remain <10% (currently ${lowerRangeAvgPercent}%)`);
    }
    if (!edgeValid) {
      missing.push(`Valid range mass (${validRangeTotalPercent}%) must exceed lower barrier (${lowerRangeTotalPercent}%)`);
    }
    strategyReason = `Over ${level} conditions pending: ${missing.join('; ')}.`;
  }

  return {
    level,
    validDigits,
    validRangeLabel: config.validRangeLabel,
    losingDigits,
    losingRangeLabel: config.losingRangeLabel,
    greenBarDigits,
    redBarDigits,
    validRangeTotalPercent,
    validRangeAvgPercent,
    lowerRangeTotalPercent,
    lowerRangeAvgPercent,
    conditions,
    isAllConditionsMet,
    score: baseScore,
    confidence,
    statusText,
    recommendedTrade: `OVER ${level}`,
    targetDigit,
    strategyReason,
  };
}

/**
 * Evaluates all 8 Over levels (Over 1 to Over 8) and identifies the optimal level.
 */
export function evaluateAllOverStrategies(
  digits: number[],
  preferredLevel?: OverLevel | null
): {
  allStrategies: Record<OverLevel, OverLevelStrategy>;
  bestStrategy: OverLevelStrategy;
} {
  const momentums = computeDigitMomentumMap(digits);
  const allStrategies: Record<OverLevel, OverLevelStrategy> = {} as any;

  let best: OverLevelStrategy | null = null;

  for (const lvl of OVER_LEVELS) {
    const strat = evaluateOverLevelStrategy(lvl, digits, momentums);
    allStrategies[lvl] = strat;

    if (!best) {
      best = strat;
    } else {
      // Prioritize fully qualified strategies
      if (strat.isAllConditionsMet && !best.isAllConditionsMet) {
        best = strat;
      } else if (strat.isAllConditionsMet && best.isAllConditionsMet) {
        // Compare confidence and green bar momentum strength
        if (strat.confidence > best.confidence) {
          best = strat;
        }
      } else if (!strat.isAllConditionsMet && !best.isAllConditionsMet) {
        if (strat.confidence > best.confidence) {
          best = strat;
        }
      }
    }
  }

  // If user selected a specific preferred level, return that as best
  const finalBest = preferredLevel && allStrategies[preferredLevel] ? allStrategies[preferredLevel] : best!;

  return {
    allStrategies,
    bestStrategy: finalBest,
  };
}
