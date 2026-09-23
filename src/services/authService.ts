import { User, AuthState, LoginCredentials } from '../types';

const STORAGE_SESSION_KEY = 'quantum_deriv_session_v5';
const STORAGE_LOCKOUT_KEY = 'quantum_deriv_lockout_v5';

// 4 Hours total session validity; 45 minutes inactivity limit
const SESSION_INACTIVITY_LIMIT_MS = 45 * 60 * 1000;

interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
  lastActiveAt: number;
}

interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

// Sanitize user inputs to prevent injection attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML/script tags
    .replace(/['";\\]/g, '') // strip SQL/shell punctuation
    .trim();
}

// Client-side fallback authorized accounts (used if server is temporarily unreachable)
const AUTHORIZED_FALLBACK_ACCOUNTS: Record<string, { role: 'PRO_TRADER' | 'ADMIN' | 'TRADER'; email: string }> = {
  'matchestool254': { role: 'PRO_TRADER', email: 'matchestool254@trading-analysis.internal' },
  'matchestool1254': { role: 'PRO_TRADER', email: 'matchestool1254@trading-analysis.internal' },
  'matchestool': { role: 'PRO_TRADER', email: 'matchestool@trading-analysis.internal' },
  'janetmoraa2328@gmail.com': { role: 'PRO_TRADER', email: 'janetmoraa2328@gmail.com' },
  'janetmoraa': { role: 'PRO_TRADER', email: 'janetmoraa2328@gmail.com' },
  'admin': { role: 'ADMIN', email: 'admin@trading-analysis.internal' },
};
const AUTHORIZED_FALLBACK_PASSWORDS = ['tool911', 'tool911!'];

class AuthService {
  private listeners: ((auth: AuthState) => void)[] = [];
  private currentAuthState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    sessionExpiresAt: undefined,
    lastActiveAt: undefined,
  };

  constructor() {
    // Clean up any legacy localStorage keys that may have held local hashes
    try {
      localStorage.removeItem('quantum_deriv_users_v4');
      localStorage.removeItem('quantum_deriv_users_v3');
    } catch {
      // ignore
    }
    this.restoreSession();
  }

  // Get client-side lockout display info
  public getLockoutInfo(username: string): { isLocked: boolean; remainingSec: number; attempts: number } {
    try {
      const key = `${STORAGE_LOCKOUT_KEY}_${username.toLowerCase().trim()}`;
      const raw = localStorage.getItem(key);
      if (!raw) return { isLocked: false, remainingSec: 0, attempts: 0 };

      const record: LockoutRecord = JSON.parse(raw);
      if (record.lockedUntil && record.lockedUntil > Date.now()) {
        const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
        return { isLocked: true, remainingSec, attempts: record.failedAttempts };
      }
      return { isLocked: false, remainingSec: 0, attempts: record.failedAttempts };
    } catch {
      return { isLocked: false, remainingSec: 0, attempts: 0 };
    }
  }

  public setLockout(username: string, remainingSec: number): void {
    try {
      const key = `${STORAGE_LOCKOUT_KEY}_${username.toLowerCase().trim()}`;
      const record: LockoutRecord = {
        failedAttempts: 5,
        lockedUntil: Date.now() + remainingSec * 1000,
        lastAttemptAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // ignore
    }
  }

  public clearLockout(username: string): void {
    try {
      const key = `${STORAGE_LOCKOUT_KEY}_${username.toLowerCase().trim()}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // Restore existing session from localStorage and verify with server
  public restoreSession(): AuthState {
    try {
      const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!rawSession) {
        this.currentAuthState = { isAuthenticated: false, user: null, token: null };
        return this.currentAuthState;
      }

      const session: StoredSession = JSON.parse(rawSession);
      const now = Date.now();

      // Check max lifetime and inactivity timeout
      if (
        !session ||
        !session.token ||
        !session.expiresAt ||
        session.expiresAt < now ||
        (session.lastActiveAt && now - session.lastActiveAt > SESSION_INACTIVITY_LIMIT_MS)
      ) {
        this.logout();
        return this.currentAuthState;
      }

      // Update last active time
      session.lastActiveAt = now;
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }

      this.currentAuthState = {
        isAuthenticated: true,
        user: session.user,
        token: session.token,
        sessionExpiresAt: session.expiresAt,
        lastActiveAt: now,
      };

      // Asynchronously verify token with server (only invalidate if server explicitly reports 401)
      if (!session.token.startsWith('client_sec_')) {
        fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })
          .then((res) => {
            if (res.status === 401) {
              this.logout();
            }
          })
          .catch(() => {
            // Server offline or network hiccup; keep current valid session
          });
      }

      return this.currentAuthState;
    } catch {
      this.currentAuthState = { isAuthenticated: false, user: null, token: null };
      return this.currentAuthState;
    }
  }

  // Refresh user activity timestamp
  public touchSession(): void {
    if (!this.currentAuthState.isAuthenticated) return;
    try {
      const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!rawSession) return;
      const session: StoredSession = JSON.parse(rawSession);
      session.lastActiveAt = Date.now();
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      this.currentAuthState.lastActiveAt = session.lastActiveAt;
    } catch {
      // ignore
    }
  }

  public isSessionExpired(): boolean {
    if (!this.currentAuthState.isAuthenticated) return true;
    const now = Date.now();
    if (this.currentAuthState.sessionExpiresAt && now > this.currentAuthState.sessionExpiresAt) {
      return true;
    }
    if (
      this.currentAuthState.lastActiveAt &&
      now - this.currentAuthState.lastActiveAt > SESSION_INACTIVITY_LIMIT_MS
    ) {
      return true;
    }
    return false;
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  public subscribe(listener: (auth: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentAuthState);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentAuthState));
  }

  // Login via server-side verification with resilient authorized fallback
  public async login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; user?: User; error?: string; isLocked?: boolean; remainingSec?: number }> {
    const { username, password } = credentials;

    if (!username || !username.trim()) {
      return { success: false, error: 'Please enter your username.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const cleanUsername = sanitizeInput(username);
    const normalizedUsername = cleanUsername.toLowerCase().trim();

    // Check local client-side lockout record first
    const localLockout = this.getLockoutInfo(cleanUsername);
    if (localLockout.isLocked) {
      return {
        success: false,
        error: `Account temporarily locked due to repeated failed login attempts. Please wait ${localLockout.remainingSec}s before retrying.`,
        isLocked: true,
        remainingSec: localLockout.remainingSec,
      };
    }

    let networkFailed = false;
    let serverResponse: Response | null = null;
    let data: any = null;

    try {
      serverResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      });

      const contentType = serverResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await serverResponse.json();
      } else {
        networkFailed = true;
      }
    } catch {
      networkFailed = true;
    }

    // Path A: Server responded with valid JSON
    if (!networkFailed && serverResponse && data) {
      if (!serverResponse.ok || !data.success) {
        if (data.isLocked && data.remainingSec) {
          this.setLockout(cleanUsername, data.remainingSec);
        }
        return {
          success: false,
          error: data.error || 'Access denied: Invalid credentials. You must insert correct credentials.',
          isLocked: data.isLocked,
          remainingSec: data.remainingSec,
        };
      }

      // Success via server: clear lockout
      this.clearLockout(cleanUsername);

      const userObj: User = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        createdAt: data.user.createdAt,
        lastLogin: new Date().toISOString(),
      };

      const now = Date.now();
      const expiresAt = data.expiresAt || now + 4 * 60 * 60 * 1000;

      const session: StoredSession = {
        token: data.token,
        user: userObj,
        expiresAt,
        lastActiveAt: now,
      };

      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Could not save session', e);
      }

      this.currentAuthState = {
        isAuthenticated: true,
        user: userObj,
        token: data.token,
        sessionExpiresAt: expiresAt,
        lastActiveAt: now,
      };
      this.notify();

      return { success: true, user: userObj };
    }

    // Path B: Server unreachable / network failed / static build environment
    // Fallback: Check credentials locally against authorized list
    const fallbackAccount = AUTHORIZED_FALLBACK_ACCOUNTS[normalizedUsername];
    const isAuthorizedPassword = AUTHORIZED_FALLBACK_PASSWORDS.includes(password.trim());

    if (fallbackAccount && isAuthorizedPassword) {
      this.clearLockout(cleanUsername);

      const userObj: User = {
        id: `usr_${normalizedUsername.replace(/[^a-zA-Z0-9]/g, '_')}`,
        username: normalizedUsername,
        email: fallbackAccount.email,
        role: fallbackAccount.role,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastLogin: new Date().toISOString(),
      };

      const now = Date.now();
      const expiresAt = now + 4 * 60 * 60 * 1000;
      const clientToken = `client_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

      const session: StoredSession = {
        token: clientToken,
        user: userObj,
        expiresAt,
        lastActiveAt: now,
      };

      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Could not save session', e);
      }

      this.currentAuthState = {
        isAuthenticated: true,
        user: userObj,
        token: clientToken,
        sessionExpiresAt: expiresAt,
        lastActiveAt: now,
      };
      this.notify();

      return { success: true, user: userObj };
    }

    // If fallback credentials do not match, record attempt and return clear invalid credential message
    const failRecord = this.getLockoutInfo(cleanUsername);
    const newAttempts = failRecord.attempts + 1;
    if (newAttempts >= 5) {
      this.setLockout(cleanUsername, 120);
      return {
        success: false,
        error: 'Account temporarily locked due to repeated failed login attempts. Please wait 120s before retrying.',
        isLocked: true,
        remainingSec: 120,
      };
    } else {
      try {
        const key = `${STORAGE_LOCKOUT_KEY}_${cleanUsername.toLowerCase().trim()}`;
        localStorage.setItem(
          key,
          JSON.stringify({ failedAttempts: newAttempts, lockedUntil: null, lastAttemptAt: Date.now() })
        );
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      error: 'Access denied: Invalid credentials. You must insert correct credentials.',
    };
  }

  // Logout & invalidate session both locally and on server
  public async logout(): Promise<void> {
    const token = this.currentAuthState.token;
    if (token) {
      try {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // ignore
    }

    this.currentAuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpiresAt: undefined,
      lastActiveAt: undefined,
    };
    this.notify();
  }
}

export const authService = new AuthService();
