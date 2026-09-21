import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';

const STORAGE_USERS_KEY = 'quantum_deriv_users_v4';
const STORAGE_SESSION_KEY = 'quantum_deriv_session_v4';
const STORAGE_LOCKOUT_KEY = 'quantum_deriv_lockout_v4';

// 4 Hours total session validity; 45 minutes inactivity timeout
const SESSION_MAX_LIFETIME_MS = 4 * 60 * 60 * 1000;
const SESSION_INACTIVITY_LIMIT_MS = 45 * 60 * 1000;

// Max failed login attempts before lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes lockout

// Strong Cryptographic Hashing using PBKDF2 with SHA-256 (100,000 iterations)
export async function hashPassword(password: string, salt: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const saltBytes = enc.encode(salt);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    );
    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Cryptographic fallback using direct SHA-256 if PBKDF2 deriveBits is restricted
    const enc = new TextEncoder();
    const data = enc.encode(salt + '::QUANTUM_HMAC_SALT_2026::' + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// Generate random cryptographic salt (128-bit)
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate secure random session token (256-bit entropy)
export function generateSessionToken(username: string): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const timestamp = Date.now();
  return btoa(`${username}:${timestamp}:${randomHex}`);
}

// Sanitize user inputs to prevent injection attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML/script tags
    .replace(/['";\\]/g, '') // strip SQL/shell punctuation
    .trim();
}

interface StoredUserAccount {
  id: string;
  username: string;
  email?: string;
  role: 'TRADER' | 'PRO_TRADER' | 'ADMIN';
  salt: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
}

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

// Pre-seed verified system account with PBKDF2 hashed password
async function initUserDatabase(): Promise<StoredUserAccount[]> {
  const defaultSalt = '8a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d';
  const defaultHash = await hashPassword('tool911', defaultSalt);

  const initialUsers: StoredUserAccount[] = [
    {
      id: 'usr_matchestool254',
      username: 'matchestool254',
      email: 'matchestool254@trading-analysis.tool',
      role: 'PRO_TRADER',
      salt: defaultSalt,
      passwordHash: defaultHash,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
  ];

  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Guarantee matchestool254 is always present with the exact correct password hash
        const userIndex = parsed.findIndex(
          (u: StoredUserAccount) => u.username.toLowerCase() === 'matchestool254'
        );
        if (userIndex >= 0) {
          parsed[userIndex].passwordHash = defaultHash;
          parsed[userIndex].salt = defaultSalt;
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(parsed));
          return parsed;
        } else {
          parsed.unshift(initialUsers[0]);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Error reading user database', e);
  }

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initialUsers));
  } catch (e) {
    console.error('Could not seed default user', e);
  }

  return initialUsers;
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
    this.restoreSession();
  }

  // Get current lockout info for a username or overall client
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

  // Record a failed login attempt with brute force lockout check
  private recordFailedAttempt(username: string): { isLocked: boolean; remainingSec: number } {
    const key = `${STORAGE_LOCKOUT_KEY}_${username.toLowerCase().trim()}`;
    let record: LockoutRecord = { failedAttempts: 0, lockedUntil: null, lastAttemptAt: Date.now() };

    try {
      const raw = localStorage.getItem(key);
      if (raw) record = JSON.parse(raw);
    } catch {
      // ignore
    }

    record.failedAttempts += 1;
    record.lastAttemptAt = Date.now();

    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      try {
        localStorage.setItem(key, JSON.stringify(record));
      } catch {
        // ignore
      }
      const remainingSec = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      return { isLocked: true, remainingSec };
    }

    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // ignore
    }

    return { isLocked: false, remainingSec: 0 };
  }

  // Clear failed attempts counter upon successful login
  private clearFailedAttempts(username: string): void {
    try {
      const key = `${STORAGE_LOCKOUT_KEY}_${username.toLowerCase().trim()}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // Restore existing session from localStorage if valid
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
      return this.currentAuthState;
    } catch {
      this.currentAuthState = { isAuthenticated: false, user: null, token: null };
      return this.currentAuthState;
    }
  }

  // Refresh user activity timestamp to prevent premature inactivity timeout
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

  // Check if session has expired
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

  // Login with Username & Password
  public async login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; user?: User; error?: string; isLocked?: boolean; remainingSec?: number }> {
    const { username, password } = credentials;

    if (!username || !username.trim()) {
      return { success: false, error: 'Please enter your registered username.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const cleanUsername = sanitizeInput(username).toLowerCase();

    // 1. Check for active brute-force lockout
    const lockout = this.getLockoutInfo(cleanUsername);
    if (lockout.isLocked) {
      return {
        success: false,
        error: `Account temporarily locked due to repeated failed login attempts. Please wait ${lockout.remainingSec}s before retrying.`,
        isLocked: true,
        remainingSec: lockout.remainingSec,
      };
    }

    const users = await initUserDatabase();
    const matchedUser = users.find((u) => u.username.toLowerCase() === cleanUsername);

    // 2. Mitigate timing attacks: if user not found, perform dummy PBKDF2 hash calculation
    if (!matchedUser) {
      await hashPassword('dummy_password_timing_mitigation', '7c9f4d1e2b8a05c6e3f1947265a8d9b0');
      const failInfo = this.recordFailedAttempt(cleanUsername);
      if (failInfo.isLocked) {
        return {
          success: false,
          error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Please wait ${failInfo.remainingSec}s.`,
          isLocked: true,
          remainingSec: failInfo.remainingSec,
        };
      }
      return {
        success: false,
        error: 'Access denied: Invalid credentials. You must insert the correct username and password to log in.',
      };
    }

    // 3. Verify hashed password using PBKDF2
    const computedHash = await hashPassword(password, matchedUser.salt);
    if (computedHash !== matchedUser.passwordHash) {
      const failInfo = this.recordFailedAttempt(cleanUsername);
      if (failInfo.isLocked) {
        return {
          success: false,
          error: `Account temporarily locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Please wait ${failInfo.remainingSec}s before retrying.`,
          isLocked: true,
          remainingSec: failInfo.remainingSec,
        };
      }
      const attemptsLeft = MAX_FAILED_ATTEMPTS - (lockout.attempts + 1);
      return {
        success: false,
        error: `Access denied: Incorrect password. You must enter the correct credentials to log in. ${attemptsLeft > 0 ? `(${attemptsLeft} attempt(s) remaining)` : ''}`,
      };
    }

    // 4. Success: clear lockout
    this.clearFailedAttempts(cleanUsername);

    // Update last login
    matchedUser.lastLogin = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }

    const token = generateSessionToken(matchedUser.username);
    const userObj: User = {
      id: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      createdAt: matchedUser.createdAt,
      lastLogin: matchedUser.lastLogin,
    };

    const now = Date.now();
    const expiresAt = now + SESSION_MAX_LIFETIME_MS;

    const session: StoredSession = {
      token,
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
      token,
      sessionExpiresAt: expiresAt,
      lastActiveAt: now,
    };
    this.notify();

    return { success: true, user: userObj };
  }

  // Register a new Account
  public async register(
    credentials: RegisterCredentials
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const { username, password, confirmPassword, email } = credentials;

    const cleanUsername = sanitizeInput(username || '');
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return {
        success: false,
        error: 'Username can only contain alphanumeric characters, underscores, and hyphens.',
      };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match. Please retype carefully.' };
    }

    const users = await initUserDatabase();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return {
        success: false,
        error: `Username "${cleanUsername}" is already registered. Please choose another username or sign in.`,
      };
    }

    // Generate cryptographic salt and derive PBKDF2 hash
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const now = new Date().toISOString();

    const newUser: StoredUserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: email?.trim() ? sanitizeInput(email) : `${cleanUsername.toLowerCase()}@trader.internal`,
      role: 'TRADER',
      salt,
      passwordHash,
      createdAt: now,
      lastLogin: now,
    };

    users.push(newUser);
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save new user', e);
    }

    // Automatically authenticate the newly registered user
    const token = generateSessionToken(newUser.username);
    const userObj: User = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
      lastLogin: newUser.lastLogin,
    };

    const currentTime = Date.now();
    const expiresAt = currentTime + SESSION_MAX_LIFETIME_MS;

    const session: StoredSession = {
      token,
      user: userObj,
      expiresAt,
      lastActiveAt: currentTime,
    };

    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    this.currentAuthState = {
      isAuthenticated: true,
      user: userObj,
      token,
      sessionExpiresAt: expiresAt,
      lastActiveAt: currentTime,
    };
    this.notify();

    return { success: true, user: userObj };
  }

  // Default System Login
  public async loginAsDemo(): Promise<{ success: boolean; user?: User; error?: string }> {
    return this.login({ username: 'matchestool254', password: 'tool911' });
  }

  public async loginDefault(): Promise<{ success: boolean; user?: User; error?: string }> {
    return this.login({ username: 'matchestool254', password: 'tool911' });
  }

  // Logout & invalidate session
  public logout(): void {
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
