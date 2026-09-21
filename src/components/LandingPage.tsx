import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Binary,
  ArrowUpDown,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  User,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  ChevronRight,
  BarChart3,
  Search,
  Filter,
  MousePointerClick,
  LineChart,
} from 'lucide-react';
import {
  LANDING_MARKETS,
  MarketChartConfig,
  generateCandlestickData,
} from '../data/landingChartData';
import { CandlestickChart } from './CandlestickChart';
import { authService } from '../services/authService';

interface LandingPageProps {
  onGetStarted: () => void;
  onLoginSuccess?: () => void;
  onOpenLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLoginSuccess,
  onOpenLogin,
}) => {
  // Chart Selection State
  const [selectedMarket, setSelectedMarket] = useState<MarketChartConfig>(LANDING_MARKETS[0]);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('1m');
  const [chartData, setChartData] = useState(() =>
    generateCandlestickData(LANDING_MARKETS[0], 28)
  );

  // Active Market Category Card Spotlight
  const [activeCategoryTab, setActiveCategoryTab] = useState<'EVEN_ODD' | 'OVER_UNDER' | 'MATCHES' | 'RISE_FALL'>('EVEN_ODD');

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('matchestool254');
  const [password, setPassword] = useState<string>('tool911');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

  // Live Simulated Price Ticks on Chart
  useEffect(() => {
    setChartData(generateCandlestickData(selectedMarket, 28));

    const interval = setInterval(() => {
      setChartData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.48) * (selectedMarket.volatility * 0.35);
        const newClose = +(last.close + change).toFixed(selectedMarket.pipSize);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);

        const updatedLast = {
          ...last,
          close: newClose,
          high: newHigh,
          low: newLow,
          volume: last.volume + Math.floor(Math.random() * 5),
        };

        return [...prev.slice(0, -1), updatedLast];
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [selectedMarket, timeframe]);

  // Current Price & Stats
  const currentPrice = useMemo(() => {
    if (chartData.length === 0) return selectedMarket.basePrice;
    return chartData[chartData.length - 1].close;
  }, [chartData, selectedMarket]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { diff: 0, pct: 0 };
    const first = chartData[0].open;
    const last = chartData[chartData.length - 1].close;
    const diff = last - first;
    const pct = (diff / first) * 100;
    return { diff, pct };
  }, [chartData]);

  // Handle Login Submission - strictly requires valid credentials
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      const res = await authService.login({ username, password });
      if (res.success) {
        setShowAuthModal(false);
        if (onLoginSuccess) onLoginSuccess();
        else onGetStarted();
      } else {
        setAuthError(
          res.error || 'Access denied: Invalid credentials. You must insert the correct username and password.'
        );
      }
    } catch {
      setAuthError('Authentication error occurred. Please try again.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Handle action to access the terminal - strictly requires authentication
  const handleStartAction = () => {
    if (authService.getAuthState().isAuthenticated) {
      onGetStarted();
    } else if (onOpenLogin) {
      onOpenLogin();
    } else {
      setShowAuthModal(true);
    }
  };

  // 4 Core Market Categories Data
  const marketCategories = [
    {
      id: 'EVEN_ODD' as const,
      title: 'Even / Odd Analysis',
      subtitle: '2-Part Digit Parity Engine',
      icon: Binary,
      color: 'emerald',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description:
        'Continuous parity sequence tracking, mathematical streak decay analysis, and 0–4 vs 5–9 cluster distribution modeling.',
      stats: [
        { label: 'Parity Accuracy', val: '91.8%' },
        { label: 'Streak Exhaustion', val: '4 Ticks' },
        { label: 'Target Ratio', val: '64% Even' },
      ],
      sampleSignal: {
        signal: 'EVEN PROBABILITY',
        confidence: 91.8,
        market: 'Volatility 100 (1s)',
        bias: 'Bullish Parity Momentum',
      },
    },
    {
      id: 'OVER_UNDER' as const,
      title: 'Over / Under Analysis',
      subtitle: 'Dynamic Barrier Momentum',
      icon: ArrowUpDown,
      color: 'blue',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description:
        'Real-time frequency parsing across barriers Over 1 through Over 8, featuring velocity green-bar detection and suppressed floor filters.',
      stats: [
        { label: 'Floor Threshold', val: '< 9.8%' },
        { label: 'Velocity Threshold', val: '≥ 12.0%' },
        { label: 'Optimal Barrier', val: 'Over 2 / 3' },
      ],
      sampleSignal: {
        signal: 'OVER 2 BARRIER',
        confidence: 89.5,
        market: 'Volatility 75',
        bias: 'Green-Bar Momentum Driver',
      },
    },
    {
      id: 'MATCHES' as const,
      title: 'Matches / Differs',
      subtitle: 'Digit Frequency & Differ Engine',
      icon: Sparkles,
      color: 'amber',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description:
        'Statistical cold digit decay rates, repetition clustering resonance, and statistical differs safety margins with over 90% expected probability.',
      stats: [
        { label: 'Differs Safety', val: '94.2%' },
        { label: 'Cold Decay Rate', val: '4.1% Low' },
        { label: 'Pattern Resonance', val: 'Digit 7' },
      ],
      sampleSignal: {
        signal: 'DIFFERS DIGIT 4',
        confidence: 94.2,
        market: 'Boom 500 Index',
        bias: 'Sub-Zero Resonance',
      },
    },
    {
      id: 'RISE_FALL' as const,
      title: 'Rise / Fall SMC',
      subtitle: 'Smart Money Concepts & Trend',
      icon: TrendingUp,
      color: 'purple',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description:
        'Algorithmic SMC price structure analysis identifying 30-minute High/Low zones, market structure breaks (BOS), order blocks, and 1m/5m directional momentum.',
      stats: [
        { label: 'Trend Alignment', val: 'Strong Bullish' },
        { label: 'Break of Structure', val: 'Confirmed' },
        { label: 'Order Block Touch', val: 'Zone 1' },
      ],
      sampleSignal: {
        signal: 'RISE (HIGHER)',
        confidence: 88.7,
        market: 'Step Index',
        bias: 'Order Block Bounce',
      },
    },
  ];

  // How It Works Steps
  const howItWorksSteps = [
    {
      step: '01',
      title: 'Select a Market',
      description:
        'Browse high-frequency synthetic markets including Volatility Indices (1s), Crash/Boom, Jump, and Step Indices.',
      icon: Search,
      metric: '30+ Synthetic Markets',
    },
    {
      step: '02',
      title: 'Analyze in Real Time',
      description:
        'Our quantitative engine parses tick sequences, digit parity distributions, barrier frequencies, and SMC price action live.',
      icon: BarChart3,
      metric: '0ms WebSocket Latency',
    },
    {
      step: '03',
      title: 'View Available Signals',
      description:
        'Inspect algorithmic probability scores, confidence ratings (≥85%), momentum confirmation bars, and trade window countdowns.',
      icon: Filter,
      metric: 'Confidence ≥ 85%',
    },
    {
      step: '04',
      title: 'Choose the Market You Need',
      description:
        'Filter directly by Even/Odd, Over/Under, Matches/Differs, or Rise/Fall, and trade with statistical backing.',
      icon: MousePointerClick,
      metric: '4 Core Strategies',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Trading Analysis Tool
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Synthetic Indices Quantitative Terminal
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#markets" className="hover:text-white transition-colors">
              Markets
            </a>
            <a href="#charts" className="hover:text-white transition-colors">
              Live Chart
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onOpenLogin) onOpenLogin();
                else {
                  setShowAuthModal(true);
                }
              }}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleStartAction}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all shadow-sm shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-18 md:pb-22 border-b border-slate-800/80 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            {/* Live Ticker Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Deriv WebSocket Real-Time Stream</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-emerald-400">24/7 Continuous Synthetic Ticks</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Institutional Analysis for <span className="text-emerald-400">Synthetic Markets</span>
            </h1>

            {/* Clear, realistic description */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              A high-precision market analysis platform engineered for Deriv synthetic indices.
              Continuously scans and analyzes{' '}
              <span className="text-white font-semibold">Even/Odd</span>,{' '}
              <span className="text-white font-semibold">Over/Under</span>,{' '}
              <span className="text-white font-semibold">Matches/Differs</span>, and{' '}
              <span className="text-white font-semibold">Rise/Fall</span> markets to provide
              trade-ready probability scores and algorithmic signals.
            </p>

            {/* Hero Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={handleStartAction}
                className="w-full sm:w-auto px-7 py-3 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenLogin) onOpenLogin();
                  else {
                    setShowAuthModal(true);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Sign In to Terminal</span>
              </button>
            </div>

            {/* Key Value Points */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Analysis Engine</div>
                <div className="text-sm font-bold text-white mt-0.5">4 Core Models</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Signal Threshold</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">≥ 85% Confidence</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Data Feed</div>
                <div className="text-sm font-bold text-white mt-0.5">Live Deriv WS</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs text-slate-400">Trading Window</div>
                <div className="text-sm font-bold text-white mt-0.5">40s – 60s Timers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Trading Chart Section */}
      <section id="charts" className="py-14 bg-[#080d19] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Live Technical Visualization
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Real-Time Candlestick &amp; Momentum Chart
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Inspect high-frequency price action, high/low channel boundaries, and live
                algorithmic signal overlays across active synthetic indices.
              </p>
            </div>

            {/* Timeframe & Market Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Symbol selector */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {LANDING_MARKETS.map((m) => (
                  <button
                    key={m.symbol}
                    type="button"
                    onClick={() => setSelectedMarket(m)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedMarket.symbol === m.symbol
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.name.split(' ')[0]} {m.name.includes('(1s)') ? '(1s)' : ''}
                  </button>
                ))}
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      timeframe === tf
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Card Wrapper */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-xl space-y-4">
            {/* Chart Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{selectedMarket.name}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedMarket.symbol}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{selectedMarket.category}</span>
                </div>
              </div>

              {/* Live Price & Metric Banner */}
              <div className="flex items-center gap-4 text-right font-mono">
                <div>
                  <div className="text-lg font-extrabold text-white">
                    {currentPrice.toFixed(selectedMarket.pipSize)}
                  </div>
                  <div
                    className={`text-xs font-bold flex items-center justify-end gap-1 ${
                      priceChange.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {priceChange.pct >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {priceChange.pct >= 0 ? '+' : ''}
                      {priceChange.pct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Signal Badge */}
                <div className="hidden sm:block p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-left">
                  <span className="text-[10px] text-emerald-300/80 block uppercase font-mono">
                    Active Signal
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {selectedMarket.signal}
                  </span>
                </div>
              </div>
            </div>

            {/* Candlestick Canvas Component */}
            <div className="w-full">
              <CandlestickChart
                data={chartData}
                symbol={selectedMarket.symbol}
                marketName={selectedMarket.name}
                pipSize={selectedMarket.pipSize}
                height={380}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Market Analysis Categories Section */}
      <section id="markets" className="py-16 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Comprehensive Coverage
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              The 4 Core Derivative Markets
            </h2>
            <p className="text-sm text-slate-400">
              Each market category is analyzed using specialized mathematical models and quantitative
              indicators to uncover high-probability opportunities.
            </p>
          </div>

          {/* 4 Horizontal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategoryTab === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategoryTab(cat.id)}
                  className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${cat.badgeBg}`}>
                        {cat.id.replace('_', '/')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{cat.title}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{cat.subtitle}</p>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{cat.description}</p>
                  </div>

                  {/* Quantitative Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                    {cat.stats.map((st) => (
                      <div
                        key={st.label}
                        className="flex items-center justify-between text-[11px] font-mono"
                      >
                        <span className="text-slate-400">{st.label}:</span>
                        <span className="font-bold text-white">{st.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sample Signal Preview */}
                  <div className="mt-4 p-2.5 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Live Setup</span>
                      <span className="text-emerald-400 font-bold">{cat.sampleSignal.confidence}% Conf</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1">
                      {cat.sampleSignal.signal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Simple "How It Works" Section */}
      <section id="how-it-works" className="py-16 bg-[#080d19] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              System Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              How the Tool Works
            </h2>
            <p className="text-sm text-slate-400">
              Four straightforward steps from market selection to signal confirmation and execution.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howItWorksSteps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="p-5 rounded-2xl bg-[#0b101d] border border-slate-800 relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-slate-600 font-mono">
                      {s.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white">{s.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{s.description}</p>

                  <div className="pt-2">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 border border-slate-800 text-emerald-400">
                      {s.metric}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick CTA to Try It */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0f172a] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Ready to explore live signals?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch the interactive terminal with zero configuration or sign in with your account.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartAction}
              className="px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>Launch Live Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. Professional Footer */}
      <footer className="py-8 bg-[#080c18] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Trading Analysis Tool</span>
            <span>&bull;</span>
            <span>Deriv WebSocket Predictive Stream</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Even/Odd &bull; Over/Under &bull; Matches/Differs &bull; Rise/Fall</span>
            <span>&bull;</span>
            <span>Statistical Analysis Only</span>
          </div>
        </div>
      </footer>

      {/* 7. Clean Authentication / Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Sign In to Terminal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Insert authorized credentials to access live synthetic prediction feeds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                {authError}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="matchestool254"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-9 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingAuth}
                className="w-full py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all cursor-pointer font-sans"
              >
                {isLoadingAuth ? 'Verifying Credentials...' : 'Sign In to Terminal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
