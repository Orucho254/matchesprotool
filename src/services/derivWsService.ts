import {
  DerivMarketItem,
  ToolType,
  TradingWindowDuration,
  SignalHistoryItem,
  SignalStability,
  OverLevel,
} from '../types';
import {
  extractLastDigit,
  computeStats,
  computePrediction,
  evaluateSignalHealth,
} from '../data/markets';
import { marketSignalAlertService } from './marketSignalAlertService';

type TicksListener = (markets: DerivMarketItem[]) => void;
type ConnectionListener = (connected: boolean) => void;
type HistoryListener = (history: SignalHistoryItem[]) => void;

class DerivWsService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private tickListeners: Set<TicksListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private historyListeners: Set<HistoryListener> = new Set();
  private activeMarkets: DerivMarketItem[] = [];
  private historyLog: SignalHistoryItem[] = [];
  private currentTool: ToolType = 'OVER_UNDER';
  private selectedOverLevel: OverLevel | null = null;
  private tradingWindowDuration: TradingWindowDuration = 60; // 40, 45, 50, 55, 60s
  private timerInterval: any = null;
  private liveCycleInterval: any = null;
  private subscribedSymbols: Set<string> = new Set();

  public init(initialMarkets: DerivMarketItem[], toolType: ToolType) {
    this.activeMarkets = [...initialMarkets];
    this.currentTool = toolType;
    this.connectWs();
    this.startSimulationAndTimerEngine();
  }

  public setSelectedOverLevel(level: OverLevel | null) {
    this.selectedOverLevel = level;
    // Re-evaluate predictions immediately for OVER_UNDER
    if (this.currentTool === 'OVER_UNDER') {
      this.activeMarkets = this.activeMarkets.map((market) => {
        const prediction = computePrediction(
          'OVER_UNDER',
          market.recentDigits,
          market.recentPrices,
          market.stats,
          this.selectedOverLevel
        );
        return {
          ...market,
          prediction,
        };
      });
      this.notifyListeners();
    }
  }

  public getSelectedOverLevel(): OverLevel | null {
    return this.selectedOverLevel;
  }

  public setToolType(toolType: ToolType) {
    this.currentTool = toolType;
    marketSignalAlertService.setCurrentTool(toolType);
    // When switching tools, immediately recompute category prediction and start smooth scan cycle
    const SCAN_TIME = 4;
    this.activeMarkets = this.activeMarkets.map((market, idx) => {
      const countdown = Math.max(1, (idx % 3) + 2);
      const prediction = computePrediction(
        toolType,
        market.recentDigits,
        market.recentPrices,
        market.stats,
        this.selectedOverLevel,
        market.candlestickData1m,
        market.symbol,
        market.pipSize
      );
      return {
        ...market,
        scanState: 'SCANNING',
        scanProgress: Math.round(((SCAN_TIME - countdown) / SCAN_TIME) * 100),
        countdown,
        totalCycleTime: SCAN_TIME,
        signalStability: 'SEARCHING' as SignalStability,
        invalidationAlert: null,
        prediction,
      };
    });
    this.notifyListeners();
  }

  public setTradingWindowDuration(seconds: TradingWindowDuration) {
    this.tradingWindowDuration = seconds;
  }

  public getTradingWindowDuration(): TradingWindowDuration {
    return this.tradingWindowDuration;
  }

  public onTicks(listener: TicksListener): () => void {
    this.tickListeners.add(listener);
    listener(this.activeMarkets);
    return () => this.tickListeners.delete(listener);
  }

  public onConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => this.connectionListeners.delete(listener);
  }

  public onHistory(listener: HistoryListener): () => void {
    this.historyListeners.add(listener);
    listener([...this.historyLog]);
    return () => this.historyListeners.delete(listener);
  }

  public getHistory(): SignalHistoryItem[] {
    return [...this.historyLog];
  }

  public clearHistory(): void {
    this.historyLog = [];
    this.notifyHistory();
  }

  public getMarkets(): DerivMarketItem[] {
    return this.activeMarkets;
  }

  private addHistoryRecord(market: DerivMarketItem, status: 'ACTIVE' | 'EXPIRED' | 'INVALIDATED' | 'WAIT') {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newItem: SignalHistoryItem = {
      id: market.activeSignalId || `${market.symbol}-${now}`,
      time: timeStr,
      marketName: market.displayName,
      symbol: market.symbol,
      contractType: market.prediction.contractType || 'OVER / UNDER',
      prediction: market.prediction.primarySignal,
      recommendedTrade: market.prediction.recommendedTrade || market.prediction.primarySignal,
      confidence: market.prediction.confidence,
      status,
      durationSecs: 60, // Exactly 1-minute validity timer
      createdAt: now,
      expiresAt: now + 60 * 1000,
      invalidationReason: market.invalidationAlert?.message,
    };

    // Prepend so the newest signal always appears at the top of the signal list
    this.historyLog = [newItem, ...this.historyLog.filter((h) => h.id !== newItem.id).slice(0, 49)];
    this.notifyHistory();
  }

  private updateHistoryStatus(signalId: string, status: 'EXPIRED' | 'INVALIDATED', reason?: string) {
    let updated = false;
    this.historyLog = this.historyLog.map((item) => {
      if (item.id === signalId && item.status === 'ACTIVE') {
        updated = true;
        return {
          ...item,
          status,
          invalidationReason: reason || item.invalidationReason,
        };
      }
      return item;
    });

    if (updated) {
      this.notifyHistory();
    }
  }

  private notifyHistory() {
    this.historyListeners.forEach((listener) => listener([...this.historyLog]));
  }

  private connectWs() {
    try {
      const wsUrl = 'wss://ws.derivws.com/websockets/v3?app_id=1089';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyConnection();
        this.subscribeSymbol('1HZ10V');
        this.subscribeSymbol('1HZ100V');
        this.subscribeSymbol('R_100');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg_type === 'tick' && data.tick) {
            this.handleLiveTick(data.tick);
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.notifyConnection();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyConnection();
        setTimeout(() => this.connectWs(), 5000);
      };
    } catch (err) {
      this.isConnected = false;
      this.notifyConnection();
    }
  }

  private subscribeSymbol(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.subscribedSymbols.has(symbol)) {
      this.ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
      this.subscribedSymbols.add(symbol);
    }
  }

  private handleLiveTick(tick: { symbol: string; quote: number; pip_size?: number }) {
    const marketIndex = this.activeMarkets.findIndex((m) => m.symbol === tick.symbol);
    if (marketIndex === -1) return;

    const market = this.activeMarkets[marketIndex];
    const pipSize = tick.pip_size ?? market.pipSize;
    const newPrice = tick.quote;
    const newDigit = extractLastDigit(newPrice, pipSize);

    const updatedDigits = [...market.recentDigits.slice(-29), newDigit];
    const updatedPrices = [...market.recentPrices.slice(-29), newPrice];
    const stats = computeStats(updatedDigits, updatedPrices);

    let nextState = market.scanState;
    let nextStability = market.signalStability;
    let invAlert = market.invalidationAlert;

    // If signal is actively monitored, check for real-time market shifts
    if (market.scanState === 'SIGNAL_ACTIVE' || market.scanState === 'MARKET_CHANGING') {
      const health = evaluateSignalHealth(market.prediction, updatedDigits, updatedPrices, stats);
      if (health.isInvalidated) {
        nextState = 'SIGNAL_INVALIDATED';
        nextStability = 'INVALIDATED';
        invAlert = {
          previousSignal: market.prediction.primarySignal,
          message: health.reason,
          timestamp: Date.now(),
        };
        if (market.activeSignalId) {
          this.updateHistoryStatus(market.activeSignalId, 'INVALIDATED', health.reason);
        }
      } else if (health.status === 'MARKET_CHANGING') {
        nextState = 'MARKET_CHANGING';
        nextStability = 'WEAKENING';
      } else {
        nextState = 'SIGNAL_ACTIVE';
        nextStability = 'STABLE';
      }
    }

    let updatedCandles = market.candlestickData1m;
    if (updatedCandles && updatedCandles.length > 0) {
      const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };
      lastCandle.close = newPrice;
      if (newPrice > lastCandle.high) lastCandle.high = newPrice;
      if (newPrice < lastCandle.low) lastCandle.low = newPrice;
      lastCandle.volume = (lastCandle.volume || 10) + 1;
      updatedCandles = [...updatedCandles.slice(0, -1), lastCandle];
    }

    const updatedMarket: DerivMarketItem = {
      ...market,
      previousPrice: market.currentPrice,
      currentPrice: newPrice,
      priceDelta: newPrice - market.currentPrice,
      lastDigit: newDigit,
      recentDigits: updatedDigits,
      recentPrices: updatedPrices,
      stats,
      scanState: nextState,
      signalStability: nextStability,
      invalidationAlert: invAlert,
      candlestickData1m: updatedCandles,
      lastUpdated: Date.now(),
    };

    this.activeMarkets[marketIndex] = updatedMarket;
    this.notifyListeners();
  }

  private startSimulationAndTimerEngine() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.liveCycleInterval) clearInterval(this.liveCycleInterval);

    const SCAN_DURATION = 4; // 4 seconds of scanning & tick collection

    // 1-second interval for state machine and progress updates
    this.timerInterval = setInterval(() => {
      this.activeMarkets = this.activeMarkets.map((market) => {
        // STATE 1: SCANNING
        if (market.scanState === 'SCANNING' || market.scanState === 'ANALYZING') {
          const nextCountdown = market.countdown - 1;

          if (nextCountdown <= 0) {
            // Scan reached 100% -> Automatically analyze collected market data and generate prediction
            const prediction = computePrediction(
              this.currentTool,
              market.recentDigits,
              market.recentPrices,
              market.stats,
              this.selectedOverLevel,
              market.candlestickData1m,
              market.symbol,
              market.pipSize
            );

            const isEligible = prediction.isTradeReady && prediction.confidence >= 85;

            if (isEligible) {
              const now = Date.now();
              const signalId = `${market.symbol}-${now}`;
              const updatedItem: DerivMarketItem = {
                ...market,
                scanState: 'SIGNAL_ACTIVE',
                scanProgress: 100,
                countdown: 60, // Exact 1-minute validity timer as requested
                totalCycleTime: 60,
                signalGeneratedAt: now,
                signalStability: 'STABLE',
                activeSignalId: signalId,
                previousSignal: undefined,
                invalidationAlert: null,
                prediction,
              };

              this.addHistoryRecord(updatedItem, 'ACTIVE');
              return updatedItem;
            } else {
              // Low confidence setup -> Wait / Re-analyze
              return {
                ...market,
                scanState: 'WAIT',
                scanProgress: 100,
                countdown: 4,
                totalCycleTime: 4,
                signalStability: 'SEARCHING',
                invalidationAlert: null,
                prediction,
              };
            }
          }

          const scanProgress = Math.min(
            99,
            Math.round(((SCAN_DURATION - nextCountdown) / SCAN_DURATION) * 100)
          );

          return {
            ...market,
            scanState: scanProgress > 75 ? 'ANALYZING' : 'SCANNING',
            scanProgress,
            countdown: nextCountdown,
            totalCycleTime: SCAN_DURATION,
            signalStability: 'SEARCHING',
          };
        }

        // STATE 2: SIGNAL_ACTIVE / MARKET_CHANGING (40–60s trading window)
        if (market.scanState === 'SIGNAL_ACTIVE' || market.scanState === 'MARKET_CHANGING') {
          const nextCountdown = market.countdown - 1;

          // Check live market health
          const health = evaluateSignalHealth(
            market.prediction,
            market.recentDigits,
            market.recentPrices,
            market.stats
          );

          // If market conditions changed significantly: INVALIDATE
          if (health.isInvalidated) {
            if (market.activeSignalId) {
              this.updateHistoryStatus(market.activeSignalId, 'INVALIDATED', health.reason);
            }

            return {
              ...market,
              scanState: 'SIGNAL_INVALIDATED',
              signalStability: 'INVALIDATED',
              previousSignal: market.prediction.primarySignal,
              invalidationAlert: {
                previousSignal: market.prediction.primarySignal,
                message: health.reason,
                timestamp: Date.now(),
              },
              countdown: 2, // Display warning alert for 2s then auto re-scan
              totalCycleTime: 2,
            };
          }

          // If countdown finished: EXPIRED
          if (nextCountdown <= 0) {
            if (market.activeSignalId) {
              this.updateHistoryStatus(market.activeSignalId, 'EXPIRED');
            }

            // Immediately restart fresh market scan
            return {
              ...market,
              scanState: 'SCANNING',
              scanProgress: 0,
              countdown: SCAN_DURATION,
              totalCycleTime: SCAN_DURATION,
              signalStability: 'SEARCHING',
              invalidationAlert: null,
              activeSignalId: undefined,
              signalGeneratedAt: undefined,
            };
          }

          // Live status update: stable vs weakening
          const isWeakening = health.status === 'MARKET_CHANGING';
          return {
            ...market,
            scanState: isWeakening ? 'MARKET_CHANGING' : 'SIGNAL_ACTIVE',
            signalStability: isWeakening ? 'WEAKENING' : 'STABLE',
            prediction: {
              ...market.prediction,
              signalStrength: isWeakening ? 'MODERATE' : 'STRONG',
            },
            countdown: nextCountdown,
          };
        }

        // STATE 3: SIGNAL_INVALIDATED (alert banner active -> automatic re-scan)
        if (market.scanState === 'SIGNAL_INVALIDATED') {
          const nextCountdown = market.countdown - 1;
          if (nextCountdown <= 0) {
            // Re-analyzing market now
            return {
              ...market,
              scanState: 'SCANNING',
              scanProgress: 0,
              countdown: SCAN_DURATION,
              totalCycleTime: SCAN_DURATION,
              signalStability: 'SEARCHING',
              invalidationAlert: null,
            };
          }
          return {
            ...market,
            countdown: nextCountdown,
          };
        }

        // STATE 4: WAIT / NO VALID SIGNAL (<85% confidence)
        if (market.scanState === 'WAIT') {
          const nextCountdown = market.countdown - 1;
          if (nextCountdown <= 0) {
            return {
              ...market,
              scanState: 'SCANNING',
              scanProgress: 0,
              countdown: SCAN_DURATION,
              totalCycleTime: SCAN_DURATION,
              signalStability: 'SEARCHING',
            };
          }
          return {
            ...market,
            countdown: nextCountdown,
          };
        }

        return market;
      });

      // Automatically expire any active signals in historyLog after 1 minute (60,000ms)
      const now = Date.now();
      let historyExpired = false;
      this.historyLog = this.historyLog.map((item) => {
        if (item.status === 'ACTIVE' && item.expiresAt && now >= item.expiresAt) {
          historyExpired = true;
          return {
            ...item,
            status: 'EXPIRED' as const,
          };
        }
        return item;
      });
      if (historyExpired) {
        this.notifyHistory();
      }

      this.notifyListeners();
    }, 1000);

    // Live continuous tick generator for all synthetic indices to keep every market pulsing in real time
    this.liveCycleInterval = setInterval(() => {
      const updateCount = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < updateCount; i++) {
        const randIdx = Math.floor(Math.random() * this.activeMarkets.length);
        const market = this.activeMarkets[randIdx];
        if (!market) continue;

        // Generate next tick price
        const step = (Math.random() - 0.49) * Math.pow(10, -(market.pipSize - 1));
        const newPrice = Number((market.currentPrice + step).toFixed(market.pipSize));
        const newDigit = extractLastDigit(newPrice, market.pipSize);

        const updatedDigits = [...market.recentDigits.slice(-39), newDigit];
        const updatedPrices = [...market.recentPrices.slice(-39), newPrice];
        const stats = computeStats(updatedDigits, updatedPrices);

        let nextState = market.scanState;
        let nextStability = market.signalStability;
        let invAlert = market.invalidationAlert;

        if (market.scanState === 'SIGNAL_ACTIVE' || market.scanState === 'MARKET_CHANGING') {
          const health = evaluateSignalHealth(market.prediction, updatedDigits, updatedPrices, stats);
          if (health.isInvalidated) {
            nextState = 'SIGNAL_INVALIDATED';
            nextStability = 'INVALIDATED';
            invAlert = {
              previousSignal: market.prediction.primarySignal,
              message: health.reason,
              timestamp: Date.now(),
            };
            if (market.activeSignalId) {
              this.updateHistoryStatus(market.activeSignalId, 'INVALIDATED', health.reason);
            }
          } else if (health.status === 'MARKET_CHANGING') {
            nextState = 'MARKET_CHANGING';
            nextStability = 'WEAKENING';
          }
        }

        let updatedCandles = market.candlestickData1m;
        if (updatedCandles && updatedCandles.length > 0) {
          const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };
          lastCandle.close = newPrice;
          if (newPrice > lastCandle.high) lastCandle.high = newPrice;
          if (newPrice < lastCandle.low) lastCandle.low = newPrice;
          lastCandle.volume = (lastCandle.volume || 10) + 1;
          updatedCandles = [...updatedCandles.slice(0, -1), lastCandle];
        }

        this.activeMarkets[randIdx] = {
          ...market,
          previousPrice: market.currentPrice,
          currentPrice: newPrice,
          priceDelta: newPrice - market.currentPrice,
          lastDigit: newDigit,
          recentDigits: updatedDigits,
          recentPrices: updatedPrices,
          stats,
          scanState: nextState,
          signalStability: nextStability,
          invalidationAlert: invAlert,
          candlestickData1m: updatedCandles,
          lastUpdated: Date.now(),
        };
      }

      this.notifyListeners();
    }, 600);
  }

  private notifyListeners() {
    this.tickListeners.forEach((listener) => listener([...this.activeMarkets]));
    // Continuously analyse markets restricted to the currently open tool
    marketSignalAlertService.analyzeAllMarkets(this.activeMarkets, this.currentTool, this.selectedOverLevel);
  }

  private notifyConnection() {
    this.connectionListeners.forEach((listener) => listener(this.isConnected));
  }

  public destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.liveCycleInterval) clearInterval(this.liveCycleInterval);
    if (this.ws) this.ws.close();
  }
}

export const derivWs = new DerivWsService();
