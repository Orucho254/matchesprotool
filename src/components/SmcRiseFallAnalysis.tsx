import React from 'react';
import { SmcRiseFallStrategyAnalysis, SupplyDemandZone, BOSPoint } from '../types';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Target,
  Send,
  ExternalLink,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';

interface SmcRiseFallAnalysisProps {
  analysis?: SmcRiseFallStrategyAnalysis;
  compact?: boolean;
  pipSize?: number;
}

export const SmcRiseFallAnalysis: React.FC<SmcRiseFallAnalysisProps> = ({
  analysis,
  compact = false,
  pipSize = 2,
}) => {
  if (!analysis) return null;

  const {
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
    authorCredit,
  } = analysis;

  // COMPACT VIEW (For MarketCard)
  if (compact) {
    return (
      <div className="p-2.5 rounded-xl bg-gradient-to-b from-[#160a28] to-[#0d051c] border border-purple-800/60 shadow-md space-y-2 font-mono text-xs">
        {/* Header with BABYOIL SPEEDBOT badge & Telegram */}
        <div className="flex items-center justify-between gap-1.5 border-b border-purple-900/50 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-pink-600 text-white font-extrabold text-[9px] tracking-wider uppercase flex items-center gap-1">
              <Target className="w-2.5 h-2.5" />
              BABYOIL SPEEDBOT
            </span>
            <a
              href="https://t.me/D_X"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-cyan-300 font-bold hover:underline flex items-center gap-0.5"
            >
              <Send className="w-2.5 h-2.5 text-cyan-400" />
              @D_X
            </a>
          </div>

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
              isAllConditionsMet
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                : 'bg-amber-950 text-amber-300 border border-amber-600/60'
            }`}
          >
            {isAllConditionsMet ? 'STRATEGY VERIFIED' : 'SETUP PENDING'}
          </span>
        </div>

        {/* 1m Trend & 30m Range */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {/* Trend */}
          <div className="p-1.5 rounded bg-[#090414] border border-purple-950 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">1M TF Trend:</span>
            <div className="font-extrabold flex items-center gap-1 mt-0.5">
              {trend1m === 'UPTREND' ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
              )}
              <span className={trend1m === 'UPTREND' ? 'text-emerald-300' : 'text-rose-300'}>
                {trend1m}
              </span>
              <span className="text-[9px] text-purple-300/80">({trendConfidence}%)</span>
            </div>
          </div>

          {/* 30m Range */}
          <div className="p-1.5 rounded bg-[#090414] border border-purple-950 flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase">30m Range (Ext):</span>
            <div className="font-bold text-slate-200 mt-0.5 truncate">
              H: <span className="text-amber-300">{high30m.toFixed(pipSize)}</span> | L:{' '}
              <span className="text-cyan-300">{low30m.toFixed(pipSize)}</span>
            </div>
          </div>
        </div>

        {/* Supply / Demand Zone & Confirmation Bar Check */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {/* Zone Status */}
          <div
            className={`p-1.5 rounded border ${
              isAtSupplyZone
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                : isAtDemandZone
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Current Zone:</span>
            <span className="font-bold block truncate mt-0.5">
              {isAtSupplyZone ? 'Supply Zone (DBD)' : isAtDemandZone ? 'Demand Zone (RBR)' : 'In-Between Zones'}
            </span>
          </div>

          {/* Confirmation Bar Status */}
          <div
            className={`p-1.5 rounded border ${
              hasConfirmationBar
                ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-300'
                : 'bg-amber-950/50 border-amber-600/70 text-amber-300'
            }`}
          >
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Confirmation Bar:</span>
            <span className="font-bold block truncate mt-0.5">
              {isAtSupplyZone ? (
                currentCandleBarColor === 'RED' ? (
                  '✓ Red Bar (Trade FALL)'
                ) : (
                  'Wait for Red Bar'
                )
              ) : isAtDemandZone ? (
                currentCandleBarColor === 'GREEN' ? (
                  '✓ Green Bar (Trade RISE)'
                ) : (
                  'Wait for Green Bar'
                )
              ) : (
                'Wait for POI Return'
              )}
            </span>
          </div>
        </div>

        {/* False Breakout Notice if present */}
        {falseBreakoutWarning && (
          <div className="p-1.5 rounded bg-amber-950/40 border border-amber-600/60 text-[10px] text-amber-200 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{falseBreakoutWarning}</span>
          </div>
        )}
      </div>
    );
  }

  // FULL DETAIL VIEW (For MarketModal)
  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 1. Header Banner with Author Credit */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c0c38] via-[#140829] to-[#0c0419] border border-purple-800/80 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-md shadow-pink-600/30">
                <Target className="w-4 h-4" />
                BABYOIL SPEEDBOT on D-Xpert
              </span>
              <span className="text-purple-300 text-xs font-semibold hidden sm:inline">
                Your Expert in D Technology
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-sans">
              1-Minute Timeframe Market Structure • 30-Min Extended High/Low • Drop-Base-Drop &amp; Rally-Base-Rally Supply/Demand Zones
            </p>
          </div>

          <a
            href="https://t.me/D_X"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-bold flex items-center gap-1.5 hover:bg-cyan-900 transition-colors shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telegram: @D_X</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Status Callout */}
        <div className="p-3 rounded-xl bg-[#090314] border border-purple-900/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase text-[10px]">Execution Status:</span>
            <span
              className={`px-2 py-0.5 rounded font-black text-xs ${
                isAllConditionsMet
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : 'bg-amber-950 text-amber-300 border border-amber-600'
              }`}
            >
              {botStatus === 'CONFIRMED_FALL'
                ? '✓ CONFIRMED: EXECUTE TRADE FALL'
                : botStatus === 'CONFIRMED_RISE'
                ? '✓ CONFIRMED: EXECUTE TRADE RISE'
                : botStatus === 'WAIT_CONFIRMATION_BAR'
                ? 'WAIT FOR CONFIRMATION BAR'
                : 'WAIT FOR MARKET TO RETURN TO POI'}
            </span>
          </div>

          <div className="text-purple-300 text-[11px]">
            Confidence: <strong className="text-white">{confidence}%</strong> | Recommended Duration:{' '}
            <strong className="text-pink-300">1m TF (1 - 3 Ticks)</strong>
          </div>
        </div>
      </div>

      {/* 2. 4-Column Metric Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: 1m Trend */}
        <div className="p-3 rounded-xl bg-[#120822] border border-purple-900/60 space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">1. 1m Market Trend</span>
          <div className="flex items-center gap-2 text-base font-black">
            {trend1m === 'UPTREND' ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
            <span className={trend1m === 'UPTREND' ? 'text-emerald-300' : 'text-rose-300'}>
              {trend1m}
            </span>
            <span className="text-xs text-purple-300 font-normal font-mono">({trendConfidence}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug font-sans">{trendDescription}</p>
        </div>

        {/* Metric 2: 30m Prev High & Low Range */}
        <div className="p-3 rounded-xl bg-[#120822] border border-purple-900/60 space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">2. 30m Prev High &amp; Low</span>
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400 font-bold">30m High:</span>
              <span className="font-extrabold text-amber-200">{high30m.toFixed(pipSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-400 font-bold">30m Low:</span>
              <span className="font-extrabold text-cyan-200">{low30m.toFixed(pipSize)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-purple-300 pt-0.5 border-t border-purple-900/40">
              <span>Spread Range:</span>
              <span>{range30m.toFixed(pipSize)} pts</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active POI Zone */}
        <div className="p-3 rounded-xl bg-[#120822] border border-purple-900/60 space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">3. Active POI / Zone</span>
          <div className="text-xs font-bold">
            {isAtSupplyZone ? (
              <span className="text-rose-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Testing Supply Zone (DBD)
              </span>
            ) : isAtDemandZone ? (
              <span className="text-emerald-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Testing Demand Zone (RBR)
              </span>
            ) : (
              <span className="text-amber-300">In-Between Zones (Waiting)</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            {isAtSupplyZone
              ? 'Market reached supply base reversal point.'
              : isAtDemandZone
              ? 'Market reached demand base reversal point.'
              : 'Wait for price to return to marked level before trade.'}
          </p>
        </div>

        {/* Metric 4: Confirmation Bar & False Breakout */}
        <div
          className={`p-3 rounded-xl border space-y-1.5 ${
            hasConfirmationBar
              ? 'bg-emerald-950/40 border-emerald-600/70'
              : 'bg-amber-950/40 border-amber-600/70'
          }`}
        >
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            4. Confirmation Bar Status
          </span>
          <div className="font-extrabold text-xs">
            {hasConfirmationBar ? (
              <span className="text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Bar Color Confirmed
              </span>
            ) : (
              <span className="text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Bar Color Pending
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-300">
            Forming Bar: <strong className="text-white">{currentCandleBarColor}</strong>
          </div>
        </div>
      </div>

      {/* 3. Golden Rules of the Strategy (Directly from User Prompt) */}
      <div className="p-4 rounded-2xl bg-[#0d071c] border border-purple-900/60 space-y-3">
        <div className="flex items-center gap-2 border-b border-purple-900/40 pb-2">
          <Zap className="w-4 h-4 text-pink-400" />
          <span className="font-bold text-white text-xs">
            BABYOIL SPEEDBOT Core Institutional Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Rule 1: Supply Zone */}
          <div className="p-3 rounded-xl bg-[#160a22] border border-rose-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
              <span>Supply Zone (DBD) → FALL Rule</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
              &quot;If the market is on a supply zone, <strong>wait for a RED BAR to start forming</strong> before setting your bot to trade <strong>FALL</strong>.&quot;
            </p>
            <div className="pt-1 text-[10px] text-rose-300/80 font-mono">
              Avoids buying tops or getting stopped by false breakouts.
            </div>
          </div>

          {/* Rule 2: Demand Zone */}
          <div className="p-3 rounded-xl bg-[#0a1b15] border border-emerald-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Demand Zone (RBR) → RISE Rule</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
              &quot;When the market is on the demand zone, <strong>make sure a GREEN BAR is being formed</strong> before trading <strong>RISE</strong>.&quot;
            </p>
            <div className="pt-1 text-[10px] text-emerald-300/80 font-mono">
              Confirms institutional absorption before buying bottoms.
            </div>
          </div>

          {/* Rule 3: Avoid Reversals in Between */}
          <div className="p-3 rounded-xl bg-[#1d140a] border border-amber-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>In-Between Zones → Wait Rule</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
              &quot;<strong>Wait for the market to return to the market level you have marked</strong> before taking any trade to avoid being stopped out by market reversal in between the demand and supply zone.&quot;
            </p>
            <div className="pt-1 text-[10px] text-amber-300/80 font-mono">
              Never execute random entries in the middle of nowhere.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Supply & Demand Zones Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Supply Zones (Drop Base Drop) */}
        <div className="p-3.5 rounded-xl bg-[#120616] border border-rose-950/80 space-y-2">
          <div className="flex items-center justify-between border-b border-rose-900/40 pb-1.5">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Supply Zones [Drop Base Drop (DBD) Bases]</span>
            </div>
            <span className="text-[10px] text-rose-400 font-mono">{supplyZones.length} Zones</span>
          </div>

          {supplyZones.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No supply zones active in range.</p>
          ) : (
            <div className="space-y-1.5">
              {supplyZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                    zone.isCurrentZone
                      ? 'bg-rose-950/80 border-rose-500 text-rose-100 ring-1 ring-rose-400'
                      : 'bg-[#18081a] border-rose-900/50 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-rose-300">{zone.name}</div>
                    <div className="text-[10px] text-slate-400">
                      High: {zone.highPrice.toFixed(pipSize)} | Low: {zone.lowPrice.toFixed(pipSize)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {zone.pattern === 'DROP_BASE_DROP' ? 'DBD Base' : 'Swing High'}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">Tested {zone.testCount}x</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demand Zones (Rally Base Rally) */}
        <div className="p-3.5 rounded-xl bg-[#06140f] border border-emerald-950/80 space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Demand Zones [Rally Base Rally (RBR) Bases]</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">{demandZones.length} Zones</span>
          </div>

          {demandZones.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No demand zones active in range.</p>
          ) : (
            <div className="space-y-1.5">
              {demandZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                    zone.isCurrentZone
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 ring-1 ring-emerald-400'
                      : 'bg-[#0a1e16] border-emerald-900/50 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-emerald-300">{zone.name}</div>
                    <div className="text-[10px] text-slate-400">
                      High: {zone.highPrice.toFixed(pipSize)} | Low: {zone.lowPrice.toFixed(pipSize)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {zone.pattern === 'RALLY_BASE_RALLY' ? 'RBR Base' : 'Swing Low'}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">Tested {zone.testCount}x</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Break of Structure (BOS) Points */}
      <div className="p-3.5 rounded-xl bg-[#0f0a22] border border-purple-900/50 space-y-2">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-1.5 text-xs">
          <span className="font-bold text-slate-200">
            Break of Structure (BOS) &amp; Points of Reversal (POI)
          </span>
          <span className="text-purple-300 text-[10px]">{bosPoints.length} Points Identified</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {bosPoints.map((bos) => (
            <div
              key={bos.id}
              className="p-2 rounded-lg bg-[#070314] border border-purple-900/40 text-[11px] space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-black ${
                    bos.type === 'BULLISH_BOS' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {bos.type === 'BULLISH_BOS' ? '▲ BULLISH BOS' : '▼ BEARISH BOS'}
                </span>
                <span className="text-[10px] text-slate-400">{bos.time}</span>
              </div>
              <div className="text-slate-300">
                Broken Level: <strong className="text-white">{bos.brokenLevel.toFixed(pipSize)}</strong>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">{bos.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
