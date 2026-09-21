import { CandlestickPoint } from '../types';

export interface MarketChartConfig {
  symbol: string;
  name: string;
  category: string;
  basePrice: number;
  volatility: number;
  pipSize: number;
  trend: 'BULLISH' | 'BEARISH' | 'VOLATILE';
  signal: string;
}

export const LANDING_MARKETS: MarketChartConfig[] = [
  {
    symbol: '1HZ100V',
    name: 'Volatility 100 (1s) Index',
    category: 'High Volatility',
    basePrice: 1248.5,
    volatility: 8.5,
    pipSize: 2,
    trend: 'BULLISH',
    signal: 'OVER 2 (91.4% PROBABILITY)',
  },
  {
    symbol: 'R_75',
    name: 'Volatility 75 Index',
    category: 'Continuous Synthetic',
    basePrice: 8740.2,
    volatility: 14.0,
    pipSize: 2,
    trend: 'VOLATILE',
    signal: 'MATCHES 7 (88.6% PROBABILITY)',
  },
  {
    symbol: 'BOOM500',
    name: 'Boom 500 Index',
    category: 'Crash / Boom Spike',
    basePrice: 3512.8,
    volatility: 6.2,
    pipSize: 2,
    trend: 'BULLISH',
    signal: 'RISE / HIGHER (89.2% CONFIDENCE)',
  },
  {
    symbol: 'STP',
    name: 'Step Index',
    category: 'Discrete Distribution',
    basePrice: 8120.5,
    volatility: 4.8,
    pipSize: 1,
    trend: 'BEARISH',
    signal: 'UNDER 7 (93.1% CONFIDENCE)',
  },
];

// Generate realistic synthetic candlesticks with EMAs and volume
export function generateCandlestickData(
  config: MarketChartConfig,
  candleCount: number = 32
): CandlestickPoint[] {
  const points: CandlestickPoint[] = [];
  let current = config.basePrice;
  const now = Date.now();
  const stepMs = 60 * 1000; // 1m candles

  // Trend bias factor
  const bias = config.trend === 'BULLISH' ? 0.4 : config.trend === 'BEARISH' ? -0.4 : 0.05;

  let ema20 = current;
  let sma50 = current;

  for (let i = candleCount; i >= 0; i--) {
    const candleTime = new Date(now - i * stepMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const change = (Math.random() - 0.48 + bias) * config.volatility;
    const open = current;
    const close = +(open + change).toFixed(config.pipSize);
    const high = +(Math.max(open, close) + Math.random() * config.volatility * 0.7).toFixed(
      config.pipSize
    );
    const low = +(Math.min(open, close) - Math.random() * config.volatility * 0.7).toFixed(
      config.pipSize
    );
    const volume = Math.floor(120 + Math.random() * 450);

    // Exponential Moving Average approx
    ema20 = +(ema20 * 0.9 + close * 0.1).toFixed(config.pipSize);
    sma50 = +(sma50 * 0.95 + close * 0.05).toFixed(config.pipSize);

    points.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
      ema20,
      sma50,
    });

    current = close;
  }

  return points;
}
