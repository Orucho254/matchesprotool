import React, { useState, useMemo } from 'react';
import { CandlestickPoint, SmcRiseFallStrategyAnalysis } from '../types';
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
  Sliders,
} from 'lucide-react';

export interface CandlestickChartProps {
  data: CandlestickPoint[];
  symbol: string;
  marketName: string;
  pipSize?: number;
  height?: number;
  smcAnalysis?: SmcRiseFallStrategyAnalysis;
  showSmcAnnotations?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  symbol,
  marketName,
  pipSize = 2,
  height = 420,
  smcAnalysis,
  showSmcAnnotations = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showBOS, setShowBOS] = useState<boolean>(true);
  const [show30mRange, setShow30mRange] = useState<boolean>(true);

  // Compute boundaries accommodating candles and SMC 30-min range + zones
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (data.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 100 };
    let min = Infinity;
    let max = -Infinity;
    let volMax = 0;

    data.forEach((d) => {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (d.volume > volMax) volMax = d.volume;
    });

    if (smcAnalysis) {
      if (smcAnalysis.low30m < min) min = smcAnalysis.low30m;
      if (smcAnalysis.high30m > max) max = smcAnalysis.high30m;
      smcAnalysis.supplyZones?.forEach((z) => {
        if (z.highPrice > max) max = z.highPrice;
        if (z.lowPrice < min) min = z.lowPrice;
      });
      smcAnalysis.demandZones?.forEach((z) => {
        if (z.highPrice > max) max = z.highPrice;
        if (z.lowPrice < min) min = z.lowPrice;
      });
    }

    // Add breathing margin
    const padding = (max - min) * 0.08 || 1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVol: volMax || 1,
    };
  }, [data, smcAnalysis]);

  const chartHeight = height - 90; // Top price chart
  const volumeHeight = 55; // Bottom volume chart
  const svgWidth = 840;
  const paddingLeft = 12;
  const paddingRight = 95; // Room for price labels and POI tags
  const usableWidth = svgWidth - paddingLeft - paddingRight;

  const candleCount = data.length;
  const candleSlotWidth = usableWidth / Math.max(1, candleCount);
  const candleBodyWidth = Math.max(4, candleSlotWidth * 0.65);

  const priceToY = (price: number) => {
    if (maxPrice === minPrice) return chartHeight / 2;
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 35) - 20;
  };

  const volToH = (vol: number) => {
    return (vol / maxVol) * volumeHeight;
  };

  // Currently inspected point
  const inspected = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : data[data.length - 1];
  const isInspectedBullish = inspected ? inspected.close >= inspected.open : true;
  const priceChange = inspected ? inspected.close - inspected.open : 0;
  const priceChangePercent = inspected && inspected.open > 0 ? (priceChange / inspected.open) * 100 : 0;

  // Current live candle
  const liveCandle = data[data.length - 1];
  const isLiveBullish = liveCandle ? liveCandle.close >= liveCandle.open : true;

  // EMA lines points
  const emaPath = useMemo(() => {
    return data
      .map((d, i) => {
        const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
        const y = priceToY(d.ema20);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, minPrice, maxPrice]);

  const smaPath = useMemo(() => {
    return data
      .map((d, i) => {
        const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
        const y = priceToY(d.sma50);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, minPrice, maxPrice]);

  // Price axis labels (5 levels)
  const priceLabels = useMemo(() => {
    const steps = 5;
    const labels: { price: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = minPrice + ((maxPrice - minPrice) * i) / steps;
      labels.push({ price: p, y: priceToY(p) });
    }
    return labels;
  }, [minPrice, maxPrice]);

  return (
    <div className="w-full bg-[#090615] border border-purple-900/60 rounded-2xl p-4 shadow-2xl overflow-hidden font-sans space-y-3.5">
      {/* 1. TOP SPEEDBOT & STRATEGY BRANDING HEADER */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-[#170c2e] via-[#120824] to-[#0d051c] border border-purple-800/70 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Bot Title & Telegram badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-md shadow-pink-600/30">
              <Target className="w-3.5 h-3.5" />
              BABYOIL SPEEDBOT on D-Xpert
            </div>
            <span className="text-[11px] text-purple-300/80 font-medium hidden sm:inline">
              Your Expert in D Technology
            </span>
            <a
              href="https://t.me/D_X"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-[11px] font-bold font-mono flex items-center gap-1 hover:bg-cyan-900/80 hover:text-white transition-colors"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              Telegram: @D_X
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          </div>

          {/* 1m TF Trend & Trade Activation State */}
          {smcAnalysis && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Trend Badge */}
              <div
                className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs flex items-center gap-1.5 shadow-sm ${
                  smcAnalysis.trend1m === 'UPTREND'
                    ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
                    : smcAnalysis.trend1m === 'DOWNTREND'
                    ? 'bg-rose-950/80 border-rose-500/70 text-rose-300'
                    : 'bg-purple-950 border-purple-800 text-purple-300'
                }`}
              >
                {smcAnalysis.trend1m === 'UPTREND' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>1M TREND: {smcAnalysis.trend1m}</span>
                <span className="text-[10px] opacity-80">({smcAnalysis.trendConfidence}%)</span>
              </div>

              {/* Bot Confirmation Status Badge */}
              <div
                className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs flex items-center gap-1.5 shadow-sm ${
                  smcAnalysis.isAllConditionsMet
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 animate-pulse'
                    : smcAnalysis.falseBreakoutWarning
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                    : 'bg-purple-950/80 border-purple-800 text-purple-300'
                }`}
              >
                {smcAnalysis.isAllConditionsMet ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : smcAnalysis.falseBreakoutWarning ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>
                  {smcAnalysis.botStatus === 'CONFIRMED_FALL'
                    ? '✓ CONFIRMED FALL ACTIVATED'
                    : smcAnalysis.botStatus === 'CONFIRMED_RISE'
                    ? '✓ CONFIRMED RISE ACTIVATED'
                    : smcAnalysis.botStatus === 'WAIT_CONFIRMATION_BAR'
                    ? 'WAIT CONFIRMATION BAR'
                    : 'WAIT FOR POI LEVEL'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 30-min Range & POI Summary Sub-bar */}
        {smcAnalysis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 mt-2.5 border-t border-purple-900/50 text-xs font-mono">
            <div className="p-1.5 rounded bg-[#0b0417] border border-purple-900/40">
              <span className="text-[10px] text-amber-400 font-bold block">30M PREV HIGH (Extended):</span>
              <span className="font-extrabold text-amber-200">{smcAnalysis.high30m.toFixed(pipSize)}</span>
            </div>
            <div className="p-1.5 rounded bg-[#0b0417] border border-purple-900/40">
              <span className="text-[10px] text-cyan-400 font-bold block">30M PREV LOW (Extended):</span>
              <span className="font-extrabold text-cyan-200">{smcAnalysis.low30m.toFixed(pipSize)}</span>
            </div>
            <div className="p-1.5 rounded bg-[#0b0417] border border-purple-900/40">
              <span className="text-[10px] text-slate-400 font-bold block">POSITION IN 30M RANGE:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, smcAnalysis.currentPricePositionPercent))}%` }}
                  />
                </div>
                <span className="font-bold text-[11px] text-purple-200">
                  {smcAnalysis.currentPricePositionPercent}%
                </span>
              </div>
            </div>
            <div className="p-1.5 rounded bg-[#0b0417] border border-purple-900/40">
              <span className="text-[10px] text-slate-400 font-bold block">ACTIVE POI / ZONE:</span>
              <span className="font-bold text-[11px] text-slate-200 truncate block">
                {smcAnalysis.activePOI
                  ? `${smcAnalysis.activePOI.name} (${smcAnalysis.activePOI.type})`
                  : 'In-Between Zones (Waiting)'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. OHLC METRICS BAR & ANNOTATION TOGGLES */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-purple-900/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-slate-100 font-mono tracking-tight text-sm">
            {symbol}
          </span>
          <span className="text-purple-300/80 font-medium">({marketName})</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
            1M Timeframe (30 Candles)
          </span>
        </div>

        {/* Live Candle OHLC */}
        {inspected && (
          <div className="flex items-center gap-2.5 font-mono text-[11px] flex-wrap">
            <span className="text-slate-400">
              O: <strong className="text-slate-200">{inspected.open.toFixed(pipSize)}</strong>
            </span>
            <span className="text-slate-400">
              H: <strong className="text-emerald-400">{inspected.high.toFixed(pipSize)}</strong>
            </span>
            <span className="text-slate-400">
              L: <strong className="text-rose-400">{inspected.low.toFixed(pipSize)}</strong>
            </span>
            <span className="text-slate-400">
              C:{' '}
              <strong className={isInspectedBullish ? 'text-[#00f59b]' : 'text-[#f43f5e]'}>
                {inspected.close.toFixed(pipSize)}
              </strong>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold ${
                priceChange >= 0
                  ? 'bg-emerald-950/80 text-[#00f59b] border border-emerald-600/50'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
              }`}
            >
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(pipSize)} ({priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {/* SMC Annotations Interactive Toggles */}
        {showSmcAnnotations && smcAnalysis && (
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setShowZones(!showZones)}
              className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                showZones
                  ? 'bg-purple-900/60 border-purple-600 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              Zones {showZones ? '✓' : '✗'}
            </button>
            <button
              type="button"
              onClick={() => setShowBOS(!showBOS)}
              className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                showBOS
                  ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              BOS {showBOS ? '✓' : '✗'}
            </button>
            <button
              type="button"
              onClick={() => setShow30mRange(!show30mRange)}
              className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                show30mRange
                  ? 'bg-amber-950 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              30m Range {show30mRange ? '✓' : '✗'}
            </button>
          </div>
        )}
      </div>

      {/* 3. SVG CANVAS WITH 1M CANDLES, 30M HIGH/LOW, SUPPLY/DEMAND & BOS ANNOTATIONS */}
      <div className="relative w-full overflow-hidden select-none bg-[#05030e] rounded-xl border border-purple-950">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto max-h-[440px] drop-shadow"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Supply Zone Gradient */}
            <linearGradient id="supplyZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.12" />
            </linearGradient>
            {/* Demand Zone Gradient */}
            <linearGradient id="demandZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* Subtle Grid Lines & Price Labels */}
          {priceLabels.map((lbl, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={lbl.y}
                x2={svgWidth - paddingRight}
                y2={lbl.y}
                stroke="#241344"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={svgWidth - paddingRight + 8}
                y={lbl.y + 3}
                fill="#8b71a5"
                fontSize="10"
                fontFamily="monospace"
              >
                {lbl.price.toFixed(pipSize)}
              </text>
            </g>
          ))}

          {/* 30-MIN PREVIOUS HIGH EXTENDED LINE */}
          {showSmcAnnotations && smcAnalysis && show30mRange && (
            <g>
              <line
                x1={paddingLeft}
                y1={priceToY(smcAnalysis.high30m)}
                x2={svgWidth - paddingRight}
                y2={priceToY(smcAnalysis.high30m)}
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="6 3"
                opacity="0.9"
              />
              <rect
                x={svgWidth - paddingRight + 4}
                y={priceToY(smcAnalysis.high30m) - 10}
                width="88"
                height="20"
                rx="4"
                fill="#451a03"
                stroke="#f59e0b"
                strokeWidth="1"
              />
              <text
                x={svgWidth - paddingRight + 8}
                y={priceToY(smcAnalysis.high30m) + 3}
                fill="#fbbf24"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                30M HIGH POI
              </text>
            </g>
          )}

          {/* 30-MIN PREVIOUS LOW EXTENDED LINE */}
          {showSmcAnnotations && smcAnalysis && show30mRange && (
            <g>
              <line
                x1={paddingLeft}
                y1={priceToY(smcAnalysis.low30m)}
                x2={svgWidth - paddingRight}
                y2={priceToY(smcAnalysis.low30m)}
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeDasharray="6 3"
                opacity="0.9"
              />
              <rect
                x={svgWidth - paddingRight + 4}
                y={priceToY(smcAnalysis.low30m) - 10}
                width="88"
                height="20"
                rx="4"
                fill="#083344"
                stroke="#06b6d4"
                strokeWidth="1"
              />
              <text
                x={svgWidth - paddingRight + 8}
                y={priceToY(smcAnalysis.low30m) + 3}
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                30M LOW POI
              </text>
            </g>
          )}

          {/* SUPPLY ZONES (DROP-BASE-DROP & SWING HIGHS) */}
          {showSmcAnnotations &&
            smcAnalysis &&
            showZones &&
            smcAnalysis.supplyZones?.map((zone) => {
              const topY = priceToY(zone.highPrice);
              const bottomY = priceToY(zone.lowPrice);
              const zoneH = Math.max(8, Math.abs(bottomY - topY));
              const zoneY = Math.min(topY, bottomY);

              return (
                <g key={zone.id}>
                  {/* Shaded zone box */}
                  <rect
                    x={paddingLeft}
                    y={zoneY}
                    width={usableWidth}
                    height={zoneH}
                    fill="url(#supplyZoneGrad)"
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                  {/* Tag label inside zone */}
                  <rect
                    x={paddingLeft + 8}
                    y={zoneY + 2}
                    width="230"
                    height="16"
                    rx="3"
                    fill="#1e050f"
                    fillOpacity="0.8"
                    stroke="#e11d48"
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingLeft + 12}
                    y={zoneY + 13}
                    fill="#fda4af"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    🔴 SUPPLY ZONE [{zone.pattern === 'DROP_BASE_DROP' ? 'DBD BASE' : 'POI HIGH'}] (POI)
                  </text>
                </g>
              );
            })}

          {/* DEMAND ZONES (RALLY-BASE-RALLY & SWING LOWS) */}
          {showSmcAnnotations &&
            smcAnalysis &&
            showZones &&
            smcAnalysis.demandZones?.map((zone) => {
              const topY = priceToY(zone.highPrice);
              const bottomY = priceToY(zone.lowPrice);
              const zoneH = Math.max(8, Math.abs(bottomY - topY));
              const zoneY = Math.min(topY, bottomY);

              return (
                <g key={zone.id}>
                  {/* Shaded zone box */}
                  <rect
                    x={paddingLeft}
                    y={zoneY}
                    width={usableWidth}
                    height={zoneH}
                    fill="url(#demandZoneGrad)"
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                  {/* Tag label inside zone */}
                  <rect
                    x={paddingLeft + 8}
                    y={zoneY + 2}
                    width="235"
                    height="16"
                    rx="3"
                    fill="#032014"
                    fillOpacity="0.8"
                    stroke="#059669"
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingLeft + 12}
                    y={zoneY + 13}
                    fill="#6ee7b7"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    🟢 DEMAND ZONE [{zone.pattern === 'RALLY_BASE_RALLY' ? 'RBR BASE' : 'POI LOW'}] (POI)
                  </text>
                </g>
              );
            })}

          {/* BOS (BREAK OF STRUCTURE) MARKERS */}
          {showSmcAnnotations &&
            smcAnalysis &&
            showBOS &&
            smcAnalysis.bosPoints?.map((bos) => {
              const bosY = priceToY(bos.brokenLevel);
              const isBullish = bos.type === 'BULLISH_BOS';

              return (
                <g key={bos.id}>
                  <line
                    x1={paddingLeft}
                    y1={bosY}
                    x2={usableWidth + paddingLeft}
                    y2={bosY}
                    stroke={isBullish ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    opacity="0.75"
                  />
                  <rect
                    x={paddingLeft + 250}
                    y={bosY - 8}
                    width="155"
                    height="16"
                    rx="3"
                    fill={isBullish ? '#064e3b' : '#881337'}
                    stroke={isBullish ? '#34d399' : '#fb7185'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingLeft + 255}
                    y={bosY + 4}
                    fill={isBullish ? '#a7f3d0' : '#fecdd3'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isBullish ? '▲ BULLISH BOS (Rally Base)' : '▼ BEARISH BOS (Drop Base)'}
                  </text>
                </g>
              );
            })}

          {/* Volume separator line */}
          <line
            x1={paddingLeft}
            y1={chartHeight}
            x2={svgWidth - paddingRight}
            y2={chartHeight}
            stroke="#3b2068"
            strokeWidth="1"
          />
          <text
            x={svgWidth - paddingRight + 8}
            y={chartHeight + 14}
            fill="#6b5185"
            fontSize="9"
            fontFamily="monospace"
          >
            VOL
          </text>

          {/* CANDLESTICKS AND VOLUME BARS */}
          {data.map((d, i) => {
            const isBullish = d.close >= d.open;
            const xCenter = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
            const openY = priceToY(d.open);
            const closeY = priceToY(d.close);
            const highY = priceToY(d.high);
            const lowY = priceToY(d.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));
            const volH = volToH(d.volume);
            const volY = height - volH - 5;

            const isHovered = hoveredIndex === i;
            const isLatestCandle = i === data.length - 1;

            return (
              <g
                key={i}
                className="cursor-crosshair transition-opacity"
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Wick */}
                <line
                  x1={xCenter}
                  y1={highY}
                  x2={xCenter}
                  y2={lowY}
                  stroke={isBullish ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.5"
                  opacity={isHovered ? 1 : 0.85}
                />

                {/* Candle Body */}
                <rect
                  x={xCenter - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#10b981' : '#f43f5e'}
                  rx="1.5"
                  stroke={isBullish ? '#34d399' : '#fb7185'}
                  strokeWidth={isLatestCandle ? '1.5' : '0.8'}
                  filter={
                    isLatestCandle
                      ? 'drop-shadow(0 0 7px rgba(236,72,153,0.7))'
                      : isHovered
                      ? 'drop-shadow(0 0 6px rgba(16,185,129,0.8))'
                      : undefined
                  }
                />

                {/* Volume bar */}
                <rect
                  x={xCenter - candleBodyWidth / 2}
                  y={volY}
                  width={candleBodyWidth}
                  height={volH}
                  fill={isBullish ? '#065f46' : '#881337'}
                  opacity={isHovered ? 0.9 : 0.45}
                  rx="1"
                />

                {/* Vertical hover crosshair line */}
                {isHovered && (
                  <line
                    x1={xCenter}
                    y1={10}
                    x2={xCenter}
                    y2={height - 10}
                    stroke="#a855f7"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}

          {/* Indicator Paths */}
          <path d={emaPath} fill="none" stroke="#06b6d4" strokeWidth="1.8" opacity="0.9" />
          <path d={smaPath} fill="none" stroke="#c084fc" strokeWidth="1.8" opacity="0.8" />

          {/* CURRENT PRICE LIVE TRACKING LINE */}
          {data.length > 0 && (
            <g>
              <line
                x1={paddingLeft}
                y1={priceToY(data[data.length - 1].close)}
                x2={svgWidth - paddingRight}
                y2={priceToY(data[data.length - 1].close)}
                stroke="#00f59b"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <rect
                x={svgWidth - paddingRight + 4}
                y={priceToY(data[data.length - 1].close) - 9}
                width="70"
                height="18"
                rx="4"
                fill="#052e16"
                stroke="#10b981"
                strokeWidth="1"
              />
              <text
                x={svgWidth - paddingRight + 8}
                y={priceToY(data[data.length - 1].close) + 4}
                fill="#00f59b"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {data[data.length - 1].close.toFixed(pipSize)}
              </text>
            </g>
          )}

          {/* CONFIRMATION BAR POINTER AT LIVE CANDLE */}
          {showSmcAnnotations && smcAnalysis && data.length > 0 && (
            <g>
              {/* Arrow and callout for live confirmation candle */}
              <circle
                cx={paddingLeft + (data.length - 1) * candleSlotWidth + candleSlotWidth / 2}
                y={priceToY(data[data.length - 1].close)}
                r="4"
                fill={isLiveBullish ? '#10b981' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>

      {/* 4. SMC STRATEGY 5-POINT CONFIRMATION CHECKLIST PANEL */}
      {smcAnalysis && (
        <div className="p-3.5 rounded-xl bg-[#0e0720] border border-purple-900/60 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-purple-900/40 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-pink-400 shrink-0" />
              <span className="font-mono font-bold text-xs text-white">
                BABYOIL SPEEDBOT: 5-Step Market Structure Rules &amp; Confirmation Status
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                smcAnalysis.isAllConditionsMet
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : 'bg-amber-950 text-amber-300 border border-amber-500'
              }`}
            >
              {smcAnalysis.isAllConditionsMet ? '✓ ALL CONDITIONS CONFIRMED' : '⚠ WAITING FOR ENTRY CONFIRMATION'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] font-mono">
            {/* Rule 1: 1-min Trend */}
            <div className="p-2 rounded-lg bg-[#070312] border border-purple-900/40 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">1. 1m Market Trend</div>
              <div className="font-black text-slate-200 flex items-center gap-1">
                {smcAnalysis.trend1m === 'UPTREND' ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                )}
                {smcAnalysis.trend1m}
              </div>
              <div className="text-[9px] text-slate-400">
                {smcAnalysis.trend1m === 'UPTREND' ? 'Rally-Base-Rally bias' : 'Drop-Base-Drop bias'}
              </div>
            </div>

            {/* Rule 2: 30-min High/Low */}
            <div className="p-2 rounded-lg bg-[#070312] border border-purple-900/40 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">2. 30m Prev High/Low</div>
              <div className="font-bold text-slate-200 truncate">
                H: {smcAnalysis.high30m.toFixed(pipSize)}
              </div>
              <div className="font-bold text-slate-200 truncate">
                L: {smcAnalysis.low30m.toFixed(pipSize)}
              </div>
              <div className="text-[9px] text-purple-300">Extended zone active</div>
            </div>

            {/* Rule 3: Supply / Demand Zones */}
            <div className="p-2 rounded-lg bg-[#070312] border border-purple-900/40 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">3. Supply/Demand Zones</div>
              <div className="font-bold text-slate-200">
                {smcAnalysis.isAtSupplyZone ? (
                  <span className="text-rose-400">Testing Supply (DBD)</span>
                ) : smcAnalysis.isAtDemandZone ? (
                  <span className="text-emerald-400">Testing Demand (RBR)</span>
                ) : (
                  <span className="text-amber-400">In-Between Zones</span>
                )}
              </div>
              <div className="text-[9px] text-slate-400">
                {smcAnalysis.supplyZones.length} Supply / {smcAnalysis.demandZones.length} Demand
              </div>
            </div>

            {/* Rule 4: BOS & POI */}
            <div className="p-2 rounded-lg bg-[#070312] border border-purple-900/40 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">4. BOS &amp; POI Reversals</div>
              <div className="font-bold text-slate-200">
                {smcAnalysis.bosPoints.length > 0 ? (
                  <span>{smcAnalysis.bosPoints.length} BOS Detected</span>
                ) : (
                  <span>Range Structure</span>
                )}
              </div>
              <div className="text-[9px] text-slate-400">Base reversal level marked</div>
            </div>

            {/* Rule 5: Confirmation Bar */}
            <div
              className={`p-2 rounded-lg border space-y-1 ${
                smcAnalysis.hasConfirmationBar
                  ? 'bg-emerald-950/40 border-emerald-600/60'
                  : 'bg-amber-950/40 border-amber-600/60'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400">5. Confirmation Bar</div>
              <div className="font-black">
                {smcAnalysis.isAtSupplyZone ? (
                  smcAnalysis.currentCandleBarColor === 'RED' ? (
                    <span className="text-emerald-300">✓ Red Bar Forming</span>
                  ) : (
                    <span className="text-amber-300">⚠️ Waiting for Red Bar</span>
                  )
                ) : smcAnalysis.isAtDemandZone ? (
                  smcAnalysis.currentCandleBarColor === 'GREEN' ? (
                    <span className="text-emerald-300">✓ Green Bar Forming</span>
                  ) : (
                    <span className="text-amber-300">⚠️ Waiting for Green Bar</span>
                  )
                ) : (
                  <span className="text-amber-400">⏳ Wait for POI Return</span>
                )}
              </div>
              <div className="text-[9px] text-slate-300 truncate">
                {smcAnalysis.hasConfirmationBar ? 'Ready to execute' : 'Avoid mid-range reversal'}
              </div>
            </div>
          </div>

          {/* User rule reminder banner */}
          <div className="p-2.5 rounded-lg bg-black/40 border border-purple-900/40 text-[11px] text-slate-300 leading-relaxed font-sans flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <strong>Strategy Guidance:</strong> {smcAnalysis.strategyReason}
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER TIMESTAMPS & LEGEND */}
      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-purple-900/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-cyan-400" />
            <span>EMA 20</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-purple-400" />
            <span>SMA 50</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-rose-500" />
            <span>Supply (DBD)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500" />
            <span>Demand (RBR)</span>
          </span>
        </div>
        <div className="text-purple-300 font-medium">
          {data[0]?.time || '30m Ago'} → {data[data.length - 1]?.time || 'Live Now'}
        </div>
      </div>
    </div>
  );
};
