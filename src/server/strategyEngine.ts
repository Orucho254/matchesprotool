import {
  DerivMarketItem,
  DigitPredictionSignal,
  MarketPrediction,
  ToolType,
  EvenOddStrategyAnalysis,
  SmcRiseFallStrategyAnalysis,
  CandlestickPoint,
  OverLevel,
  OverLevelStrategy,
} from '../types';
import { calculateDigitPredictionSignal as baseCalculateDigitSignal } from '../utils/signalCalculator';
import { evaluateEvenOddStrategy as baseEvaluateEvenOdd } from '../utils/evenOddStrategy';
import { evaluateSmcStrategy as baseEvaluateSmc } from '../utils/smcRiseFallStrategy';
import { evaluateOverLevelStrategy as baseEvaluateOver } from '../utils/overStrategy';
import { computePrediction } from '../data/markets';

/**
 * Server-Side Strategy Engine:
 * All proprietary trade calculations, quantitative formulas, and market predictions
 * are strictly executed in this protected backend environment.
 */

export function serverCalculateDigitPredictionSignal(
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
  return baseCalculateDigitSignal(market, activeToolType);
}

export function serverEvaluateEvenOddStrategy(recentDigits: number[]): EvenOddStrategyAnalysis {
  return baseEvaluateEvenOdd(recentDigits);
}

export function serverEvaluateSmcStrategy(
  candles: CandlestickPoint[],
  currentPrice: number,
  pipSize: number = 2
): SmcRiseFallStrategyAnalysis {
  return baseEvaluateSmc(candles, currentPrice, pipSize);
}

export function serverEvaluateOverStrategy(
  level: OverLevel,
  digits: number[]
): OverLevelStrategy {
  return baseEvaluateOver(level, digits);
}

export function serverBatchComputePredictions(
  items: Array<{
    id: string;
    symbol: string;
    toolType: ToolType;
    recentDigits: number[];
    recentPrices: number[];
    stats: DerivMarketItem['stats'];
    selectedOverLevel?: OverLevel | null;
    candlestickData1m?: CandlestickPoint[];
    pipSize?: number;
  }>
): Record<string, { prediction: MarketPrediction; signal: DigitPredictionSignal }> {
  const result: Record<string, { prediction: MarketPrediction; signal: DigitPredictionSignal }> = {};

  for (const item of items) {
    const prediction = computePrediction(
      item.toolType,
      item.recentDigits || [],
      item.recentPrices || [],
      item.stats,
      item.selectedOverLevel || null,
      item.candlestickData1m,
      item.symbol,
      item.pipSize || 2
    );

    const signal = baseCalculateDigitSignal({
      prediction,
      stats: item.stats,
      recentDigits: item.recentDigits,
      recentPrices: item.recentPrices,
      lastDigit: item.recentDigits?.[item.recentDigits.length - 1],
    }, item.toolType);

    result[item.id] = { prediction, signal };
  }

  return result;
}
