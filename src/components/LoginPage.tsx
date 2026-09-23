import React, { useState, useEffect } from 'react';
import {
  Activity,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { authService } from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: () => void;
  sessionExpiredNotice?: string | null;
  onViewLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  sessionExpiredNotice,
  onViewLanding,
}) => {
  // Blank login credentials by default; authentication is handled securely on the server
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(sessionExpiredNotice || null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Lockout state
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on username change
  useEffect(() => {
    if (!username.trim()) {
      setLockoutRemaining(0);
      return;
    }
    const info = authService.getLockoutInfo(username);
    if (info.isLocked) {
      setLockoutRemaining(info.remainingSec);
    } else {
      setLockoutRemaining(0);
    }
  }, [username]);

  // Lockout timer countdown
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Handle Login - strictly verifies credentials
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      const res = await authService.login({ username, password });
      if (res.success) {
        setSuccessNotice('Authentication verified. Access granted.');
        setTimeout(() => {
          onLoginSuccess();
        }, 250);
      } else {
        if (res.isLocked && res.remainingSec) {
          setLockoutRemaining(res.remainingSec);
        }
        setErrorMessage(
          res.error || 'Access denied: Invalid credentials. You must insert the correct username and password.'
        );
      }
    } catch {
      setErrorMessage('A secure authentication error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Decorative Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="border-b border-slate-800/80 bg-[#0a0f1d]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                Trading Analysis Tool
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Secure Quantitative Derivative Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PBKDF2-SHA256 Encrypted</span>
          </div>

          {onViewLanding && (
            <button
              type="button"
              onClick={onViewLanding}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Public Overview &rarr;
            </button>
          )}
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 z-10">
        <div className="w-full max-w-md space-y-5">
          {/* Card Container */}
          <div className="rounded-2xl bg-[#0d1322] border border-slate-800/90 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            {/* Header / Security Badge */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected Access Zone</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Sign In to Analysis Tool
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter authorized credentials to access live synthetic market analysis.
              </p>
            </div>

            {/* Active Lockout Alert */}
            {lockoutRemaining > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs space-y-1 animate-pulse font-mono">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Brute-Force Protection Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Multiple failed login attempts detected. Account temporarily locked for{' '}
                  <strong className="text-white underline">{lockoutRemaining}s</strong>.
                </p>
              </div>
            )}

            {/* Session Expired / Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {successNotice && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successNotice}</div>
              </div>
            )}

            {/* Auth Form */}
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-slate-500 font-mono">Required</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-500 font-mono">Authorized Only</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || lockoutRemaining > 0}
                className="w-full py-3 text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : lockoutRemaining > 0 ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Locked ({lockoutRemaining}s)</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Analysis Tool</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Assurances Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
            <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>PBKDF2-SHA256 (100k rounds)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero Plaintext Storage</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Brute-Force Rate Limiting</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auto Inactivity Timeout</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono z-10">
        Trading Analysis Tool &bull; Secure Cryptographic Access Zone &bull; 256-Bit Session Tokens
      </footer>
    </div>
  );
};
