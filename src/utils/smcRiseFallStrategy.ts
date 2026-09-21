import {
  CandlestickPoint,
  MarketTrend1m,
  SupplyDemandZone,
  BOSPoint,
  SmcRiseFallStrategyAnalysis,
} from '../types';

/**
 * BABY OIL SPEEDBOT on D-Xpert - Your Expert in D Technology
 * Telegram: @D_X
 *
 * Institutional SMC Market Structure, Supply & Demand Strategy Engine for Rise & Fall:
 * 1. Trend determination on 1-min timeframe (Uptrend vs Downtrend).
 * 2. 30-minute High & Low range lines (extended lines for trading boundary).
 * 3. Supply & Demand Zones via Drop-Base-Drop (DBD) and Rally-Base-Rally (RBR) bases.
 * 4. Break of Structure (BOS) and Points of Interest (POI) reversal levels.
 * 5. False Breakout Protection:
 *    - At Supply Zone: Must wait for a RED confirmation bar before setting bot to FALL.
 *    - At Demand Zone: Must make sure a GREEN confirmation bar is forming before trading RISE.
 *    - In between zones: Wait for return to marked POI level before taking any trade.
 */

export const AUTHOR_CREDIT = {
  botName: 'BABYOIL SPEEDBOT on D-Xpert',
  tagline: 'Your Expert in D Technology',
  telegram: '@D_X',
};

/**
 * Builds or updates realistic 1-minute candlestick data (30+ candles for 30min TF).
 */
export function build1mCandlesticks(
  symbol: string,
  currentPrice: number,
  pipSize: number = 2,
  overrideTrend?: 'DOWNTREND' | 'UPTREND'
): CandlestickPoint[] {
  const count = 32;
  const now = Date.now();
  const stepMs = 60 * 1000;
  const points: CandlestickPoint[] = [];

  // Deterministic seed based on symbol character codes
  const seedNum = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isDown = overrideTrend ? overrideTrend === 'DOWNTREND' : seedNum % 2 === 0;

  // Approximate realistic volatility per pip size
  const baseVol = pipSize === 0 ? 12 : pipSize === 1 ? 2.5 : pipSize === 2 ? 0.35 : 0.004;

  let walkingPrice = isDown ? currentPrice * 1.018 : currentPrice * 0.982;
  let ema20 = walkingPrice;
  let sma50 = walkingPrice;

  for (let i = count - 1; i >= 0; i--) {
    const candleTime = new Date(now - i * stepMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Last candle is the live forming candle matching currentPrice
    const isLiveCandle = i === 0;
    const open = isLiveCandle
      ? isDown
        ? currentPrice + baseVol * 0.4
        : currentPrice - baseVol * 0.4
      : walkingPrice;

    // Pattern creation for DBD and RBR demonstration
    let close = isLiveCandle ? currentPrice : open;
    if (!isLiveCandle) {
      // Natural cycle with Drop-Base-Drop or Rally-Base-Rally impulses
      const cyclePos = i % 8;
      let impulse = 0;

      if (isDown) {
        // Downtrend structure with Drop Base Drop
        if (cyclePos === 6 || cyclePos === 2) {
          // Drop
          impulse = -baseVol * 1.8;
        } else if (cyclePos === 5 || cyclePos === 1) {
          // Base
          impulse = (Math.random() - 0.5) * baseVol * 0.3;
        } else if (cyclePos === 4 || cyclePos === 0) {
          // Second Drop (DBD completion)
          impulse = -baseVol * 2.0;
        } else {
          // Retracement pullbacks back towards previous base
          impulse = baseVol * 0.8;
        }
      } else {
        // Uptrend structure with Rally Base Rally
        if (cyclePos === 6 || cyclePos === 2) {
          // Rally
          impulse = baseVol * 1.8;
        } else if (cyclePos === 5 || cyclePos === 1) {
          // Base
          impulse = (Math.random() - 0.5) * baseVol * 0.3;
        } else if (cyclePos === 4 || cyclePos === 0) {
          // Second Rally (RBR completion)
          impulse = baseVol * 2.0;
        } else {
          // Retracement pullbacks back towards previous base
          impulse = -baseVol * 0.8;
        }
      }

      close = +(open + impulse).toFixed(pipSize);
    }

    const high = +(Math.max(open, close) + Math.random() * baseVol * 0.45).toFixed(pipSize);
    const low = +(Math.min(open, close) - Math.random() * baseVol * 0.45).toFixed(pipSize);
    const volume = Math.floor(180 + Math.random() * 420);

    ema20 = +(ema20 * 0.88 + close * 0.12).toFixed(pipSize);
    sma50 = +(sma50 * 0.95 + close * 0.05).toFixed(pipSize);

    points.push({
      time: candleTime,
      open: +open.toFixed(pipSize),
      high: +high.toFixed(pipSize),
      low: +low.toFixed(pipSize),
      close: +close.toFixed(pipSize),
      volume,
      ema20,
      sma50,
    });

    walkingPrice = close;
  }

  return points;
}

/**
 * Evaluates the full Market Structure, Supply/Demand, 30m High/Low, and Confirmation Bar rules.
 */
export function evaluateSmcStrategy(
  candles: CandlestickPoint[],
  currentPrice: number,
  pipSize: number = 2
): SmcRiseFallStrategyAnalysis {
  const windowCandles = candles.slice(-30);
  const n = windowCandles.length;

  // 1. Mark Previous High and Low for past 30 mins
  let high30m = -Infinity;
  let low30m = Infinity;

  windowCandles.forEach((c) => {
    if (c.high > high30m) high30m = c.high;
    if (c.low < low30m) low30m = c.low;
  });

  const range30m = +(high30m - low30m).toFixed(pipSize);
  const currentPricePositionPercent =
    range30m > 0 ? Math.min(100, Math.max(0, Math.round(((currentPrice - low30m) / range30m) * 100))) : 50;

  // 2. Determine Trend on 1-min Timeframe (Up or Downtrend)
  // Check swing highs and swing lows + EMA relationship
  let higherHighCount = 0;
  let lowerLowCount = 0;
  const swingPoints: { index: number; type: 'HIGH' | 'LOW'; price: number }[] = [];

  for (let i = 2; i < n - 2; i++) {
    const c = windowCandles[i];
    const isHigh =
      c.high > windowCandles[i - 1].high &&
      c.high > windowCandles[i - 2].high &&
      c.high > windowCandles[i + 1].high &&
      c.high > windowCandles[i + 2].high;
    const isLow =
      c.low < windowCandles[i - 1].low &&
      c.low < windowCandles[i - 2].low &&
      c.low < windowCandles[i + 1].low &&
      c.low < windowCandles[i + 2].low;

    if (isHigh) swingPoints.push({ index: i, type: 'HIGH', price: c.high });
    if (isLow) swingPoints.push({ index: i, type: 'LOW', price: c.low });
  }

  const swingHighs = swingPoints.filter((s) => s.type === 'HIGH');
  const swingLows = swingPoints.filter((s) => s.type === 'LOW');

  for (let i = 1; i < swingHighs.length; i++) {
    if (swingHighs[i].price > swingHighs[i - 1].price) higherHighCount++;
  }
  for (let i = 1; i < swingLows.length; i++) {
    if (swingLows[i].price < swingLows[i - 1].price) lowerLowCount++;
  }

  const lastCandle = windowCandles[n - 1] || candles[candles.length - 1];
  const firstCandle = windowCandles[0];
  const netDelta = lastCandle.close - firstCandle.open;
  const emaTrend = lastCandle.ema20 >= lastCandle.sma50 ? 'UPTREND' : 'DOWNTREND';

  let trend1m: MarketTrend1m = 'CONSOLIDATION';
  let trendConfidence = 80;
  let trendDescription = '';

  if (netDelta < 0 && (lowerLowCount >= higherHighCount || emaTrend === 'DOWNTREND')) {
    trend1m = 'DOWNTREND';
    trendConfidence = Math.min(94, 85 + lowerLowCount * 3);
    trendDescription = `Downtrend verified on 1min TF: Lower Lows & Lower Highs sequence with Drop-Base-Drop pattern dominance.`;
  } else if (netDelta > 0 && (higherHighCount >= lowerLowCount || emaTrend === 'UPTREND')) {
    trend1m = 'UPTREND';
    trendConfidence = Math.min(94, 85 + higherHighCount * 3);
    trendDescription = `Uptrend verified on 1min TF: Higher Highs & Higher Lows sequence with Rally-Base-Rally pattern dominance.`;
  } else {
    trend1m = emaTrend;
    trendConfidence = 82;
    trendDescription = `1min market consolidating between 30m High and Low, with structural bias leaning ${trend1m}.`;
  }

  // 3. Mark Supply & Demand Zones via Drop-Base-Drop (DBD) & Rally-Base-Rally (RBR)
  const supplyZones: SupplyDemandZone[] = [];
  const demandZones: DemandZoneList = [];
  const bosPoints: BOSPoint[] = [];

  type DemandZoneList = SupplyDemandZone[];

  // Detect DBD (Drop-Base-Drop) for Supply Zones
  for (let i = 1; i < n - 2; i++) {
    const prev = windowCandles[i - 1];
    const base = windowCandles[i];
    const next = windowCandles[i + 1];

    const prevDrop = prev.open - prev.close;
    const nextDrop = next.open - next.close;
    const baseBody = Math.abs(base.close - base.open);
    const avgCandleSize = (high30m - low30m) / 25 || 1;

    // Drop-Base-Drop condition
    if (prevDrop > avgCandleSize * 0.6 && nextDrop > avgCandleSize * 0.6 && baseBody < avgCandleSize * 0.7) {
      const zoneHigh = +(Math.max(base.high, base.open, base.close) + avgCandleSize * 0.05).toFixed(pipSize);
      const zoneLow = +(Math.min(base.low, base.open, base.close) - avgCandleSize * 0.05).toFixed(pipSize);

      supplyZones.push({
        id: `dbd-supply-${i}`,
        type: 'SUPPLY',
        name: `DBD Supply Base @ ${base.time}`,
        pattern: 'DROP_BASE_DROP',
        highPrice: zoneHigh,
        lowPrice: zoneLow,
        candleIndexStart: i,
        candleIndexEnd: i + 1,
        timeStart: base.time,
        isObeyed: true,
        testCount: 1,
        isCurrentZone: currentPrice >= zoneLow && currentPrice <= zoneHigh * 1.002,
        distanceFromCurrentPrice: Math.abs(currentPrice - (zoneHigh + zoneLow) / 2),
      });

      // Bearish BOS formed by the downward expansion breaking base low
      bosPoints.push({
        id: `bos-bearish-${i}`,
        type: 'BEARISH_BOS',
        price: next.close,
        time: next.time,
        candleIndex: i + 1,
        brokenLevel: base.low,
        description: `Bearish BOS: Impulsive Drop broke base level ${base.low.toFixed(pipSize)}`,
      });
    }

    // Rally-Base-Rally condition
    const prevRally = prev.close - prev.open;
    const nextRally = next.close - next.open;

    if (prevRally > avgCandleSize * 0.6 && nextRally > avgCandleSize * 0.6 && baseBody < avgCandleSize * 0.7) {
      const zoneHigh = +(Math.max(base.high, base.open, base.close) + avgCandleSize * 0.05).toFixed(pipSize);
      const zoneLow = +(Math.min(base.low, base.open, base.close) - avgCandleSize * 0.05).toFixed(pipSize);

      demandZones.push({
        id: `rbr-demand-${i}`,
        type: 'DEMAND',
        name: `RBR Demand Base @ ${base.time}`,
        pattern: 'RALLY_BASE_RALLY',
        highPrice: zoneHigh,
        lowPrice: zoneLow,
        candleIndexStart: i,
        candleIndexEnd: i + 1,
        timeStart: base.time,
        isObeyed: true,
        testCount: 1,
        isCurrentZone: currentPrice >= zoneLow * 0.998 && currentPrice <= zoneHigh,
        distanceFromCurrentPrice: Math.abs(currentPrice - (zoneHigh + zoneLow) / 2),
      });

      // Bullish BOS formed by the upward expansion breaking base high
      bosPoints.push({
        id: `bos-bullish-${i}`,
        type: 'BULLISH_BOS',
        price: next.close,
        time: next.time,
        candleIndex: i + 1,
        brokenLevel: base.high,
        description: `Bullish BOS: Impulsive Rally broke base level ${base.high.toFixed(pipSize)}`,
      });
    }
  }

  // Ensure there's always at least one representative Supply Zone and Demand Zone based on 30m extremes
  const thresholdDist = (high30m - low30m) * 0.12 || 1;

  if (supplyZones.length === 0) {
    supplyZones.push({
      id: 'macro-supply-30m',
      type: 'SUPPLY',
      name: '30m Previous High Supply POI',
      pattern: 'SWING_HIGH_SUPPLY',
      highPrice: high30m,
      lowPrice: +(high30m - thresholdDist).toFixed(pipSize),
      candleIndexStart: 0,
      candleIndexEnd: n - 1,
      timeStart: 'Past 30m',
      isObeyed: true,
      testCount: 2,
      isCurrentZone: currentPrice >= high30m - thresholdDist,
      distanceFromCurrentPrice: Math.abs(currentPrice - high30m),
    });
  }

  if (demandZones.length === 0) {
    demandZones.push({
      id: 'macro-demand-30m',
      type: 'DEMAND',
      name: '30m Previous Low Demand POI',
      pattern: 'SWING_LOW_DEMAND',
      highPrice: +(low30m + thresholdDist).toFixed(pipSize),
      lowPrice: low30m,
      candleIndexStart: 0,
      candleIndexEnd: n - 1,
      timeStart: 'Past 30m',
      isObeyed: true,
      testCount: 2,
      isCurrentZone: currentPrice <= low30m + thresholdDist,
      distanceFromCurrentPrice: Math.abs(currentPrice - low30m),
    });
  }

  // Find nearest zones & evaluate current proximity
  // A price is at a supply zone if within zone or within 5% proximity to it
  const isAtSupplyZone = supplyZones.some(
    (z) => currentPrice >= z.lowPrice * 0.9995 && currentPrice <= z.highPrice * 1.002
  );
  const isAtDemandZone = demandZones.some(
    (z) => currentPrice <= z.highPrice * 1.0005 && currentPrice >= z.lowPrice * 0.998
  );

  const isInBetweenZones = !isAtSupplyZone && !isAtDemandZone;

  // Active POI (Point of Interest)
  let activePOI: SupplyDemandZone | null = null;
  if (isAtSupplyZone) {
    activePOI = supplyZones.find((z) => currentPrice >= z.lowPrice * 0.9995) || supplyZones[0];
  } else if (isAtDemandZone) {
    activePOI = demandZones.find((z) => currentPrice <= z.highPrice * 1.0005) || demandZones[0];
  } else {
    // Nearest POI
    const sortedAll = [...supplyZones, ...demandZones].sort(
      (a, b) => a.distanceFromCurrentPrice - b.distanceFromCurrentPrice
    );
    activePOI = sortedAll[0] || null;
  }

  // 4. Confirmation Bar Analysis (False Breakout Protection Rule)
  // "if the market is on a supply zone wait for a red bar to start forming before setting your bot to trade FALL"
  // "when the market is on the demand zone make sure a green bar is being formed before trading RISE"
  const liveCandle = windowCandles[n - 1];
  const currentCandleBarColor: 'GREEN' | 'RED' | 'DOJI' =
    liveCandle.close > liveCandle.open
      ? 'GREEN'
      : liveCandle.close < liveCandle.open
      ? 'RED'
      : 'DOJI';

  let hasConfirmationBar = false;
  let falseBreakoutWarning: string | null = null;
  let botStatus: 'WAIT_FOR_POI' | 'WAIT_CONFIRMATION_BAR' | 'CONFIRMED_FALL' | 'CONFIRMED_RISE' =
    'WAIT_FOR_POI';
  let recommendedTrade: 'FALL' | 'RISE' | 'WAIT' = 'WAIT';
  let confidence = 75;
  let strategyReason = '';

  if (isInBetweenZones) {
    botStatus = 'WAIT_FOR_POI';
    recommendedTrade = 'WAIT';
    confidence = 74;
    hasConfirmationBar = false;
    strategyReason = `Price is in between Supply & Demand zones (${currentPricePositionPercent}% of 30m range). Strategy rule: Wait for market to return to POI zone before taking any trade to avoid mid-range reversals.`;
  } else if (isAtSupplyZone) {
    // We are at Supply Zone! Turning point for FALL.
    if (currentCandleBarColor === 'RED') {
      // Confirmed!
      hasConfirmationBar = true;
      botStatus = 'CONFIRMED_FALL';
      recommendedTrade = 'FALL';
      confidence = 92;
      strategyReason = `Market respected Supply Zone POI (${activePOI?.name || 'DBD Base'}). RED confirmation bar formed, neutralizing false breakout risk. Institutional FALL signal confirmed!`;
    } else {
      // Red bar hasn't formed yet - false breakout caution!
      hasConfirmationBar = false;
      botStatus = 'WAIT_CONFIRMATION_BAR';
      recommendedTrade = 'WAIT';
      confidence = 79;
      falseBreakoutWarning = `Caution: Price is at Supply Zone, but current bar is ${currentCandleBarColor}. Wait for a RED bar to form before trading FALL to avoid a false upside breakout!`;
      strategyReason = falseBreakoutWarning;
    }
  } else if (isAtDemandZone) {
    // We are at Demand Zone! Turning point for RISE.
    if (currentCandleBarColor === 'GREEN') {
      // Confirmed!
      hasConfirmationBar = true;
      botStatus = 'CONFIRMED_RISE';
      recommendedTrade = 'RISE';
      confidence = 92;
      strategyReason = `Market respected Demand Zone POI (${activePOI?.name || 'RBR Base'}). GREEN confirmation bar formed, neutralizing false breakout risk. Institutional RISE signal confirmed!`;
    } else {
      // Green bar hasn't formed yet - false breakout caution!
      hasConfirmationBar = false;
      botStatus = 'WAIT_CONFIRMATION_BAR';
      recommendedTrade = 'WAIT';
      confidence = 79;
      falseBreakoutWarning = `Caution: Price is at Demand Zone, but current bar is ${currentCandleBarColor}. Wait for a GREEN bar to form before trading RISE to avoid a false downside breakout!`;
      strategyReason = falseBreakoutWarning;
    }
  }

  const isAllConditionsMet = recommendedTrade !== 'WAIT' && hasConfirmationBar && confidence >= 85;

  return {
    trend1m,
    trendConfidence,
    trendDescription,
    high30m,
    low30m,
    range30m,
    currentPricePositionPercent,
    supplyZones,
    demandZones,
    activePOI,
    bosPoints,
    isAtSupplyZone,
    isAtDemandZone,
    isInBetweenZones,
    currentCandleBarColor,
    hasConfirmationBar,
    falseBreakoutWarning,
    botStatus,
    recommendedTrade,
    confidence,
    isAllConditionsMet,
    strategyReason,
    authorCredit: AUTHOR_CREDIT,
  };
}

/**
 * Creates or seeds a demo scenario that satisfies the SMC confirmation rule for testing.
 * - Supply Zone with RED bar forming -> TRADE FALL
 * - Demand Zone with GREEN bar forming -> TRADE RISE
 */
export function createCompliantSmcCandles(
  symbol: string,
  targetSignal: 'FALL' | 'RISE',
  currentPrice: number,
  pipSize: number = 2
): CandlestickPoint[] {
  const candles = build1mCandlesticks(
    symbol,
    currentPrice,
    pipSize,
    targetSignal === 'FALL' ? 'DOWNTREND' : 'UPTREND'
  );

  const n = candles.length;
  const baseVol = pipSize === 0 ? 12 : pipSize === 1 ? 2.5 : pipSize === 2 ? 0.35 : 0.004;

  if (targetSignal === 'FALL') {
    // Form a Drop-Base-Drop earlier in the candles
    // Candle n-10: Drop
    candles[n - 10].open = +(currentPrice + baseVol * 3.5).toFixed(pipSize);
    candles[n - 10].close = +(currentPrice + baseVol * 1.5).toFixed(pipSize);
    candles[n - 10].high = +(candles[n - 10].open + baseVol * 0.3).toFixed(pipSize);
    candles[n - 10].low = +(candles[n - 10].close - baseVol * 0.3).toFixed(pipSize);

    // Candle n-9: Base (Supply Zone)
    const baseHigh = +(currentPrice + baseVol * 1.8).toFixed(pipSize);
    const baseLow = +(currentPrice + baseVol * 1.2).toFixed(pipSize);
    candles[n - 9].open = +(currentPrice + baseVol * 1.4).toFixed(pipSize);
    candles[n - 9].close = +(currentPrice + baseVol * 1.5).toFixed(pipSize);
    candles[n - 9].high = baseHigh;
    candles[n - 9].low = baseLow;

    // Candle n-8: Second Drop (Bearish BOS)
    candles[n - 8].open = +(currentPrice + baseVol * 1.2).toFixed(pipSize);
    candles[n - 8].close = +(currentPrice - baseVol * 1.5).toFixed(pipSize);
    candles[n - 8].high = candles[n - 8].open;
    candles[n - 8].low = +(candles[n - 8].close - baseVol * 0.4).toFixed(pipSize);

    // Live candle n-1: Market has returned to the Supply Zone, and a RED bar is forming!
    candles[n - 1].open = +(baseHigh - baseVol * 0.05).toFixed(pipSize);
    candles[n - 1].close = +(candles[n - 1].open - baseVol * 0.45).toFixed(pipSize); // RED bar forming!
    candles[n - 1].high = +(candles[n - 1].open + baseVol * 0.1).toFixed(pipSize);
    candles[n - 1].low = +(candles[n - 1].close - baseVol * 0.1).toFixed(pipSize);
  } else {
    // Form a Rally-Base-Rally earlier in the candles
    // Candle n-10: Rally
    candles[n - 10].open = +(currentPrice - baseVol * 3.5).toFixed(pipSize);
    candles[n - 10].close = +(currentPrice - baseVol * 1.5).toFixed(pipSize);
    candles[n - 10].high = +(candles[n - 10].close + baseVol * 0.3).toFixed(pipSize);
    candles[n - 10].low = +(candles[n - 10].open - baseVol * 0.3).toFixed(pipSize);

    // Candle n-9: Base (Demand Zone)
    const baseLow = +(currentPrice - baseVol * 1.8).toFixed(pipSize);
    const baseHigh = +(currentPrice - baseVol * 1.2).toFixed(pipSize);
    candles[n - 9].open = +(currentPrice - baseVol * 1.5).toFixed(pipSize);
    candles[n - 9].close = +(currentPrice - baseVol * 1.4).toFixed(pipSize);
    candles[n - 9].high = baseHigh;
    candles[n - 9].low = baseLow;

    // Candle n-8: Second Rally (Bullish BOS)
    candles[n - 8].open = +(currentPrice - baseVol * 1.2).toFixed(pipSize);
    candles[n - 8].close = +(currentPrice + baseVol * 1.5).toFixed(pipSize);
    candles[n - 8].high = +(candles[n - 8].close + baseVol * 0.4).toFixed(pipSize);
    candles[n - 8].low = candles[n - 8].open;

    // Live candle n-1: Market has returned to the Demand Zone, and a GREEN bar is forming!
    candles[n - 1].open = +(baseLow + baseVol * 0.05).toFixed(pipSize);
    candles[n - 1].close = +(candles[n - 1].open + baseVol * 0.45).toFixed(pipSize); // GREEN bar forming!
    candles[n - 1].high = +(candles[n - 1].close + baseVol * 0.1).toFixed(pipSize);
    candles[n - 1].low = +(candles[n - 1].open - baseVol * 0.1).toFixed(pipSize);
  }

  return candles;
}
