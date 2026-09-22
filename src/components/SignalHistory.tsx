import React, { useState } from 'react';
import { SignalHistoryItem } from '../types';
import {
  History,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  Trash2,
  Filter,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

interface SignalHistoryProps {
  history: SignalHistoryItem[];
  onClearHistory: () => void;
  className?: string;
}

export const SignalHistory: React.FC<SignalHistoryProps> = ({
  history,
  onClearHistory,
  className = '',
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INVALIDATED' | 'EXPIRED'>('ALL');
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Automatically prioritize valid active signals at the top, with newest signals shown first
  const filteredItems = history
    .filter((item) => {
      if (filter === 'ALL') return true;
      return item.status === filter;
    })
    .sort((a, b) => {
      const aActive = a.status === 'ACTIVE' ? 1 : 0;
      const bActive = b.status === 'ACTIVE' ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive; // Valid ACTIVE signals prioritized at the top
      }
      return (b.createdAt || 0) - (a.createdAt || 0); // Newest signals first
    });

  const activeCount = history.filter((i) => i.status === 'ACTIVE').length;
  const invalidatedCount = history.filter((i) => i.status === 'INVALIDATED').length;
  const expiredCount = history.filter((i) => i.status === 'EXPIRED').length;

  return (
    <div
      className={`bg-[#0d071c] border border-purple-900/50 rounded-2xl p-5 shadow-xl transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-purple-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 font-sans">
                Live Signal Monitoring &amp; Prediction History
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                {history.length} logged
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time audit log of active, completed, and invalidated market predictions
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1 bg-[#150a29] p-1 rounded-lg border border-purple-900/60 text-xs">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ACTIVE')}
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                filter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('INVALIDATED')}
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                filter === 'INVALIDATED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              Invalidated ({invalidatedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('EXPIRED')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                filter === 'EXPIRED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>

          {/* Clear history */}
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear signal history"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono">
            {history.length === 0
              ? 'Monitoring live markets. Signals will populate as scanning analysis completes (40–60s trading window)...'
              : 'No signals match the selected filter.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-purple-900/50 text-slate-400 text-[11px] uppercase tracking-wider bg-[#140929]/50">
                <th className="py-2.5 px-3 font-bold">TIME</th>
                <th className="py-2.5 px-3 font-bold">MARKET</th>
                <th className="py-2.5 px-3 font-bold">CONTRACT</th>
                <th className="py-2.5 px-3 font-bold">PREDICTION / TRADE</th>
                <th className="py-2.5 px-3 font-bold">CONFIDENCE</th>
                <th className="py-2.5 px-3 font-bold">STATUS</th>
                <th className="py-2.5 px-3 font-bold">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30">
              {filteredItems.map((item) => {
                const isActive = item.status === 'ACTIVE';
                const isInvalid = item.status === 'INVALIDATED';
                const isExpired = item.status === 'EXPIRED';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-purple-950/30 ${
                      isActive ? 'bg-emerald-950/15' : isInvalid ? 'bg-rose-950/15' : ''
                    }`}
                  >
                    {/* Time */}
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {item.time}
                    </td>

                    {/* Market */}
                    <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                      {item.marketName}
                    </td>

                    {/* Contract */}
                    <td className="py-2.5 px-3 text-purple-300 text-[11px] whitespace-nowrap">
                      {item.contractType}
                    </td>

                    {/* Prediction / Trade */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        isActive
                          ? 'bg-emerald-950 border border-emerald-500/50 text-[#00f59b]'
                          : isInvalid
                          ? 'bg-rose-950 border border-rose-500/50 text-rose-300 line-through'
                          : 'bg-purple-950 border border-purple-800/60 text-purple-200'
                      }`}>
                        {item.recommendedTrade || item.prediction}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`font-bold ${
                        item.confidence >= 85 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {item.confidence}%
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/60 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          ACTIVE ({item.expiresAt ? `${Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000))}s left` : `${item.durationSecs}s`})
                        </span>
                      )}
                      {isInvalid && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-500/60 shadow-xs">
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          INVALIDATED
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-700">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          EXPIRED
                        </span>
                      )}
                    </td>

                    {/* Note / Invalidation Reason */}
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs truncate">
                      {isInvalid && item.invalidationReason ? (
                        <span className="text-rose-300/90 font-sans italic flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                          {item.invalidationReason}
                        </span>
                      ) : isActive ? (
                        <span className="text-emerald-400/80 font-sans">
                          Active trading window in progress
                        </span>
                      ) : (
                        <span className="text-slate-500 font-sans">
                          Window ended &bull; Auto re-scanned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
