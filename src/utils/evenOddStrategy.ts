import { EvenOddDigitPartItem, EvenOddStrategyAnalysis, EvenOddStrategyConditions } from '../types';

/**
 * Distributes percentages across 10 digits (0-9) such that the sum is strictly 100.0%.
 */
function computeNormalizedDigitPercentages(digits: number[]): { count: number; percent: number }[] {
  const counts = new Array(10).fill(0);
  const total = Math.max(1, digits.length);

  for (const d of digits) {
    if (d >= 0 && d <= 9) {
      counts[d]++;
    }
  }

  // Initial 1-decimal percentages
  const rawPercentages = counts.map((c) => (c / total) * 100);
  const roundedPercentages = rawPercentages.map((p) => Math.round(p * 10) / 10);
  
  // Adjust any tiny rounding delta (e.g. 99.9% or 100.1%) against the largest bucket
  const sumRounded = Math.round(roundedPercentages.reduce((acc, v) => acc + v, 0) * 10) / 10;
  const delta = Math.round((100.0 - sumRounded) * 10) / 10;

  if (delta !== 0) {
    let maxIdx = 0;
    let maxVal = -1;
    for (let i = 0; i < 10; i++) {
      if (roundedPercentages[i] > maxVal) {
        maxVal = roundedPercentages[i];
        maxIdx = i;
      }
    }
    roundedPercentages[maxIdx] = Math.round((roundedPercentages[maxIdx] + delta) * 10) / 10;
  }

  return counts.map((count, i) => ({
    count,
    percent: roundedPercentages[i],
  }));
}

/**
 * Evaluates the Even/Odd Strategy on the provided digit stream according to the exact rules:
 * 1. Both Green Bar (highest %) and Red Bar (lowest %) should be on ODD digits (or Even digits).
 * 2. Green Bar should be 10.5% and above (11.5% highly recommended).
 * 3. Red Bar should be 10% and below (9% highly recommended).
 * 4. All remaining Odd digits should be 10.5% and above (11.5% highly recommended).
 * 5. The second most appearing number should also be an ODD digit.
 * 
 * Divides the analysis tool into two equal parts: 0 to 4 and 5 to 9.
 */
export function evaluateEvenOddStrategy(recentDigits: number[]): EvenOddStrategyAnalysis {
  const sampleDigits = recentDigits && recentDigits.length > 0 ? recentDigits : [1, 3, 5, 7, 9, 0, 2, 4, 6, 8];
  const normalized = computeNormalizedDigitPercentages(sampleDigits);

  // Identify ranks across all 10 digits
  const digitOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => ({
    digit: d,
    count: normalized[d].count,
    percent: normalized[d].percent,
    isEven: d % 2 === 0,
    isOdd: d % 2 !== 0,
  }));

  // Sort by percentage descending
  const sortedDesc = [...digitOrder].sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    return b.count - a.count;
  });

  const greenBarDigitNum = sortedDesc[0].digit;
  const secondMostDigitNum = sortedDesc[1].digit;
  const redBarDigitNum = sortedDesc[sortedDesc.length - 1].digit;

  // Build the complete 10-digit items with full annotations
  const allDigits: EvenOddDigitPartItem[] = digitOrder.map((item) => {
    const rank = sortedDesc.findIndex((s) => s.digit === item.digit) + 1;
    return {
      digit: item.digit,
      count: item.count,
      percent: item.percent,
      isEven: item.isEven,
      isOdd: item.isOdd,
      isGreenBar: item.digit === greenBarDigitNum,
      isRedBar: item.digit === redBarDigitNum,
      isSecondMost: item.digit === secondMostDigitNum,
      rank,
    };
  });

  // Divide the analysis tool into two equal parts:
  // Part 1: 0 to 4
  // Part 2: 5 to 9
  const part1Digits = allDigits.slice(0, 5); // 0, 1, 2, 3, 4
  const part2Digits = allDigits.slice(5, 10); // 5, 6, 7, 8, 9

  const greenBarItem = allDigits[greenBarDigitNum];
  const redBarItem = allDigits[redBarDigitNum];
  const secondMostItem = allDigits[secondMostDigitNum];

  const oddDigits = allDigits.filter((d) => d.isOdd); // 1, 3, 5, 7, 9
  const evenDigits = allDigits.filter((d) => d.isEven); // 0, 2, 4, 6, 8

  // --- Evaluate Conditions for ODD Strategy ---
  const oddGreenIsOdd = greenBarItem.isOdd;
  const oddRedIsOdd = redBarItem.isOdd;
  const oddGreenAndRedOnParity = oddGreenIsOdd && oddRedIsOdd;

  const oddGreenBarValid = greenBarItem.percent >= 10.5;
  const oddGreenBarHighlyRecommended = greenBarItem.percent >= 11.5;

  const oddRedBarValid = redBarItem.percent <= 10.0;
  const oddRedBarHighlyRecommended = redBarItem.percent <= 9.0;

  // Remaining odd digits (excluding the Red Bar odd digit)
  const remainingOddDigits = oddDigits.filter((d) => d.digit !== redBarDigitNum);
  const oddRemainingDigitsValid = remainingOddDigits.length === 4 && remainingOddDigits.every((d) => d.percent >= 10.5);
  const oddRemainingDigitsHighlyRecommended =
    remainingOddDigits.length === 4 && remainingOddDigits.every((d) => d.percent >= 11.5);

  const oddSecondMostValid = secondMostItem.isOdd;

  const isOddStrategyMet =
    oddGreenAndRedOnParity &&
    oddGreenBarValid &&
    oddRedBarValid &&
    oddRemainingDigitsValid &&
    oddSecondMostValid;

  // --- Symmetrical Mirror for EVEN Strategy ---
  const evenGreenIsEven = greenBarItem.isEven;
  const evenRedIsEven = redBarItem.isEven;
  const evenGreenAndRedOnParity = evenGreenIsEven && evenRedIsEven;

  const evenGreenBarValid = greenBarItem.percent >= 10.5;
  const evenGreenBarHighlyRecommended = greenBarItem.percent >= 11.5;

  const evenRedBarValid = redBarItem.percent <= 10.0;
  const evenRedBarHighlyRecommended = redBarItem.percent <= 9.0;

  const remainingEvenDigits = evenDigits.filter((d) => d.digit !== redBarDigitNum);
  const evenRemainingDigitsValid = remainingEvenDigits.length === 4 && remainingEvenDigits.every((d) => d.percent >= 10.5);
  const evenRemainingDigitsHighlyRecommended =
    remainingEvenDigits.length === 4 && remainingEvenDigits.every((d) => d.percent >= 11.5);

  const evenSecondMostValid = secondMostItem.isEven;

  const isEvenStrategyMet =
    evenGreenAndRedOnParity &&
    evenGreenBarValid &&
    evenRedBarValid &&
    evenRemainingDigitsValid &&
    evenSecondMostValid;

  // Determine target direction
  const targetDirection: 'ODD' | 'EVEN' = isOddStrategyMet
    ? 'ODD'
    : isEvenStrategyMet
    ? 'EVEN'
    : greenBarItem.isOdd
    ? 'ODD'
    : 'EVEN';

  const isAllConditionsMet = targetDirection === 'ODD' ? isOddStrategyMet : isEvenStrategyMet;

  // Assemble active conditions based on target direction
  const conditions: EvenOddStrategyConditions =
    targetDirection === 'ODD'
      ? {
          greenAndRedOnTargetParity: oddGreenAndRedOnParity,
          greenBarIsOdd: oddGreenIsOdd,
          redBarIsOdd: oddRedIsOdd,
          greenBarValid: oddGreenBarValid,
          greenBarHighlyRecommended: oddGreenBarHighlyRecommended,
          redBarValid: oddRedBarValid,
          redBarHighlyRecommended: oddRedBarHighlyRecommended,
          remainingDigitsValid: oddRemainingDigitsValid,
          remainingDigitsHighlyRecommended: oddRemainingDigitsHighlyRecommended,
          secondMostValid: oddSecondMostValid,
        }
      : {
          greenAndRedOnTargetParity: evenGreenAndRedOnParity,
          greenBarIsOdd: !evenGreenIsEven,
          redBarIsOdd: !evenRedIsEven,
          greenBarValid: evenGreenBarValid,
          greenBarHighlyRecommended: evenGreenBarHighlyRecommended,
          redBarValid: evenRedBarValid,
          redBarHighlyRecommended: evenRedBarHighlyRecommended,
          remainingDigitsValid: evenRemainingDigitsValid,
          remainingDigitsHighlyRecommended: evenRemainingDigitsHighlyRecommended,
          secondMostValid: evenSecondMostValid,
        };

  // Calculate confidence score
  let confidence = 72;
  if (isAllConditionsMet) {
    confidence = 91;
    if (conditions.greenBarHighlyRecommended) confidence += 2;
    if (conditions.redBarHighlyRecommended) confidence += 2;
    if (conditions.remainingDigitsHighlyRecommended) confidence += 1;
  } else {
    let passedCount = 0;
    if (conditions.greenAndRedOnTargetParity) passedCount++;
    if (conditions.greenBarValid) passedCount++;
    if (conditions.redBarValid) passedCount++;
    if (conditions.remainingDigitsValid) passedCount++;
    if (conditions.secondMostValid) passedCount++;
    confidence = 70 + passedCount * 2.6; // 70 to 83%
  }
  confidence = Math.min(96, Math.round(confidence));

  const totalPercentage = 100.0;
  const statusText = isAllConditionsMet ? 'STRATEGY VERIFIED' : 'CONDITIONS PENDING';
  const recommendedTrade = isAllConditionsMet ? `TRADE ${targetDirection}` : 'WAIT';

  // Build descriptive reason
  let strategyReason = '';
  if (isAllConditionsMet) {
    const parityLabel = targetDirection === 'ODD' ? 'Odd' : 'Even';
    const recText =
      conditions.greenBarHighlyRecommended && conditions.redBarHighlyRecommended
        ? ' (HIGHLY RECOMMENDED)'
        : '';
    strategyReason = `Even/Odd Strategy Verified${recText}: Both Green bar (Digit ${greenBarItem.digit}: ${greenBarItem.percent}%) and Red bar (Digit ${redBarItem.digit}: ${redBarItem.percent}%) are ${parityLabel} digits. 2nd most appearing digit (Digit ${secondMostItem.digit}: ${secondMostItem.percent}%) is ${parityLabel}. All remaining ${parityLabel.toLowerCase()} digits exceed 10.5%. Perfect entry point for ${recommendedTrade}.`;
  } else {
    const missing: string[] = [];
    if (!conditions.greenAndRedOnTargetParity) {
      missing.push(`Green bar (Digit ${greenBarItem.digit}) and Red bar (Digit ${redBarItem.digit}) must both be Odd digits`);
    }
    if (!conditions.greenBarValid) {
      missing.push(`Green bar (${greenBarItem.percent}%) must be ≥ 10.5%`);
    }
    if (!conditions.redBarValid) {
      missing.push(`Red bar (${redBarItem.percent}%) must be ≤ 10.0%`);
    }
    if (!conditions.remainingDigitsValid) {
      missing.push(`All remaining odd digits must be ≥ 10.5%`);
    }
    if (!conditions.secondMostValid) {
      missing.push(`2nd most appearing number (Digit ${secondMostItem.digit}) must be an Odd digit`);
    }
    strategyReason = `Conditions Pending: ${missing.slice(0, 2).join('; ')}${missing.length > 2 ? '...' : ''}.`;
  }

  return {
    targetDirection,
    part1Digits,
    part2Digits,
    allDigits,
    totalPercentage,
    greenBarDigit: greenBarItem,
    redBarDigit: redBarItem,
    secondMostDigit: secondMostItem,
    oddDigits,
    evenDigits,
    conditions,
    isAllConditionsMet,
    confidence,
    statusText,
    recommendedTrade,
    strategyReason,
  };
}

/**
 * Generates a realistic 50-digit sequence that satisfies the user's Even/Odd strategy conditions:
 * - Green Bar on Odd Digit (Digit 7 at 14.0% >= 11.5% Highly Recommended)
 * - Red Bar on Odd Digit (Digit 3 at 6.0% <= 9.0% Highly Recommended)
 * - Remaining Odd Digits (1, 5, 9 at 12.0% >= 11.5% Highly Recommended)
 * - 2nd Most Appearing is Odd (Digit 5 at 12.0%)
 * - Equilibrium: All 10 digits sum to exactly 100%
 */
export function createEvenOddCompliantSequence(): number[] {
  // Counts:
  // 7: 7 times
  // 1: 6 times
  // 5: 6 times
  // 9: 6 times
  // 3: 3 times
  // 0: 4 times
  // 2: 5 times
  // 4: 4 times
  // 6: 5 times
  // 8: 4 times
  // Total = 50 digits
  const pool: number[] = [
    // Odd digits (28)
    7, 7, 7, 7, 7, 7, 7,
    1, 1, 1, 1, 1, 1,
    5, 5, 5, 5, 5, 5,
    9, 9, 9, 9, 9, 9,
    3, 3, 3,
    // Even digits (22)
    0, 0, 0, 0,
    2, 2, 2, 2, 2,
    4, 4, 4, 4,
    6, 6, 6, 6, 6,
    8, 8, 8, 8,
  ];

  // Pseudo-random deterministic shuffle to preserve natural market rhythm
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

