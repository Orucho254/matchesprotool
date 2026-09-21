import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DerivMarketItem,
  ToolType,
  MarketCategory,
  SignalHistoryItem,
  TradingWindowDuration,
  OverLevel,
  MarketSignalAlert,
  SignalFilterOption,
  User,
} from './types';
import { generateInitialMarketData } from './data/markets';
import { derivWs } from './services/derivWsService';
import { marketSignalAlertService } from './services/marketSignalAlertService';
import { soundService } from './utils/audio';
import { authService } from './services/authService';

import { TopNav } from './components/TopNav';
import { ToolHeader } from './components/ToolHeader';
import { MarketGrid } from './components/MarketGrid';
import { MarketModal } from './components/MarketModal';
import { LiveScanner } from './components/LiveScanner';
import { SignalHistory } from './components/SignalHistory';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';

export function App() {
  // 0. Authentication State & View Mode ('LOGIN' | 'LANDING' | 'TERMINAL')
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getAuthState().user);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  // Default to LOGIN if unauthenticated; direct to TERMINAL if valid session already exists
  const [currentView, setCurrentView] = useState<'LOGIN' | 'LANDING' | 'TERMINAL'>(() => {
    const auth = authService.getAuthState();
    return auth.isAuthenticated && auth.user && !authService.isSessionExpired() ? 'TERMINAL' : 'LOGIN';
  });

  // Sync auth state with authService
  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setCurrentUser(state.user);
      if (!state.isAuthenticated) {
        setCurrentView((prev) => (prev === 'TERMINAL' ? 'LOGIN' : prev));
      }
    });
    return unsub;
  }, []);

  // Continuous session expiration check & user interaction heartbeat
  useEffect(() => {
    const sessionInterval = setInterval(() => {
      if (currentUser && authService.isSessionExpired()) {
        authService.logout();
        setCurrentUser(null);
        setSessionExpiredNotice('Your session has expired for security. Please log in again.');
        setCurrentView('LOGIN');
      }
    }, 10000);

    const handleUserTouch = () => {
      authService.touchSession();
    };

    window.addEventListener('mousemove', handleUserTouch, { passive: true });
    window.addEventListener('keydown', handleUserTouch, { passive: true });
    window.addEventListener('click', handleUserTouch, { passive: true });

    return () => {
      clearInterval(sessionInterval);
      window.removeEventListener('mousemove', handleUserTouch);
      window.removeEventListener('keydown', handleUserTouch);
      window.removeEventListener('click', handleUserTouch);
    };
  }, [currentUser]);

  // 1. Tool Selection (Default: Even/Odd)
  const [currentTool, setCurrentTool] = useState<ToolType>('EVEN_ODD');
  const [selectedOverLevel, setSelectedOverLevel] = useState<OverLevel | null>(null);

  // 2. Category, Signal Quality & Search Filtering
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('ALL');
  const [signalFilter, setSignalFilter] = useState<SignalFilterOption>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Markets Data State
  const [markets, setMarkets] = useState<DerivMarketItem[]>(() =>
    generateInitialMarketData('EVEN_ODD')
  );
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 4. Real-time Multi-Market Continuous Signal Alerts State
  const [allActiveAlerts, setAllActiveAlerts] = useState<MarketSignalAlert[]>([]);

  // 5. Signal Monitoring & Prediction History
  const [history, setHistory] = useState<SignalHistoryItem[]>([]);
  const [tradingWindow, setTradingWindow] = useState<TradingWindowDuration>(60);
  const [showHistory, setShowHistory] = useState<boolean>(true);

  // 6. Modal Deep Dive
  const [selectedMarketModal, setSelectedMarketModal] = useState<DerivMarketItem | null>(null);

  // Initialize Deriv WebSocket & Live Stream Engine
  useEffect(() => {
    derivWs.init(markets, currentTool);

    const unsubTicks = derivWs.onTicks((updatedMarkets) => {
      setMarkets(updatedMarkets);

      // Keep active modal in sync with latest real-time ticks
      if (selectedMarketModal) {
        const found = updatedMarkets.find((m) => m.symbol === selectedMarketModal.symbol);
        if (found) setSelectedMarketModal(found);
      }
    });

    const unsubConn = derivWs.onConnection((conn) => {
      setIsConnected(conn);
    });

    const unsubHistory = derivWs.onHistory((updatedHistory) => {
      setHistory(updatedHistory);
    });

    // Subscribe to active alerts changes (for category badge counts, without any pop up message)
    const unsubActiveAlerts = marketSignalAlertService.onActiveAlertsChange((allAlerts) => {
      setAllActiveAlerts(allAlerts);
    });

    return () => {
      unsubTicks();
      unsubConn();
      unsubHistory();
      unsubActiveAlerts();
      derivWs.destroy();
    };
  }, []);

  // When user switches tool tab
  const handleSelectTool = useCallback(
    (tool: ToolType) => {
      setCurrentTool(tool);
      derivWs.setToolType(tool);
      marketSignalAlertService.setCurrentTool(tool);
      if (soundEnabled) {
        soundService.playSignalAlert();
      }
    },
    [soundEnabled]
  );

  // Select Over 1–8 level filter
  const handleSelectOverLevel = useCallback(
    (level: OverLevel | null) => {
      setSelectedOverLevel(level);
      derivWs.setSelectedOverLevel(level);
      if (soundEnabled) {
        soundService.playSuccessSound();
      }
    },
    [soundEnabled]
  );

  // Change Trading Window Duration (40s - 60s)
  const handleChangeTradingWindow = (duration: TradingWindowDuration) => {
    setTradingWindow(duration);
    derivWs.setTradingWindowDuration(duration);
    if (soundEnabled) {
      soundService.playSuccessSound();
    }
  };

  // Toggle Sound alerts
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      soundService.playSuccessSound();
    }
  };

  // Force re-seed / refresh all markets
  const handleRefreshAll = () => {
    const fresh = generateInitialMarketData(currentTool);
    setMarkets(fresh);
    derivWs.init(fresh, currentTool);
    if (soundEnabled) {
      soundService.playSignalAlert();
    }
  };

  // Clear signal log history
  const handleClearHistory = () => {
    derivWs.clearHistory();
    setHistory([]);
  };

  const handleSwitchTerminalTool = useCallback(
    (toolType: ToolType) => {
      setCurrentTool(toolType);
      derivWs.setToolType(toolType);
      if (soundEnabled) {
        soundService.playSuccessSound();
      }
    },
    [soundEnabled]
  );

  // Compute active high-probability signals across active markets
  const activeSignalsCount = useMemo(() => {
    return markets.filter((m) => {
      const pred = m.prediction;
      return pred && pred.confidence >= 80;
    }).length;
  }, [markets]);

  // Compute live signals count per category for horizontal category badges
  const categorySignalCounts = useMemo(() => {
    const counts = {
      EVEN_ODD: 0,
      OVER_UNDER: 0,
      MATCHES: 0,
      RISE_FALL: 0,
    };

    // Tally trade-ready signals from current markets state
    markets.forEach((m) => {
      if (m.prediction && m.prediction.isTradeReady && m.prediction.confidence >= 85) {
        if (currentTool === 'EVEN_ODD') counts.EVEN_ODD++;
        else if (currentTool === 'OVER_UNDER') counts.OVER_UNDER++;
        else if (currentTool === 'MATCHES') counts.MATCHES++;
        else if (currentTool === 'RISE_FALL') counts.RISE_FALL++;
      }
    });

    // Merge in active alerts detected across background scans
    allActiveAlerts.forEach((alert) => {
      if (alert.contractType === 'EVEN_ODD') counts.EVEN_ODD = Math.max(counts.EVEN_ODD, 1);
      if (alert.contractType === 'OVER_UNDER') counts.OVER_UNDER = Math.max(counts.OVER_UNDER, 1);
      if (alert.contractType === 'MATCHES') counts.MATCHES = Math.max(counts.MATCHES, 1);
      if (alert.contractType === 'RISE_FALL') counts.RISE_FALL = Math.max(counts.RISE_FALL, 1);
    });

    return counts;
  }, [markets, currentTool, allActiveAlerts]);

  // Filter markets by synthetic category, search term, and signal filter
  const filteredMarkets = useMemo(() => {
    let list = markets.filter((market) => {
      // 1. Synthetic Market Category Filter
      if (selectedCategory !== 'ALL' && market.category !== selectedCategory) {
        return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = market.displayName.toLowerCase().includes(q);
        const matchesSymbol = market.symbol.toLowerCase().includes(q);
        return matchesName || matchesSymbol;
      }
      return true;
    });

    // 3. Signal Quality Filtering (Trade Ready, High Confidence, Active Window)
    if (signalFilter === 'TRADE_READY') {
      list = list.filter((m) => m.prediction?.isTradeReady && m.prediction.confidence >= 85);
    } else if (signalFilter === 'HIGH_CONFIDENCE') {
      list = list.filter((m) => m.prediction?.confidence >= 90);
    } else if (signalFilter === 'ACTIVE_SIGNALS') {
      list = list.filter(
        (m) => m.scanState === 'SIGNAL_ACTIVE' || m.scanState === 'MARKET_CHANGING'
      );
    }

    return list;
  }, [markets, selectedCategory, searchQuery, signalFilter]);

  // If on Login Page or if unauthenticated user attempts to view Terminal:
  if (currentView === 'LOGIN' || (!currentUser && currentView === 'TERMINAL')) {
    return (
      <LoginPage
        sessionExpiredNotice={sessionExpiredNotice}
        onLoginSuccess={() => {
          const auth = authService.getAuthState();
          setCurrentUser(auth.user);
          setSessionExpiredNotice(null);
          setCurrentView('TERMINAL');
        }}
        onViewLanding={() => {
          setSessionExpiredNotice(null);
          setCurrentView('LANDING');
        }}
      />
    );
  }

  // If on Landing Page, render the modern professional landing portal
  if (currentView === 'LANDING') {
    return (
      <LandingPage
        onGetStarted={() => {
          if (currentUser) {
            setCurrentView('TERMINAL');
          } else {
            setCurrentView('LOGIN');
          }
        }}
        onOpenLogin={() => {
          setCurrentView('LOGIN');
        }}
        onLoginSuccess={() => {
          const auth = authService.getAuthState();
          setCurrentUser(auth.user);
          setCurrentView('TERMINAL');
        }}
      />
    );
  }

  // Fallback protection: Never render terminal without valid user authentication
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          const auth = authService.getAuthState();
          setCurrentUser(auth.user);
          setCurrentView('TERMINAL');
        }}
        onViewLanding={() => setCurrentView('LANDING')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Top Navigation Bar */}
      <TopNav
        currentTool={currentTool}
        onSelectTool={handleSelectTool}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onRefreshAll={handleRefreshAll}
        marketCount={markets.length}
        activeSignalsCount={activeSignalsCount}
        tradingWindow={tradingWindow}
        onChangeTradingWindow={handleChangeTradingWindow}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory((prev) => !prev)}
        historyCount={history.length}
        currentUser={currentUser}
        onLogout={() => {
          authService.logout();
          setCurrentUser(null);
          setSessionExpiredNotice('You have logged out securely.');
          setCurrentView('LOGIN');
        }}
        onViewLanding={() => setCurrentView('LANDING')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 2. Headline & Subtitle */}
        <ToolHeader
          currentTool={currentTool}
          onSelectTool={handleSelectTool}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalMarkets={markets.length}
          totalFilteredMarkets={filteredMarkets.length}
          selectedOverLevel={selectedOverLevel}
          onSelectOverLevel={handleSelectOverLevel}
          signalFilter={signalFilter}
          onSignalFilterChange={setSignalFilter}
          categorySignalCounts={categorySignalCounts}
        />

        {/* 3. Main Display: Either Live Scanner Matrix or Full Market Grid */}
        {currentTool === 'SCANNER' ? (
          <LiveScanner
            markets={filteredMarkets}
            onOpenModal={setSelectedMarketModal}
            onSwitchTool={handleSelectTool}
          />
        ) : (
          <MarketGrid
            markets={filteredMarkets}
            toolType={currentTool}
            onOpenModal={setSelectedMarketModal}
          />
        )}

        {/* 4. Live Prediction & Signal Audit History Log */}
        {showHistory && (
          <SignalHistory
            history={history}
            onClearHistory={handleClearHistory}
            className="mt-8"
          />
        )}
      </main>

      {/* 5. Footer */}
      <footer className="border-t border-slate-900 bg-[#080c18] py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Deriv Real-Time Predictive Analysis Engine &bull; Live Deriv WS Stream</span>
          <div className="flex items-center gap-3">
            <span>Algorithmic Probability &amp; Pattern Recognition</span>
            <span>&bull;</span>
            <span>Educational &amp; statistical analysis only</span>
          </div>
        </div>
      </footer>

      {/* 6. Deep-Dive Modal */}
      <MarketModal
        market={selectedMarketModal}
        toolType={currentTool}
        onClose={() => setSelectedMarketModal(null)}
      />
    </div>
  );
}

export default App;
