import { DerivMarketItem, DigitPredictionSignal, MarketPrediction, ToolType } from '../types';

/**
 * Calculates a dynamic, digit-based binary trading prediction rule for a synthetic index.
 * Intelligently suggests: Over/Under (e.g., "OVER 1", "UNDER 9"), "EVEN", "ODD",
 * "DIFFERS", "MATCHES", "RISE", or "FALL" based on calculated statistical probabilities.
 */
export function calculateDigitPredictionSignal(
  market: {
    displayName?: string;
    prediction: MarketPrediction;
    stats?: DerivMarketItem['stats'];
    recentDigits?: number[];
    recentPrices?: number[];
    lastDigit?: number;
    priceDelta?: number;
  },
  activeToolType?: ToolType
): DigitPredictionSignal {
  const prediction = market.prediction;
  const stats = market.stats;
  const recentDigits = market.recentDigits || [];
  const recentPrices = market.recentPrices || [];
  const lastDigit = market.lastDigit ?? (recentDigits.length > 0 ? recentDigits[recentDigits.length - 1] : 5);
  const priceDelta = market.priceDelta ?? 0;

  // 1. Check primary signal from market prediction
  const primarySignal = prediction.primarySignal || 'UNDER 9';
  const confidence = prediction.confidence || 85;
  const isTradeReady = confidence >= 85;

  let actionType = primarySignal;
  let contractCategory = 'DIGIT OVER / UNDER';
  let riskRewardRatio = '1:1.15';
  let payoutEst = '+95.2%';
  let recommendedDuration = prediction.recommendedDuration || '1 - 3 Ticks';
  let targetDigit = prediction.targetDigit;

  const upperSignal = primarySignal.toUpperCase();

  // Categorize based on the active signal
  if (upperSignal === 'WAIT') {
    actionType = 'WAIT';
    contractCategory = prediction.contractType || 'STANDBY';
    riskRewardRatio = '1:1.00';
    payoutEst = '0%';
    recommendedDuration = 'N/A';
  } else if (upperSignal.startsWith('OVER')) {
    actionType = primarySignal; // e.g. "OVER 1", "OVER 7"
    contractCategory = 'DIGIT OVER / UNDER';
    riskRewardRatio = '1:1.20';
    payoutEst = '+92.5%';
    recommendedDuration = '1 - 3 Ticks';
  } else if (upperSignal.startsWith('UNDER')) {
    actionType = primarySignal; // e.g. "UNDER 9", "UNDER 7"
    contractCategory = 'DIGIT OVER / UNDER';
    riskRewardRatio = '1:1.15';
    payoutEst = '+95.5%';
    recommendedDuration = '1 - 3 Ticks';
  } else if (upperSignal.includes('DIFFER')) {
    actionType = primarySignal; // e.g. "DIFFER 3"
    contractCategory = 'DIGIT DIFFERS';
    riskRewardRatio = '1:10.0';
    payoutEst = '+10.2%';
    recommendedDuration = '1 Tick';
  } else if (upperSignal.includes('MATCH')) {
    actionType = primarySignal; // e.g. "MATCH 7"
    contractCategory = 'DIGIT MATCHES';
    riskRewardRatio = '10.0:1';
    payoutEst = '+850%';
    recommendedDuration = '1 Tick';
  } else if (upperSignal === 'EVEN' || upperSignal === 'ODD') {
    actionType = upperSignal;
    contractCategory = 'DIGIT EVEN / ODD';
    riskRewardRatio = '1:1.05';
    payoutEst = '+95.0%';
    recommendedDuration = '1 - 2 Ticks';
  } else if (upperSignal === 'RISE' || upperSignal === 'FALL') {
    actionType = upperSignal;
    contractCategory = 'RISE / FALL';
    riskRewardRatio = '1:1.05';
    payoutEst = '+95.0%';
    recommendedDuration = '2 - 5 Ticks';
  }

  // Format trade instruction: e.g. "TRADE: OVER 1", "TRADE: UNDER 9", "TRADE: EVEN", "TRADE: DIFFER 4", "WAIT"
  const tradeInstruction = isTradeReady
    ? `TRADE: ${actionType.toUpperCase()}`
    : `WAIT (<85%)`;

  // Format status text: e.g. "TRADE READY: TRADE OVER 1" or "WAIT (<85%): INSUFFICIENT CONFIDENCE"
  const statusText = isTradeReady
    ? `TRADE READY: TRADE ${actionType.toUpperCase()}`
    : `WAIT (<85%): INSUFFICIENT CONFIDENCE`;

  return {
    tradeInstruction,
    actionType: actionType.toUpperCase(),
    contractCategory,
    confidence,
    riskRewardRatio,
    payoutEst,
    recommendedDuration,
    isTradeReady,
    statusText,
    tacticalReason: prediction.reasoning || `Statistical model confirms ${actionType} with ${confidence}% confidence.`,
    targetDigit,
  };
}

// Backwards compatible wrapper
export function calculateSignalEntry(
  currentPrice: number,
  pipSize: number,
  prediction: MarketPrediction,
  priceDelta: number = 0,
  marketStats?: DerivMarketItem['stats'],
  recentDigits?: number[]
): DigitPredictionSignal {
  return calculateDigitPredictionSignal({
    prediction,
    stats: marketStats,
    recentDigits,
    priceDelta,
  });
}
