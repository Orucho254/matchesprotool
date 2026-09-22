import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DerivMarketItem } from '../types';
import { extractLastDigit } from '../data/markets';
import {
  Terminal,
  Activity,
  CheckCircle2,
  Zap,
  RotateCw,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  X,
  ExternalLink,
  Layers,
  Cpu,
} from 'lucide-react';
import { soundService } from '../utils/audio';

export interface ScannedMarketResult {
  symbol: string;
  displayName: string;
  currentPrice: number;
  pipSize: number;
  ticksAnalyzed: number;
  matchDigit: number;
  matchPercent: number;
  differDigit: number;
  differPercent: number;
  confidence: number;
  recommendation: 'MATCH' | 'DIFFER' | 'WAIT';
  isTradeReady: boolean;
}

interface DeepAnalysisMarketScannerProps {
  selectedMarket: DerivMarketItem;
  allVolatilityMarkets: DerivMarketItem[];
  isDerivLive: boolean;
  onSelectMarket: (symbol: string) => void;
  onClose: () => void;
  autoStart?: boolean;
}

export const DeepAnalysisMarketScanner: React.FC<DeepAnalysisMarketScannerProps> = ({
  selectedMarket,
  allVolatilityMarkets,
  isDerivLive,
  onSelectMarket,
  onClose,
  autoStart = true,
}) => {
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'COMPLETE'>('IDLE');
  const [currentScanningIndex, setCurrentScanningIndex] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [scannedResults, setScannedResults] = useState<ScannedMarketResult[]>([]);
  const [selectedResultSymbol, setSelectedResultSymbol] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const abortControllerRef = useRef<boolean>(false);

  // Filter only volatility markets
  const marketsToScan = useMemo(() => {
    const list = allVolatilityMarkets.filter(
      (m) =>
        m.category === 'VOLATILITY_1S' ||
        m.category === 'VOLATILITY_CONTINUOUS' ||
        m.symbol.startsWith('1HZ') ||
        m.symbol.startsWith('R_')
    );
    return list.length > 0 ? list : allVolatilityMarkets;
  }, [allVolatilityMarkets]);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Compute real market statistics from ticks
  const computeMarketStats = (market: DerivMarketItem): ScannedMarketResult => {
    let digits = market.recentDigits || [];

    // If digits array is empty, extract from recent prices if available
    if (digits.length === 0 && market.recentPrices && market.recentPrices.length > 0) {
      digits = market.recentPrices.map((p) => extractLastDigit(p, market.pipSize));
    }

    const totalTicks = digits.length;
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    digits.forEach((d) => {
      if (typeof d === 'number' && d >= 0 && d <= 9) counts[d] = (counts[d] || 0) + 1;
    });

    if (totalTicks === 0) {
      return {
        symbol: market.symbol,
        displayName: market.displayName,
        currentPrice: market.currentPrice,
        pipSize: market.pipSize,
        ticksAnalyzed: 0,
        matchDigit: 0,
        matchPercent: 0,
        differDigit: 0,
        differPercent: 0,
        confidence: 0,
        recommendation: 'WAIT',
        isTradeReady: false,
      };
    }

    // Find real highest frequency digit (Match Digit)
    let bestMatchDigit = 0;
    let maxCount = -1;
    for (let d = 0; d <= 9; d++) {
      if (counts[d] > maxCount) {
        maxCount = counts[d];
        bestMatchDigit = d;
      }
    }

    // Find real lowest frequency digit (Differ Digit)
    let bestDifferDigit = 0;
    let minCount = Infinity;
    for (let d = 0; d <= 9; d++) {
      if (counts[d] < minCount) {
        minCount = counts[d];
        bestDifferDigit = d;
      }
    }

    const matchPercent = Number(((maxCount / totalTicks) * 100).toFixed(2));
    const differPercent = Number((((totalTicks - minCount) / totalTicks) * 100).toFixed(2));

    const isTradeReady = differPercent >= 88 || matchPercent >= 18;
    const recommendation = differPercent >= 88 ? 'DIFFER' : 'MATCH';
    const confidence = recommendation === 'DIFFER' ? differPercent : matchPercent;

    return {
      symbol: market.symbol,
      displayName: market.displayName,
      currentPrice: market.currentPrice,
      pipSize: market.pipSize,
      ticksAnalyzed: totalTicks,
      matchDigit: bestMatchDigit,
      matchPercent,
      differDigit: bestDifferDigit,
      differPercent,
      confidence,
      recommendation,
      isTradeReady,
    };
  };

  // Run full terminal scanner sequence
  const startScanningProcess = async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    abortControllerRef.current = false;
    setScanStatus('SCANNING');
    setCurrentScanningIndex(0);
    setScannedResults([]);

    const logs: string[] = [];
    let stepNumber = 1;

    const addLog = (msg: string) => {
      const stepStr = stepNumber < 10 ? `0${stepNumber}` : `${stepNumber}`;
      const line = `${stepStr} > ${msg}`;
      stepNumber++;
      logs.push(line);
      setTerminalLogs([...logs]);
    };

    soundService.playSignalAlert();
    addLog('Connecting to Deriv market stream...');
    await new Promise((r) => setTimeout(r, 220));

    if (abortControllerRef.current) return;
    addLog(`Quantum scanner initialized. Total Volatility Indices: ${marketsToScan.length}`);
    await new Promise((r) => setTimeout(r, 200));

    const results: ScannedMarketResult[] = [];

    // Scan each volatility market sequentially
    for (let i = 0; i < marketsToScan.length; i++) {
      if (abortControllerRef.current) break;
      const market = marketsToScan[i];
      setCurrentScanningIndex(i);

      addLog(`Locked on ${market.displayName} (${market.symbol})`);
      await new Promise((r) => setTimeout(r, 160));

      if (abortControllerRef.current) break;
      const stats = computeMarketStats(market);
      results.push(stats);
      setScannedResults([...results]);

      addLog(`Sampling recent ticks (${stats.ticksAnalyzed} ticks)...`);
      await new Promise((r) => setTimeout(r, 140));

      if (abortControllerRef.current) break;
      addLog('Calculating digit frequencies & probabilities...');
      await new Promise((r) => setTimeout(r, 140));

      if (abortControllerRef.current) break;
      addLog(`MATCH DIGIT: ${stats.matchDigit} — ${stats.matchPercent}%`);
      addLog(`DIFFERS: ${stats.differPercent}% (Digit ${stats.differDigit})`);

      if (i < marketsToScan.length - 1) {
        addLog('Moving to next volatility...');
        await new Promise((r) => setTimeout(r, 180));
      }
    }

    if (!abortControllerRef.current) {
      addLog('All volatility indices scanned successfully.');
      addLog('SCAN COMPLETE.');
      setScanStatus('COMPLETE');
      soundService.playSignalAlert();
    }

    isScanningRef.current = false;
  };

  // Start scanning on mount if autoStart is true
  useEffect(() => {
    if (autoStart) {
      startScanningProcess();
    }
    return () => {
      abortControllerRef.current = true;
      isScanningRef.current = false;
    };
  }, []);

  const progressPercent = Math.round(
    ((currentScanningIndex + (scanStatus === 'COMPLETE' ? 1 : 0)) / Math.max(1, marketsToScan.length)) * 100
  );

  return (
    <div className="w-full rounded-2xl bg-[#060a14] border border-cyan-500/40 p-4 sm:p-5 shadow-2xl shadow-cyan-950/30 text-left font-sans animate-in fade-in zoom-in-95 duration-200 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/60">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black font-mono tracking-tight text-white flex items-center gap-2">
                <span>QUANTUM // DEEP SCANNER</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border uppercase tracking-wider ${
                  isDerivLive
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                    : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                }`}
              >
                {isDerivLive ? 'DERIV LIVE STREAM' : 'CONNECTING TO DERIV'}
              </span>
            </div>
            <p className="text-xs text-cyan-300/70 font-mono">
              Real-time multi-market digit scanner for Matches & Differs
            </p>
          </div>
        </div>

        {/* Action Controls: Status, Rescan & Close */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={startScanningProcess}
            disabled={scanStatus === 'SCANNING'}
            className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${scanStatus === 'SCANNING' ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{scanStatus === 'SCANNING' ? 'SCANNING...' : 'RE-SCAN ALL'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Dismiss scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Metadata Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-[#090f1d] border border-cyan-950 rounded-xl p-3 text-slate-300">
        <div>
          <span className="text-cyan-400 font-bold uppercase block text-[10px]">Active Focus Market:</span>
          <span className="font-bold text-white truncate block">{selectedMarket.displayName}</span>
        </div>
        <div>
          <span className="text-cyan-400 font-bold uppercase block text-[10px]">Execution Strategy:</span>
          <span className="font-bold text-emerald-400">Matches & Differs</span>
        </div>
        <div>
          <span className="text-cyan-400 font-bold uppercase block text-[10px]">Scanner Status:</span>
          <span
            className={`font-black flex items-center gap-1.5 ${
              scanStatus === 'SCANNING'
                ? 'text-cyan-400'
                : scanStatus === 'COMPLETE'
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {scanStatus === 'SCANNING' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
            {scanStatus === 'COMPLETE' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {scanStatus === 'SCANNING' ? 'STATUS: SCANNING' : scanStatus === 'COMPLETE' ? 'SCAN COMPLETE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Terminal Console View */}
      <div className="relative rounded-xl bg-[#03060d] border border-cyan-900/60 p-3.5 shadow-inner overflow-hidden font-mono text-xs text-cyan-300">
        {/* Subtle scanline effect */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />

        <div className="h-44 sm:h-52 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-cyan-900/60 pr-1">
          {terminalLogs.length === 0 ? (
            <div className="text-slate-500 italic py-2">Initializing terminal connection...</div>
          ) : (
            terminalLogs.map((log, idx) => {
              const isMatch = log.includes('MATCH DIGIT:');
              const isDiffer = log.includes('DIFFERS:');
              const isComplete = log.includes('SCAN COMPLETE');
              const isLocked = log.includes('Locked on');

              return (
                <div
                  key={idx}
                  className={`leading-relaxed transition-colors ${
                    isComplete
                      ? 'text-emerald-300 font-black bg-emerald-950/40 px-2 py-0.5 rounded'
                      : isMatch
                      ? 'text-amber-300 font-bold'
                      : isDiffer
                      ? 'text-emerald-400 font-bold'
                      : isLocked
                      ? 'text-cyan-200'
                      : 'text-cyan-400/90'
                  }`}
                >
                  {log}
                </div>
              );
            })
          )}

          {/* Animated cursor while scanning */}
          {scanStatus === 'SCANNING' && (
            <div className="flex items-center gap-1 text-cyan-400 pt-1">
              <span className="w-2 h-3.5 bg-cyan-400 animate-pulse inline-block" />
              <span className="text-[11px] text-cyan-500">Processing Deriv tick stream...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Live Progress Bar */}
        <div className="mt-3 pt-2.5 border-t border-cyan-950 flex items-center gap-3">
          <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-bold shrink-0">
            {progressPercent}% COMPLETE
          </span>
        </div>
      </div>

      {/* Scanned Markets Results Grid */}
      {scannedResults.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scanned Volatility Indices Results ({scannedResults.length} / {marketsToScan.length})</span>
            </span>
            <span className="text-[11px] text-cyan-400/70">
              Click any market to analyze & switch chart
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {scannedResults.map((result) => {
              const isSelected = selectedMarket.symbol === result.symbol;

              return (
                <div
                  key={result.symbol}
                  onClick={() => {
                    setSelectedResultSymbol(result.symbol);
                    onSelectMarket(result.symbol);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-2 relative overflow-hidden group ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                      : 'bg-[#090f1e] hover:bg-[#0d1629] border-slate-800 hover:border-cyan-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div>
                      <div className="font-bold text-xs text-white font-mono truncate">
                        {result.displayName}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400/80">
                        {result.symbol} &bull; {result.ticksAnalyzed} Ticks
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-0.5 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors"
                    >
                      <span>Analyze</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Digit Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 font-mono text-xs">
                    {/* Match Metric */}
                    <div className="bg-[#060a14] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Match Digit:</div>
                      <div className="flex items-center justify-between font-black text-amber-300">
                        <span className="text-sm">{result.matchDigit}</span>
                        <span className="text-[11px]">{result.matchPercent}%</span>
                      </div>
                    </div>

                    {/* Differ Metric */}
                    <div className="bg-[#060a14] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Differs Setup:</div>
                      <div className="flex items-center justify-between font-black text-emerald-400">
                        <span className="text-sm">≠{result.differDigit}</span>
                        <span className="text-[11px]">{result.differPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
