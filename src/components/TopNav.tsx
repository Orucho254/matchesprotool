import React from 'react';
import { ToolType, TradingWindowDuration, User } from '../types';
import {
  Volume2,
  VolumeX,
  Activity,
  RefreshCw,
  Layers,
  History,
  Timer,
  Zap,
  LogOut,
  Globe,
  UserCheck,
  Binary,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface TopNavProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefreshAll: () => void;
  marketCount: number;
  activeSignalsCount: number;
  tradingWindow: TradingWindowDuration;
  onChangeTradingWindow: (val: TradingWindowDuration) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  historyCount: number;
  currentUser?: User | null;
  onLogout?: () => void;
  onViewLanding?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTool,
  onSelectTool,
  isConnected,
  soundEnabled,
  onToggleSound,
  onRefreshAll,
  marketCount,
  activeSignalsCount,
  tradingWindow,
  onChangeTradingWindow,
  showHistory,
  onToggleHistory,
  historyCount,
  currentUser,
  onLogout,
  onViewLanding,
}) => {
  // Market categories arranged horizontally in exact user order: Even/Odd, Over/Under, Matches/Differs, Rise/Fall
  const navItems: { type: ToolType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'EVEN_ODD', label: 'Even / Odd', icon: Binary },
    { type: 'OVER_UNDER', label: 'Over / Under', icon: ArrowUpDown },
    { type: 'MATCHES', label: 'Matches / Differs', icon: Sparkles },
    { type: 'RISE_FALL', label: 'Rise / Fall', icon: TrendingUp },
    { type: 'SCANNER', label: 'All Markets Scanner', icon: Layers },
  ];

  const windowOptions: TradingWindowDuration[] = [40, 45, 50, 55, 60];

  return (
    <header className="bg-[#0b101b] border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Nav Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const isActive = currentTool === item.type;
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectTool(item.type)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#4ade80] text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold scale-[1.02]'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Trading Window Selector + Signal Monitoring Stats + Quick toggles */}
        <div className="flex items-center flex-wrap lg:flex-nowrap justify-between lg:justify-end gap-2.5 text-xs">
          {/* Trading Window Duration Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
              <Timer className="w-3.5 h-3.5 text-pink-400" />
              <span>Window:</span>
            </div>
            <div className="flex items-center gap-1">
              {windowOptions.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChangeTradingWindow(sec)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    tradingWindow === sec
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Active Signals Count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[11px] font-mono font-bold">
              {activeSignalsCount} Active Signals
            </span>
          </div>

          {/* Signal History Toggle Button */}
          <button
            type="button"
            onClick={onToggleHistory}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-mono text-[11px] font-bold ${
              showHistory
                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-950 border border-purple-700/60 text-[9px] text-purple-200">
                {historyCount}
              </span>
            )}
          </button>

          {/* Deriv WS Connection Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-slate-300 font-mono text-[11px] font-semibold">
              {isConnected ? 'Deriv WS' : 'Syncing'}
            </span>
          </div>

          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-purple-950/60 border-purple-800 text-purple-300 hover:bg-purple-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Ticks */}
          <button
            type="button"
            onClick={onRefreshAll}
            title="Force refresh predictions"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-slate-800 my-auto" />

          {/* Landing Page Quick Link */}
          {onViewLanding && (
            <button
              type="button"
              onClick={onViewLanding}
              title="View Public Landing Page"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer font-mono text-[11px]"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Landing Page</span>
            </button>
          )}

          {/* User Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 font-mono text-[10px]" title="Cryptographic Session: PBKDF2-SHA256 authenticated">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="hidden lg:inline">256-Bit Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/80 text-purple-200 font-mono text-[11px]">
                <UserCheck className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-bold max-w-[90px] truncate">{currentUser.username}</span>
                <span className="hidden sm:inline px-1 py-0.2 rounded text-[9px] bg-purple-900 text-purple-300">
                  {currentUser.role === 'PRO_TRADER' ? 'PRO' : 'TRADER'}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Log out and return to landing portal"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/80 text-rose-300 hover:text-white transition-colors cursor-pointer font-mono text-[11px] font-bold"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
