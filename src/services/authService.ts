import { User, AuthState, LoginCredentials } from '../types';

const STORAGE_SESSION_KEY = 'quantum_deriv_session_v5';
const STORAGE_LOCKOUT_KEY = 'quantum_deriv_lockout_v5';

// 4 Hours total session validity; 45 minutes inactivity limit
const SESSION_INACTIVITY_LIMIT_MS = 45 * 60 * 1000;

// Configurable API base URL: defaults to current origin ('') or custom VITE_API_URL
const envApiUrl =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_API_URL
    : '';
const API_BASE = (envApiUrl || '').replace(/\/+$/, '');
const LOGIN_URL = `${API_BASE}/api/auth/login`;
const VERIFY_URL = `${API_BASE}/api/auth/verify`;
const LOGOUT_URL = `${API_BASE}/api/auth/logout`;

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
    // Clean up any legacy localStorage keys
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

      // Asynchronously verify token with backend server
      if (session.token) {
        fetch(VERIFY_URL, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })
          .then((res) => {
            if (res.status === 401) {
              console.warn('[Auth] Server rejected stored session token; logging out');
              this.logout();
            }
          })
          .catch((err) => {
            console.debug('[Auth] Session verify connection error; preserving valid local session:', err);
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

  // Check if current session has exceeded maximum expiration or inactivity limit
  public isSessionExpired(): boolean {
    const { isAuthenticated, sessionExpiresAt, lastActiveAt } = this.currentAuthState;
    if (!isAuthenticated) return true;
    const now = Date.now();
    if (sessionExpiresAt && now > sessionExpiresAt) return true;
    if (lastActiveAt && now - lastActiveAt > SESSION_INACTIVITY_LIMIT_MS) return true;
    return false;
  }

  // Get current authentication state
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
      console.debug(`[Auth] Attempting login to: ${LOGIN_URL} for user: "${cleanUsername}"`);
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error(
          `[Auth] Server returned non-JSON content-type "${contentType}" with status ${response.status}:`,
          text.slice(0, 300)
        );
        return {
          success: false,
          error:
            response.status === 404
              ? `Authentication endpoint not found (HTTP 404 at ${LOGIN_URL}). Please verify backend server routing.`
              : `Authentication server returned unexpected response (HTTP ${response.status}). Please check server logs.`,
        };
      }

      if (!response.ok || !data.success) {
        console.warn(`[Auth] Login rejected by server (HTTP ${response.status}):`, data.error);
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
        console.error('[Auth] Could not persist session in localStorage:', e);
      }

      this.currentAuthState = {
        isAuthenticated: true,
        user: userObj,
        token: data.token,
        sessionExpiresAt: expiresAt,
        lastActiveAt: now,
      };
      this.notify();

      console.info(`[Auth] User authenticated successfully: ${userObj.username} (${userObj.role})`);
      return { success: true, user: userObj };
    } catch (err: any) {
      console.error('[Auth] Network or CORS failure during authentication fetch:', err);
      const isFailedFetch = err?.name === 'TypeError' && String(err?.message || '').toLowerCase().includes('fetch');
      return {
        success: false,
        error: isFailedFetch
          ? `Unable to connect to authentication server at ${LOGIN_URL}. Please verify the server is running, reachable, and CORS is enabled.`
          : `Authentication connection failure: ${err?.message || 'Network error'}. Please check your connection.`,
      };
    }
  }

  // Logout & invalidate session both locally and on server
  public async logout(): Promise<void> {
    const token = this.currentAuthState.token;
    if (token) {
      try {
        fetch(LOGOUT_URL, {
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
