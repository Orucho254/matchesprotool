import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DerivMarketItem } from '../types';
import {
  Square,
  Play,
  Zap,
  ChevronDown,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { soundService } from '../utils/audio';
import { extractLastDigit } from '../data/markets';
import {
  TradingRecommendationCard,
  RecommendationCardData,
} from './TradingRecommendationCard';

interface MatchesDiffersTemplateProps {
  markets: DerivMarketItem[];
  onOpenModal?: (market: DerivMarketItem) => void;
}

type SignalTabOption = 'Matches' | 'Differs' | 'Signal';

const DERIV_WS_ENDPOINTS = [
  'wss://ws.derivws.com/websockets/v3?app_id=1089',
  'wss://ws.binaryws.com/websockets/v3?app_id=1089',
  'wss://red.derivws.com/websockets/v3?app_id=1089',
  'wss://blue.derivws.com/websockets/v3?app_id=1089',
];

export interface DigitStatAnalysis {
  digit: number;
  count: number;
  matchPercent: number;
  differPercent: number;
  absence: number;
}

export interface MarketAnalysisResult {
  totalTicks: number;
  digitStats: DigitStatAnalysis[];
  matchingTarget: {
    digit: number;
    count: number;
    matchPercent: number;
    absence: number;
  };
  differingTarget: {
    digit: number;
    count: number;
    differPercent: number;
    matchPercent: number;
    absence: number;
  };
  isValid: boolean;
  validationNotice?: string;
}

/**
 * Pure mathematical analysis function that calculates:
 * - Digit frequency distribution (0-9)
 * - Absence distance (ticks since last occurrence from latest tick)
 * - Matches target: HIGHEST frequency (tie-breaker: most recently seen)
 * - Differs target: LOWEST frequency (tie-breaker: least recently seen)
 * - Matches probability: (count / totalTicks) * 100
 * - Differs probability: 100 - (count / totalTicks * 100)
 * - Section 14 Internal Validation Checks
 */
export function calculateMarketTickAnalysis(digits: number[]): MarketAnalysisResult {
  const totalTicks = digits.length;

  if (totalTicks === 0) {
    const emptyStats: DigitStatAnalysis[] = Array.from({ length: 10 }).map((_, digit) => ({
      digit,
      count: 0,
      matchPercent: 0,
      differPercent: 0,
      absence: 0,
    }));
    return {
      totalTicks: 0,
      digitStats: emptyStats,
      matchingTarget: { digit: 0, count: 0, matchPercent: 0, absence: 0 },
      differingTarget: { digit: 0, count: 0, differPercent: 0, matchPercent: 0, absence: 0 },
      isValid: false,
      validationNotice: 'Awaiting live ticks from Deriv stream...',
    };
  }

  // 1. Calculate occurrence frequencies for each digit 0 to 9
  const frequencies: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    if (typeof d === 'number' && d >= 0 && d <= 9) {
      frequencies[d] = (frequencies[d] || 0) + 1;
    }
  }

  // 2. Calculate absence distance (how many ticks ago was digit seen from the latest tick)
  const absenceDistance: Record<number, number> = {};
  for (let d = 0; d <= 9; d++) {
    let ticksAgo = 0;
    let found = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      if (digits[i] === d) {
        found = true;
        break;
      }
      ticksAgo++;
    }
    // If not found in the window, mark absence beyond the current window
    absenceDistance[d] = found ? ticksAgo : totalTicks + 10;
  }

  // 3. Build 0-9 Digit Stats with exact mathematical probabilities
  const digitStats: DigitStatAnalysis[] = Array.from({ length: 10 }).map((_, digit) => {
    const count = frequencies[digit] || 0;
    const matchPercent = Number(((count / totalTicks) * 100).toFixed(1));
    const differPercent = Number((((totalTicks - count) / totalTicks) * 100).toFixed(1));
    const absence = absenceDistance[digit] ?? totalTicks;

    return {
      digit,
      count,
      matchPercent,
      differPercent,
      absence,
    };
  });

  // 4. MATCHES RULE: HIGHEST CURRENT OCCURRENCE/FREQUENCY
  // Deterministic tie-breaker: Most recently observed digit among tied digits (lowest absence distance)
  const sortedForMatches = [...digitStats].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count; // Highest count first
    }
    if (a.absence !== b.absence) {
      return a.absence - b.absence; // Lowest absence distance first (most recent)
    }
    return a.digit - b.digit; // Deterministic lower digit
  });

  const matchingTarget = {
    digit: sortedForMatches[0].digit,
    count: sortedForMatches[0].count,
    matchPercent: sortedForMatches[0].matchPercent,
    absence: sortedForMatches[0].absence,
  };

  // 5. DIFFERS RULE: LOWEST CURRENT OCCURRENCE/FREQUENCY
  // Deterministic tie-breaker: Least recently observed digit among tied digits (highest absence distance)
  const sortedForDiffers = [...digitStats].sort((a, b) => {
    if (a.count !== b.count) {
      return a.count - b.count; // Lowest count first
    }
    if (b.absence !== a.absence) {
      return b.absence - a.absence; // Highest absence distance first (least recent)
    }
    return a.digit - b.digit; // Deterministic lower digit
  });

  const differingTarget = {
    digit: sortedForDiffers[0].digit,
    count: sortedForDiffers[0].count,
    differPercent: sortedForDiffers[0].differPercent,
    matchPercent: sortedForDiffers[0].matchPercent,
    absence: sortedForDiffers[0].absence,
  };

  // 6. Section 14 Internal Validation Checks
  const validationErrors: string[] = [];
  const sumCounts = digitStats.reduce((acc, s) => acc + s.count, 0);
  if (sumCounts !== totalTicks) {
    validationErrors.push(`Sum of counts (${sumCounts}) does not equal total ticks (${totalTicks})`);
  }

  const maxCount = Math.max(...digitStats.map((s) => s.count));
  if (matchingTarget.count !== maxCount) {
    validationErrors.push(`Matches target count (${matchingTarget.count}) is not max count (${maxCount})`);
  }

  const minCount = Math.min(...digitStats.map((s) => s.count));
  if (differingTarget.count !== minCount) {
    validationErrors.push(`Differs target count (${differingTarget.count}) is not min count (${minCount})`);
  }

  const expectedMatchP = Number(((matchingTarget.count / totalTicks) * 100).toFixed(1));
  if (Math.abs(matchingTarget.matchPercent - expectedMatchP) > 0.1) {
    validationErrors.push(`Matches probability mismatch: got ${matchingTarget.matchPercent}%, expected ${expectedMatchP}%`);
  }

  const expectedDifferP = Number((((totalTicks - differingTarget.count) / totalTicks) * 100).toFixed(1));
  if (Math.abs(differingTarget.differPercent - expectedDifferP) > 0.1) {
    validationErrors.push(`Differs probability mismatch: got ${differingTarget.differPercent}%, expected ${expectedDifferP}%`);
  }

  return {
    totalTicks,
    digitStats,
    matchingTarget,
    differingTarget,
    isValid: validationErrors.length === 0,
    validationNotice: validationErrors.length > 0 ? validationErrors.join('; ') : undefined,
  };
}

export const MatchesDiffersTemplate: React.FC<MatchesDiffersTemplateProps> = ({
  markets,
}) => {
  // 1. Filter available Volatility Indices
  const volatilityMarkets = useMemo(() => {
    const list = markets.filter(
      (m) =>
        m.category === 'VOLATILITY_1S' ||
        m.category === 'VOLATILITY_CONTINUOUS' ||
        m.symbol.startsWith('1HZ') ||
        m.symbol.startsWith('R_')
    );
    return list.length > 0 ? list : markets;
  }, [markets]);

  // Default symbol (Volatility 100 (1s) Index or first available)
  const defaultSymbol = useMemo(() => {
    const found = volatilityMarkets.find((m) => m.symbol === '1HZ100V');
    return found ? found.symbol : volatilityMarkets[0]?.symbol || '1HZ100V';
  }, [volatilityMarkets]);

  // Active selected market symbol
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultSymbol);
  const selectedSymbolRef = useRef<string>(defaultSymbol);
  selectedSymbolRef.current = selectedSymbol;

  // Current active market metadata
  const currentMarket = useMemo(() => {
    return (
      volatilityMarkets.find((m) => m.symbol === selectedSymbol) ||
      volatilityMarkets[0] ||
      markets[0]
    );
  }, [volatilityMarkets, selectedSymbol, markets]);

  // 2. MARKET-SPECIFIC TICKS CACHE: Record<string, number[]>
  // Each market symbol maintains its own isolated 40-tick window.
  // Initialized with market-specific digits so switching immediately reflects that market's data.
  const [marketTicksCache, setMarketTicksCache] = useState<Record<string, number[]>>(() => {
    const initialMap: Record<string, number[]> = {};
    volatilityMarkets.forEach((m) => {
      if (m.recentDigits && m.recentDigits.length > 0) {
        initialMap[m.symbol] = m.recentDigits.slice(-40);
      }
    });
    return initialMap;
  });

  const [pipSize, setPipSize] = useState<number>(currentMarket?.pipSize ?? 2);
  const [isLoadingMarketTicks, setIsLoadingMarketTicks] = useState<boolean>(false);

  // 3. Stream controls & Deep analysis state
  const [isStreamingPaused, setIsStreamingPaused] = useState<boolean>(false);
  const isStreamingPausedRef = useRef<boolean>(false);
  isStreamingPausedRef.current = isStreamingPaused;

  const [isScannerDismissed, setIsScannerDismissed] = useState<boolean>(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState<boolean>(false);

  // 4. Trading Signals tab ("Matches" | "Differs" | "Signal")
  const [activeSignalTab, setActiveSignalTab] = useState<SignalTabOption>('Matches');

  // 5. Auto-generate every 30s option
  const [autoGenerate30s, setAutoGenerate30s] = useState<boolean>(true);
  const [autoGenCountdown, setAutoGenCountdown] = useState<number>(20);

  // 6. 50-second signal validity countdown
  const [signalValiditySec, setSignalValiditySec] = useState<number>(50);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number>(Date.now());

  // WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const endpointIndexRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  // Active 40 ticks for currently selected market
  const activeTicks = useMemo<number[]>(() => {
    const cached = marketTicksCache[selectedSymbol];
    if (cached && cached.length > 0) {
      return cached;
    }
    // If not yet in cache, check current market's recent digits
    if (currentMarket?.recentDigits && currentMarket.recentDigits.length > 0) {
      return currentMarket.recentDigits.slice(-40);
    }
    return [];
  }, [marketTicksCache, selectedSymbol, currentMarket]);

  // Handle market change: strictly resets state and switches to selected market's dataset
  const handleMarketChange = useCallback((newSymbol: string) => {
    if (newSymbol === selectedSymbol) return;

    setIsScannerDismissed(false);
    setSelectedSymbol(newSymbol);
    selectedSymbolRef.current = newSymbol;

    // Reset validity and generation countdown
    setSignalValiditySec(50);
    setAutoGenCountdown(20);
    setLastGeneratedAt(Date.now());

    // Check if new market has cached ticks; if not, mark loading
    setMarketTicksCache((prev) => {
      if (!prev[newSymbol] || prev[newSymbol].length === 0) {
        setIsLoadingMarketTicks(true);
      } else {
        setIsLoadingMarketTicks(false);
      }
      return prev;
    });
  }, [selectedSymbol]);

  // Connect and subscribe to Deriv live ticks & history for the currently selected market
  useEffect(() => {
    let isCancelled = false;

    const connectToDeriv = () => {
      if (isCancelled) return;

      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ forget_all: 'ticks' }));
          }
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }

      const endpoint = DERIV_WS_ENDPOINTS[endpointIndexRef.current % DERIV_WS_ENDPOINTS.length];

      try {
        const ws = new WebSocket(endpoint);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;

          // Request 40 ticks history for the newly selected market
          ws.send(
            JSON.stringify({
              ticks_history: selectedSymbol,
              end: 'latest',
              count: 40,
              style: 'ticks',
              subscribe: 1,
            })
          );

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ ping: 1 }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(event.data);

            // 1. Deriv Historical Ticks Response (40 ticks for current market)
            if (data.msg_type === 'history' && data.history && Array.isArray(data.history.prices)) {
              const echoedSymbol = data.echo_req?.ticks_history;
              if (echoedSymbol && echoedSymbol !== selectedSymbolRef.current) {
                return;
              }

              const rawPrices: any[] = data.history.prices;
              const validPrices: number[] = [];
              rawPrices.forEach((p) => {
                const num = Number(p);
                if (!isNaN(num) && isFinite(num) && num > 0) {
                  validPrices.push(num);
                }
              });

              if (validPrices.length === 0) return;

              const serverPipSize =
                typeof data.pip_size === 'number'
                  ? data.pip_size
                  : currentMarket?.pipSize ?? 2;
              setPipSize(serverPipSize);

              // Extract last digit of each price
              const freshDigits = validPrices.slice(-40).map((price) => extractLastDigit(price, serverPipSize));

              if (freshDigits.length > 0) {
                const targetSymbol = echoedSymbol || selectedSymbolRef.current;
                setMarketTicksCache((prev) => ({
                  ...prev,
                  [targetSymbol]: freshDigits,
                }));
                setIsLoadingMarketTicks(false);
              }
            }

            // 2. Real-time Incoming Live Tick from Deriv
            if (data.msg_type === 'tick' && data.tick) {
              const tickSymbol = data.tick.symbol;
              if (tickSymbol !== selectedSymbolRef.current) {
                return;
              }

              if (isStreamingPausedRef.current) {
                return;
              }

              const quote = Number(data.tick.quote);
              if (isNaN(quote) || !isFinite(quote) || quote <= 0) {
                return;
              }

              const serverPipSize =
                typeof data.tick.pip_size === 'number' ? data.tick.pip_size : pipSize;
              const newDigit = extractLastDigit(quote, serverPipSize);

              // Slide the 40-tick window strictly for this market
              setMarketTicksCache((prev) => {
                const existing = prev[tickSymbol] || [];
                const updated = [...existing.slice(-39), newDigit];
                return {
                  ...prev,
                  [tickSymbol]: updated,
                };
              });
              setIsLoadingMarketTicks(false);
            }
          } catch (err) {
            console.warn('Deriv WebSocket message error:', err);
          }
        };

        ws.onerror = () => {
          // Silent recovery
        };

        ws.onclose = () => {
          if (isCancelled) return;
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          endpointIndexRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connectToDeriv, 2000);
        };
      } catch {
        endpointIndexRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connectToDeriv, 2500);
      }
    };

    connectToDeriv();

    return () => {
      isCancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ forget_all: 'ticks' }));
          }
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [selectedSymbol, currentMarket, pipSize]);

  // Auto-generate 30s countdown timer
  useEffect(() => {
    if (!autoGenerate30s) return;

    const interval = setInterval(() => {
      setAutoGenCountdown((prev) => {
        if (prev <= 1) {
          setLastGeneratedAt(Date.now());
          setSignalValiditySec(50);
          soundService.playSignalAlert();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoGenerate30s]);

  // Signal Validity Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalValiditySec((prev) => {
        if (prev <= 1) return 50;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lastGeneratedAt]);

  // Calculate stats strictly from current market's 40 live ticks
  const stats = useMemo<MarketAnalysisResult>(() => {
    return calculateMarketTickAnalysis(activeTicks);
  }, [activeTicks]);

  // Matches Data for TradingRecommendationCard
  const matchesData = useMemo<RecommendationCardData>(() => {
    const target = stats.matchingTarget;
    const total = stats.totalTicks;

    return {
      marketName: currentMarket.displayName,
      targetDigit: target.digit,
      confidence: target.matchPercent,
      totalTicks: total,
      occurrences: target.count,
      absence: target.absence,
      reason: `Live Deriv data: Digit ${target.digit} holds the highest occurrence frequency (${target.count} appearances, ${target.matchPercent}%) across the last ${total} Deriv ticks.`,
      recommendedTrade: `MATCH ${target.digit}`,
      validitySec: signalValiditySec,
      digitStats: stats.digitStats,
    };
  }, [stats, currentMarket, signalValiditySec]);

  // Differs Data for TradingRecommendationCard
  const differsData = useMemo<RecommendationCardData>(() => {
    const target = stats.differingTarget;
    const total = stats.totalTicks;

    return {
      marketName: currentMarket.displayName,
      targetDigit: target.digit,
      confidence: target.differPercent,
      totalTicks: total,
      occurrences: target.count,
      absence: target.absence,
      reason: `Live Deriv data: Digit ${target.digit} holds the lowest occurrence frequency (${target.count} appearances, ${target.matchPercent}%) across the last ${total} Deriv ticks, yielding a ${target.differPercent}% statistical Differ probability.`,
      recommendedTrade: `DIFFER ${target.digit}`,
      validitySec: signalValiditySec,
      digitStats: stats.digitStats,
    };
  }, [stats, currentMarket, signalValiditySec]);

  // Signal Data for Composite Mode
  const signalData = useMemo<RecommendationCardData>(() => {
    if (differsData.confidence >= 90) {
      return {
        ...differsData,
        recommendedTrade: `DIFFER ${differsData.targetDigit}`,
      };
    }
    return {
      ...matchesData,
      recommendedTrade: `MATCH ${matchesData.targetDigit}`,
    };
  }, [differsData, matchesData]);

  // Handle Deep Analysis Trigger
  const handleRunDeepAnalysis = () => {
    setIsDeepAnalyzing(true);
    soundService.playSignalAlert();
    setIsScannerDismissed(false);
    setSignalValiditySec(50);
    setAutoGenCountdown(20);
    setLastGeneratedAt(Date.now());

    // Request fresh 40 ticks from Deriv
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          ticks_history: selectedSymbol,
          end: 'latest',
          count: 40,
          style: 'ticks',
        })
      );
    }

    setTimeout(() => {
      setIsDeepAnalyzing(false);
    }, 450);
  };

  return (
    <div id="matches-differs-template" className="space-y-4 max-w-5xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. TOP ACTION ROW: STOP | Deep analysis | Volatility selector (Exact to Screenshot 2) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Red STOP / RESUME Button */}
          <button
            id="md-stop-button"
            type="button"
            onClick={() => setIsStreamingPaused((prev) => !prev)}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isStreamingPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-[#e11d48] hover:bg-[#be123c] text-white shadow-rose-950/50 ring-1 ring-rose-500/30'
            }`}
          >
            {isStreamingPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RESUME</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </>
            )}
          </button>

          {/* Deep Analysis Button */}
          <button
            id="md-deep-analysis-button"
            type="button"
            onClick={handleRunDeepAnalysis}
            disabled={isDeepAnalyzing}
            className="px-4 py-2 rounded-lg font-bold text-xs bg-[#101b2e] hover:bg-[#182642] text-slate-200 hover:text-white border border-[#1f2e47] flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isDeepAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            ) : (
              <span className="text-slate-400 font-mono font-bold">&gt;_</span>
            )}
            <span>{isDeepAnalyzing ? 'Analyzing...' : 'Deep analysis'}</span>
          </button>

          {/* Live Indicator / Tick Count Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1527] border border-[#192740] text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentMarket.displayName}:</span>
            <strong className="text-slate-200">{stats.totalTicks} Ticks</strong>
          </div>
        </div>

        {/* Volatility Index Selector on the Right */}
        <div className="relative min-w-[220px]">
          <select
            id="md-volatility-index-selector"
            value={selectedSymbol}
            onChange={(e) => handleMarketChange(e.target.value)}
            className="w-full appearance-none bg-[#0c1626] hover:bg-[#14213d] border border-[#1b2b44] rounded-xl px-4 py-2 text-xs font-bold text-white font-mono focus:outline-hidden focus:border-[#00e599] cursor-pointer pr-9 transition-colors shadow-inner"
          >
            {volatilityMarkets.map((m) => (
              <option key={m.symbol} value={m.symbol}>
                {m.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PURPLE DERIV SCANNER ACTIVE BANNER (Exact to Screenshot 2) */}
      {/* ========================================================================= */}
      {!isScannerDismissed && stats.matchingTarget && stats.differingTarget && (
        <div
          id="md-scanner-banner"
          className="p-3 sm:py-2.5 sm:px-4 rounded-xl bg-[#180d2d] border border-[#441869] text-xs font-mono text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg animate-fadeIn"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed">
              Deriv scanner active ({stats.totalTicks} live ticks): Differ target digit{' '}
              <strong className="text-purple-100 font-bold">{stats.differingTarget.digit}</strong> has{' '}
              <strong className="text-purple-100 font-bold">{stats.differingTarget.differPercent}%</strong> probability ({stats.differingTarget.count} hits). Match target digit{' '}
              <strong className="text-purple-100 font-bold">{stats.matchingTarget.digit}</strong> leads with{' '}
              <strong className="text-purple-100 font-bold">{stats.matchingTarget.matchPercent}%</strong> ({stats.matchingTarget.count} hits).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsScannerDismissed(true)}
            className="text-purple-400 hover:text-purple-200 underline text-xs font-mono cursor-pointer shrink-0 self-end sm:self-center ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Validation notice if calculations ever diverge */}
      {stats.validationNotice && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs font-mono text-amber-300">
          Validation Warning: {stats.validationNotice}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TABS (Matches | Differs | Signal) & AUTO-GENERATE BAR (Exact to Screenshot 2) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Segmented Tab Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#09101f] border border-[#16233b] w-fit">
          {(['Matches', 'Differs', 'Signal'] as SignalTabOption[]).map((tab) => {
            const isActive = activeSignalTab === tab;
            return (
              <button
                key={tab}
                id={`md-signal-tab-${tab.toLowerCase()}`}
                type="button"
                onClick={() => setActiveSignalTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00e599] text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Auto-generate every 30s Checkbox + 20s Countdown pill */}
        <div className="flex items-center gap-3">
          <label
            id="md-auto-generate-30s-toggle"
            className="flex items-center gap-2 text-xs font-mono font-bold text-white cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={autoGenerate30s}
              onChange={(e) => setAutoGenerate30s(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-[#09101f] text-[#00e599] focus:ring-0 cursor-pointer accent-[#00e599]"
            />
            <span>Auto-generate every 30s</span>
          </label>

          {autoGenerate30s && (
            <div className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#24103a] text-purple-300 border border-[#4d1d78] flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3 h-3 text-purple-400" />
              <span>{autoGenCountdown}s</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UNIFIED TRADING RECOMMENDATION CARD (Exact to Screenshot 2) */}
      {/* ========================================================================= */}
      {isLoadingMarketTicks && activeTicks.length === 0 ? (
        <div className="rounded-2xl bg-[#09101f] border border-[#16233b] p-12 text-center font-mono text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#00e599] mx-auto" />
          <div className="text-sm font-bold text-slate-200">
            Analyzing 40 live ticks for {currentMarket.displayName}...
          </div>
          <div className="text-xs text-slate-500">
            Establishing isolated Deriv WebSocket subscription
          </div>
        </div>
      ) : (
        <>
          {activeSignalTab === 'Matches' && (
            <TradingRecommendationCard mode="matches" data={matchesData} />
          )}

          {activeSignalTab === 'Differs' && (
            <TradingRecommendationCard mode="differs" data={differsData} />
          )}

          {activeSignalTab === 'Signal' && (
            <TradingRecommendationCard mode="signal" data={signalData} />
          )}
        </>
      )}
    </div>
  );
};

