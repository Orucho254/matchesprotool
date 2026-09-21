import React from 'react';
import { DerivMarketItem, ToolType } from '../types';
import { Zap, ShieldCheck, TrendingUp, TrendingDown, ArrowUpRight, Award, Flame, CheckCircle2, AlertCircle } from 'lucide-react';
import { calculateDigitPredictionSignal } from '../utils/signalCalculator';
import { SignalEntryCard } from './SignalEntryCard';

interface LiveScannerProps {
  markets: DerivMarketItem[];
  onOpenModal: (market: DerivMarketItem) => void;
  onSwitchTool: (tool: ToolType) => void;
}

export const LiveScanner: React.FC<LiveScannerProps> = ({
  markets,
  onOpenModal,
  onSwitchTool,
}) => {
  // Sort markets by confidence descending (≥ 85% at top)
  const sortedMarkets = [...markets].sort((a, b) => b.prediction.confidence - a.prediction.confidence);
  const tradeReadyMarkets = sortedMarkets.filter((m) => m.prediction.confidence >= 85);
  const topPicks = sortedMarkets.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 85% Rule Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c0e35] via-[#15092a] to-[#0e051d] border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>85%+ High-Probability Execution Filter Active</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-black">
                {tradeReadyMarkets.length} TRADE READY
              </span>
            </h4>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Only markets with computed statistical confidence of 85% and above are signaled for live trade entry.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 Strongest Signals Matrix */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200">
            Top Ranked High-Confidence Opportunities (≥85%)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topPicks.map((m, rank) => {
            const isTradeReady = m.prediction.confidence >= 85;
            const digitSignal = calculateDigitPredictionSignal(m);
            return (
              <div
                key={m.symbol}
                onClick={() => onOpenModal(m)}
                className={`relative overflow-hidden bg-gradient-to-b from-[#1e1338] via-[#160c2b] to-[#100720] border rounded-2xl p-4 shadow-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] space-y-3 ${
                  isTradeReady
                    ? 'border-emerald-500/60 shadow-emerald-950/20 hover:border-emerald-400'
                    : 'border-purple-900/50 hover:border-purple-500/60 shadow-[0_8px_24px_-6px_rgba(147,51,234,0.25)]'
                }`}
              >
                {/* Luminous Purple Underglow Bar directly under each template */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-fuchsia-400 to-indigo-500 transition-all shadow-[0_2px_10px_rgba(168,85,247,0.6)]" />
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                      m.scanState === 'SCANNING'
                        ? 'bg-pink-950/90 text-pink-300 border-pink-700'
                        : isTradeReady
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-purple-950/90 text-purple-300 border-purple-700'
                    }`}
                  >
                    {m.scanState === 'SCANNING' ? 'SCANNING' : isTradeReady ? 'TRADE READY' : 'HOLD'} &bull; RANK #{rank + 1}
                  </span>
                  <span className="text-xs font-bold text-pink-400 font-mono">
                    {m.countdown}s
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-[#f472b6] tracking-tight truncate">
                    {m.displayName}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {m.currentPrice.toFixed(m.pipSize)} &bull; Digit: <strong className="text-purple-300">{m.lastDigit}</strong>
                  </span>
                </div>

                {m.scanState === 'SCANNING' ? (
                  <div className="p-2.5 rounded-xl border border-pink-500/30 bg-[#160a29] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                      <span className="text-xs font-bold text-pink-300 font-mono">
                        Scanning market…
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-pink-400">
                      {m.scanProgress}%
                    </span>
                  </div>
                ) : (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isTradeReady
                        ? 'bg-emerald-950/30 border-emerald-800/70'
                        : 'bg-[#120822] border-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${isTradeReady ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-xs font-black text-slate-100 font-mono">
                        {m.prediction.primarySignal}
                      </span>
                    </div>
                    <span className={`text-xs font-black font-mono ${isTradeReady ? 'text-emerald-300' : 'text-slate-300'}`}>
                      {m.prediction.confidence}%
                    </span>
                  </div>
                )}

                {/* Algorithmic Digit Prediction parameters */}
                {m.scanState === 'SCANNING' ? (
                  <div className="p-2 rounded-lg bg-[#120822] border border-purple-900/50 text-[10px] font-mono text-purple-300/80 flex items-center justify-between">
                    <span>Evaluating tick probabilities…</span>
                    <span className="text-pink-400 font-bold">{m.scanProgress}%</span>
                  </div>
                ) : (
                  <SignalEntryCard signal={digitSignal} compact marketName={m.displayName} />
                )}

                <div className="text-[11px] text-slate-400 line-clamp-1">
                  {m.scanState === 'SCANNING' ? 'Collecting live tick tape and analyzing probability distributions…' : m.prediction.reasoning}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Scanner Table */}
      <div className="bg-gradient-to-b from-[#180f2d] to-[#100820] border border-purple-900/50 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-bold text-slate-100">Live Multi-Market Scanner Matrix</h3>
          </div>
          <span className="text-xs text-purple-300/70">
            Real-time scanner across all <strong className="text-slate-200">{markets.length}</strong> markets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e071c] text-purple-200/70 font-bold border-b border-purple-900/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Market</th>
                <th className="py-3 px-3">Live Quote</th>
                <th className="py-3 px-3">Last Digit</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-3">Recommended Digit Bet</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Next Refresh</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30 font-medium">
              {sortedMarkets.map((m) => {
                const isTradeReady = m.prediction.confidence >= 85;
                const digitSignal = calculateDigitPredictionSignal(m);
                return (
                  <tr
                    key={m.symbol}
                    onClick={() => onOpenModal(m)}
                    className="hover:bg-purple-950/40 transition-colors cursor-pointer text-slate-300"
                  >
                    <td className="py-2.5 px-3 font-bold text-[#f472b6]">
                      {m.displayName}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                      {m.currentPrice.toFixed(m.pipSize)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex w-6 h-6 rounded-md items-center justify-center font-mono font-bold text-xs ${
                          m.lastDigit > 4 ? 'bg-purple-950 text-purple-300 border border-purple-800/60' : 'bg-purple-900/50 text-teal-300 border border-purple-800/40'
                        }`}
                      >
                        {m.lastDigit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                      {m.scanState === 'SCANNING' || m.scanState === 'ANALYZING' ? (
                        <span className="text-pink-400 text-xs flex items-center gap-1 font-semibold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                          Scanning… ({m.scanProgress}%)
                        </span>
                      ) : m.scanState === 'SIGNAL_INVALIDATED' ? (
                        <span className="text-rose-400 text-xs flex items-center gap-1 font-bold">
                          ⚠ Invalidated
                        </span>
                      ) : (
                        <span>{m.prediction.primarySignal}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {m.scanState === 'SCANNING' || m.scanState === 'ANALYZING' ? (
                        <span className="text-purple-400/80 text-[10px]">
                          Analyzing tick matrix…
                        </span>
                      ) : m.scanState === 'SIGNAL_INVALIDATED' ? (
                        <span className="text-rose-300/80 text-[10px] italic">
                          Market changed &bull; Re-analyzing
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              isTradeReady
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                            }`}
                          >
                            {digitSignal.tradeInstruction}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            R:R {digitSignal.riskRewardRatio} &bull; {digitSignal.payoutEst}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {m.scanState === 'SCANNING' || m.scanState === 'ANALYZING' ? (
                        <span className="text-pink-400 text-xs">{m.scanProgress}%</span>
                      ) : (
                        <span className={isTradeReady ? 'text-emerald-400' : 'text-slate-400'}>
                          {m.prediction.confidence}%
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {m.scanState === 'SIGNAL_INVALIDATED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-600/60">
                          INVALID
                        </span>
                      ) : m.scanState === 'MARKET_CHANGING' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-600/60">
                          CHANGING
                        </span>
                      ) : m.scanState === 'SIGNAL_ACTIVE' && isTradeReady ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          SIGNAL ACTIVE
                        </span>
                      ) : m.scanState === 'SCANNING' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-950/70 text-pink-300 border border-pink-700/50">
                          SCANNING
                        </span>
                      ) : isTradeReady ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          TRADE (≥85%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950/70 text-purple-300/80 border border-purple-900/60">
                          WAIT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-pink-400 font-bold">
                      {m.countdown}s
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors cursor-pointer ${
                          isTradeReady
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {isTradeReady ? 'Trade Now' : 'Analyze'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

