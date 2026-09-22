export type ToolType = 'OVER_UNDER' | 'MATCHES' | 'RISE_FALL' | 'EVEN_ODD' | 'SCANNER';

export type SignalFilterOption = 'ALL' | 'TRADE_READY' | 'HIGH_CONFIDENCE' | 'ACTIVE_SIGNALS';

export type MarketCategory =
  | 'ALL'
  | 'VOLATILITY_1S'
  | 'VOLATILITY_CONTINUOUS'
  | 'CRASH_BOOM'
  | 'JUMP'
  | 'STEP_RANGE';

export type SignalStrength = 'STRONG' | 'MODERATE' | 'NEUTRAL' | 'WEAK';

export type TradeStatus = 'TRADE_NOW' | 'ANALYZING' | 'WAIT';

export type SignalDirection = 'BUY' | 'SELL' | 'WAIT';

export type MarketScanState =
  | 'SCANNING'
  | 'ANALYZING'
  | 'SIGNAL_ACTIVE'
  | 'MARKET_CHANGING'
  | 'SIGNAL_INVALIDATED'
  | 'SIGNAL_EXPIRED'
  | 'WAIT';

export type SignalMonitoringState = MarketScanState;

export type SignalStability = 'STABLE' | 'WEAKENING' | 'INVALIDATED' | 'STRONG' | 'SEARCHING';

export type TradingWindowDuration = 40 | 45 | 50 | 55 | 60;

export interface SignalHistoryItem {
  id: string;
  time: string; // e.g. "10:42:15"
  marketName: string; // e.g. "Volatility 10 (1s)"
  symbol: string;
  contractType: string; // e.g. "OVER / UNDER"
  prediction: string; // e.g. "OVER 2"
  recommendedTrade: string; // e.g. "OVER 2"
  confidence: number; // e.g. 94
  status: 'ACTIVE' | 'EXPIRED' | 'INVALIDATED' | 'WAIT';
  invalidationReason?: string;
  durationSecs: number;
  createdAt: number;
  expiresAt: number;
}

export interface DigitPredictionSignal {
  tradeInstruction: string; // e.g. "TRADE: OVER 1", "TRADE: UNDER 9", "TRADE: EVEN", "TRADE: DIFFERS 4", "TRADE: RISE", "TRADE: FALL"
  actionType: string; // e.g. "OVER 1", "UNDER 9", "EVEN", "ODD", "DIFFERS", "MATCHES", "RISE", "FALL"
  contractCategory: string; // e.g. "DIGIT OVER / UNDER", "DIGIT EVEN / ODD", "DIGIT DIFFERS", "RISE / FALL"
  confidence: number; // e.g. 92
  riskRewardRatio: string; // e.g. "1:1.15", "1:10.0"
  payoutEst: string; // e.g. "+95.2%", "+11.5%"
  recommendedDuration: string; // "1 - 3 Ticks"
  isTradeReady: boolean; // confidence >= 85%
  statusText: string; // "TRADE READY: TRADE OVER 1"
  tacticalReason: string;
  targetDigit?: number;
}

// Backwards-compatible alias
export type SignalEntryData = DigitPredictionSignal;

export interface BarrierAnalysis {
  barrier: number; // e.g. 1 to 8 for Over, 9 down to 1 for Under
  type: 'OVER' | 'UNDER';
  label: string; // e.g. "OVER 1", "UNDER 7"
  percentage: number; // e.g. 89%
  count: number;
  isEligible: boolean; // >= 85%
}

export type OverLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface DigitMomentumInfo {
  digit: number;
  percent: number;
  recentCount: number;
  momentumDelta: number; // recent % minus prior %
  momentumDirection: 'INCREASING' | 'CONSTANT' | 'DECREASING';
  barColor: 'GREEN' | 'RED' | 'NEUTRAL';
  isGreenBar: boolean; // >= 12% and INCREASING momentum
  isRedBar: boolean; // < 10%
}

export interface OverStrategyConditions {
  rangeValid: boolean; // Analyzes specific valid range (Over 1: 2-9, Over 2: 3-9, etc.)
  greenBarValid: boolean; // Green-bar digit(s) >= 12% with increasing momentum in valid range
  lowerRangeValid: boolean; // Digits at/below level preferably < 10% and red-bar concentrated
  edgeValid: boolean; // Total/avg percentage of valid digits higher than lower digits
}

export interface OverLevelStrategy {
  level: OverLevel;
  validDigits: number[]; // e.g. for Over 2: [3, 4, 5, 6, 7, 8, 9]
  validRangeLabel: string; // "3–9"
  losingDigits: number[]; // [0, 1, 2]
  losingRangeLabel: string; // "0–2"
  greenBarDigits: DigitMomentumInfo[]; // Qualifying green-bar digits in valid range (>=12% & increasing)
  redBarDigits: DigitMomentumInfo[]; // Red-bar digits in lower range (<10%)
  validRangeTotalPercent: number;
  validRangeAvgPercent: number;
  lowerRangeTotalPercent: number;
  lowerRangeAvgPercent: number;
  conditions: OverStrategyConditions;
  isAllConditionsMet: boolean;
  score: number;
  confidence: number;
  statusText: string;
  recommendedTrade: string; // e.g. "OVER 2"
  targetDigit?: number; // Not restricted to 8 or 9; represents dominant driver in range
  strategyReason: string;
}

export interface EvenOddDigitPartItem {
  digit: number;
  count: number;
  percent: number; // percentage of total ticks (sum across all 10 is 100%)
  isEven: boolean;
  isOdd: boolean;
  isGreenBar: boolean; // highest appearing digit overall
  isRedBar: boolean; // lowest appearing digit overall
  isSecondMost: boolean; // second most appearing digit overall
  rank: number; // 1 to 10
}

export interface EvenOddStrategyConditions {
  greenAndRedOnTargetParity: boolean; // Both Green Bar and Red Bar on Odd digits
  greenBarIsOdd: boolean;
  redBarIsOdd: boolean;
  greenBarValid: boolean; // Green Bar >= 10.5%
  greenBarHighlyRecommended: boolean; // Green Bar >= 11.5%
  redBarValid: boolean; // Red Bar <= 10.0%
  redBarHighlyRecommended: boolean; // Red Bar <= 9.0%
  remainingDigitsValid: boolean; // All remaining odd digits >= 10.5%
  remainingDigitsHighlyRecommended: boolean; // All remaining odd digits >= 11.5%
  secondMostValid: boolean; // 2nd most appearing digit is also an Odd digit
}

export interface EvenOddStrategyAnalysis {
  targetDirection: 'ODD' | 'EVEN';
  part1Digits: EvenOddDigitPartItem[]; // Digits 0 to 4 (Part 1)
  part2Digits: EvenOddDigitPartItem[]; // Digits 5 to 9 (Part 2)
  allDigits: EvenOddDigitPartItem[]; // Digits 0 to 9
  totalPercentage: number; // 100%
  greenBarDigit: EvenOddDigitPartItem;
  redBarDigit: EvenOddDigitPartItem;
  secondMostDigit: EvenOddDigitPartItem;
  oddDigits: EvenOddDigitPartItem[]; // 1, 3, 5, 7, 9
  evenDigits: EvenOddDigitPartItem[]; // 0, 2, 4, 6, 8
  conditions: EvenOddStrategyConditions;
  isAllConditionsMet: boolean;
  confidence: number;
  statusText: string;
  recommendedTrade: string; // "TRADE ODD" or "WAIT"
  strategyReason: string;
}

export type MarketTrend1m = 'UPTREND' | 'DOWNTREND' | 'CONSOLIDATION';

export interface SupplyDemandZone {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  name: string; // e.g. "DBD Supply Base #1" or "RBR Demand Base #1"
  pattern: 'DROP_BASE_DROP' | 'RALLY_BASE_RALLY' | 'SWING_HIGH_SUPPLY' | 'SWING_LOW_DEMAND';
  highPrice: number;
  lowPrice: number;
  candleIndexStart: number;
  candleIndexEnd: number;
  timeStart: string;
  isObeyed: boolean; // market reached and respected zone
  testCount: number; // how many times price tested this zone
  isCurrentZone: boolean; // if price is currently inside or touching this zone
  distanceFromCurrentPrice: number; // in points
}

export interface BOSPoint {
  id: string;
  type: 'BULLISH_BOS' | 'BEARISH_BOS';
  price: number;
  time: string;
  candleIndex: number;
  brokenLevel: number;
  description: string;
}

export interface SmcRiseFallStrategyAnalysis {
  trend1m: MarketTrend1m;
  trendConfidence: number; // e.g. 88%
  trendDescription: string;
  high30m: number; // 30-min highest high
  low30m: number; // 30-min lowest low
  range30m: number; // high30m - low30m
  currentPricePositionPercent: number; // 0% at low30m, 100% at high30m
  supplyZones: SupplyDemandZone[]; // Supply zones (Drop-Base-Drop & Highs)
  demandZones: SupplyDemandZone[]; // Demand zones (Rally-Base-Rally & Lows)
  activePOI: SupplyDemandZone | null; // Nearest or active Point of Interest
  bosPoints: BOSPoint[]; // Break of Structure points
  isAtSupplyZone: boolean;
  isAtDemandZone: boolean;
  isInBetweenZones: boolean; // in between supply & demand zones
  currentCandleBarColor: 'GREEN' | 'RED' | 'DOJI';
  hasConfirmationBar: boolean; // red bar at supply zone, or green bar at demand zone
  falseBreakoutWarning: string | null;
  botStatus: 'WAIT_FOR_POI' | 'WAIT_CONFIRMATION_BAR' | 'CONFIRMED_FALL' | 'CONFIRMED_RISE';
  recommendedTrade: 'FALL' | 'RISE' | 'WAIT';
  confidence: number;
  isAllConditionsMet: boolean;
  strategyReason: string;
  authorCredit: {
    botName: string; // "BABYOIL SPEEDBOT on D-Xpert"
    tagline: string; // "Your Expert in D Technology"
    telegram: string; // "@D_X"
  };
}

export interface MarketPrediction {
  toolType: ToolType;
  primarySignal: string; // e.g. "UNDER 9", "OVER 7", "DIFFERS 3", "MATCH 7", "RISE", "FALL", "EVEN", "ODD", "WAIT"
  recommendedTrade: string; // e.g. "UNDER 9", "OVER 7", "RISE", "FALL", "EVEN", "ODD", "MATCH 7", "DIFFER 3", "WAIT"
  contractType: string; // e.g. "OVER / UNDER", "RISE / FALL", "EVEN / ODD", "MATCHES / DIFFERS"
  targetDigit?: number;
  confidence: number; // e.g. 93 (percentage)
  signalStrength: SignalStrength;
  tradeStatus: TradeStatus; // 'TRADE_NOW' if >= 85%, 'ANALYZING' or 'WAIT'
  isTradeReady: boolean; // confidence >= 85
  reasoning: string;
  consecutiveStreak: number;
  historicalAccuracy: number;
  recommendedDuration: string; // "1 - 3 Ticks"
  barrierAnalyses?: BarrierAnalysis[]; // Full barrier analysis for Over 1..8 and Under 9..1
  bestBarrier?: BarrierAnalysis; // The best barrier >= 85%
  recommendedContract: string; // e.g. "Over 2 (89%)", "Under 7 (88%)", "Differs 3 (93%)"
  signalEntry?: SignalEntryData; // Dynamic SL/TP/Entry levels
  overStrategy?: OverLevelStrategy; // Active Over 1-8 Strategy analysis
  allOverStrategies?: Record<number, OverLevelStrategy>; // Analyses for all levels 1-8
  digitMomentums?: Record<number, DigitMomentumInfo>; // Momentum metrics for 0-9
  evenOddStrategy?: EvenOddStrategyAnalysis; // Active Even/Odd strategy analysis
  smcStrategy?: SmcRiseFallStrategyAnalysis; // Active SMC Supply/Demand Rise & Fall analysis
}

export interface MarketStats {
  evenCount: number;
  oddCount: number;
  evenPercent: number;
  oddPercent: number;
  overCount: number;
  underCount: number;
  overPercent: number;
  underPercent: number;
  riseCount: number;
  fallCount: number;
  risePercent: number;
  fallPercent: number;
  matchesCount: number;
  differsCount: number;
  matchesPercent: number;
  differsPercent: number;
  digitFrequencies: Record<number, number>; // 0..9 counts
  hottestDigits: number[];
  coldestDigits: number[];
  // Granular counts for each digit barrier
  overBarriers: Record<number, { count: number; percent: number }>; // Over 1..8
  underBarriers: Record<number, { count: number; percent: number }>; // Under 9..1
  digitMomentums?: Record<number, DigitMomentumInfo>; // Momentum metrics for 0-9
}

export interface DerivMarketItem {
  symbol: string;
  displayName: string;
  shortName: string;
  category: MarketCategory;
  pipSize: number;
  currentPrice: number;
  previousPrice: number;
  priceDelta: number;
  lastDigit: number;
  recentDigits: number[];
  recentPrices: number[];
  countdown: number; // seconds remaining in current phase (e.g. 58s)
  totalCycleTime: number; // total duration of current phase in seconds (e.g. 60s)
  scanState: MarketScanState; // 'SCANNING' | 'ANALYZING' | 'SIGNAL_ACTIVE' | 'MARKET_CHANGING' | 'SIGNAL_INVALIDATED' | 'SIGNAL_EXPIRED' | 'WAIT'
  scanProgress: number; // 0 to 100 percentage
  signalStability: SignalStability; // 'STABLE' | 'WEAKENING' | 'INVALIDATED' | 'STRONG' | 'SEARCHING'
  previousSignal?: string;
  invalidationAlert?: {
    previousSignal: string;
    message: string;
    timestamp: number;
  } | null;
  activeSignalId?: string;
  signalGeneratedAt?: number;
  prediction: MarketPrediction;
  stats: MarketStats;
  isStreaming: boolean;
  lastUpdated: number;
  candlestickData1m?: CandlestickPoint[];
  smcStrategy?: SmcRiseFallStrategyAnalysis;
}

export interface MarketAlertConfig {
  soundEnabled: boolean;
  minConfidence: number;
  alertOnStreak: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'TRADER' | 'PRO_TRADER' | 'ADMIN';
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  sessionExpiresAt?: number;
  lastActiveAt?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  confirmPassword?: string;
  email?: string;
}

export interface CandlestickPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20: number;
  sma50: number;
}

export type MarketContractType = 'EVEN_ODD' | 'MATCHES' | 'OVER_UNDER' | 'RISE_FALL';

export interface MarketSignalAlert {
  id: string;
  marketSymbol: string;
  marketDisplayName: string;
  marketCategory: MarketCategory;
  contractType: MarketContractType;
  contractTypeLabel: 'Even / Odd' | 'Matches / Differs' | 'Over / Under' | 'Rise / Fall';
  signalDetected: string;
  recommendedDirection: string;
  confidence: number;
  signalStrength: 'STRONG' | 'VERY_STRONG';
  briefReason: string;
  lastDigit: number;
  currentPrice: number;
  targetDigit?: number;
  timestamp: number;
  expiresAt?: number;
  timeFormatted: string;
}

