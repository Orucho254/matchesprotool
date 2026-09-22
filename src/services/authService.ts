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

      // Asynchronously verify token with server
      fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            this.logout();
          }
        })
        .catch(() => {
          // Network hiccup; keep current state unless expired
        });

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

  // Login strictly via server-side verification
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

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
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

      // Success: clear lockout
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
    } catch (err) {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check your network connection.',
      };
    }
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
