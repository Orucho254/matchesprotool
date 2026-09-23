import crypto from 'crypto';

export interface ServerUser {
  id: string;
  username: string;
  email: string;
  role: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionData {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  };
  expiresAt: number;
}

export function hashPasswordNode(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

// Server-side credential salt
export const AUTHORIZED_SALT =
  process.env.AUTH_SALT ||
  crypto
    .createHash('sha256')
    .update(process.env.APPLET_ID || 'deriv_quantum_secure_salt_v1')
    .digest('hex');

export const AUTHORIZED_HASH = hashPasswordNode('tool911', AUTHORIZED_SALT);

export const serverUsers: ServerUser[] = [
  {
    id: 'usr_matchestool254',
    username: 'matchestool254',
    email: 'matchestool254@trading-analysis.internal',
    role: 'PRO_TRADER',
    salt: AUTHORIZED_SALT,
    passwordHash: AUTHORIZED_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_matchestool1254',
    username: 'matchestool1254',
    email: 'matchestool1254@trading-analysis.internal',
    role: 'PRO_TRADER',
    salt: AUTHORIZED_SALT,
    passwordHash: AUTHORIZED_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_matchestool',
    username: 'matchestool',
    email: 'matchestool@trading-analysis.internal',
    role: 'PRO_TRADER',
    salt: AUTHORIZED_SALT,
    passwordHash: AUTHORIZED_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_janetmoraa',
    username: 'janetmoraa2328@gmail.com',
    email: 'janetmoraa2328@gmail.com',
    role: 'PRO_TRADER',
    salt: AUTHORIZED_SALT,
    passwordHash: AUTHORIZED_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@trading-analysis.internal',
    role: 'ADMIN',
    salt: AUTHORIZED_SALT,
    passwordHash: AUTHORIZED_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Active sessions memory store
export const activeTokens = new Map<string, SessionData>();

// Server-side Brute-force Rate Limiter
export interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}
export const lockoutStore = new Map<string, LockoutEntry>();
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export function checkLockout(identifier: string): { isLocked: boolean; remainingSec: number } {
  const entry = lockoutStore.get(identifier);
  if (!entry) return { isLocked: false, remainingSec: 0 };
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const remainingSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { isLocked: true, remainingSec };
  }
  return { isLocked: false, remainingSec: 0 };
}

export function recordFailure(identifier: string): { isLocked: boolean; remainingSec: number } {
  const entry = lockoutStore.get(identifier) || { failedAttempts: 0, lockedUntil: null, lastAttemptAt: Date.now() };
  entry.failedAttempts += 1;
  entry.lastAttemptAt = Date.now();
  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    lockoutStore.set(identifier, entry);
    return { isLocked: true, remainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }
  lockoutStore.set(identifier, entry);
  return { isLocked: false, remainingSec: 0 };
}

export function clearFailures(identifier: string) {
  lockoutStore.delete(identifier);
}

// Sanitization & Input Validation Helper
export function validateDigitsArray(digits: unknown): number[] | null {
  if (!Array.isArray(digits)) return null;
  const sanitized: number[] = [];
  const maxLen = Math.min(digits.length, 500);
  for (let i = 0; i < maxLen; i++) {
    const num = Number(digits[i]);
    if (Number.isInteger(num) && num >= 0 && num <= 9) {
      sanitized.push(num);
    }
  }
  return sanitized;
}

// Handler for Login Request
export function handleLoginRequest(body: any): { status: number; body: any } {
  const { username, password } = body || {};
  if (!username || !password) {
    return {
      status: 400,
      body: { error: 'Username and password are required' },
    };
  }

  const cleanUser = String(username).trim().toLowerCase();
  const lockout = checkLockout(cleanUser);
  if (lockout.isLocked) {
    return {
      status: 429,
      body: {
        error: `Account temporarily locked due to repeated failed login attempts. Please wait ${lockout.remainingSec}s before retrying.`,
        isLocked: true,
        remainingSec: lockout.remainingSec,
      },
    };
  }

  const user = serverUsers.find((u) => u.username.toLowerCase() === cleanUser);
  if (!user) {
    const fail = recordFailure(cleanUser);
    return {
      status: 401,
      body: {
        error: 'Access denied: Invalid credentials. You must insert correct credentials.',
        isLocked: fail.isLocked,
        remainingSec: fail.remainingSec,
      },
    };
  }

  const computed = hashPasswordNode(String(password), user.salt);
  if (computed !== user.passwordHash) {
    const fail = recordFailure(cleanUser);
    return {
      status: 401,
      body: {
        error: 'Access denied: Invalid credentials. You must insert correct credentials.',
        isLocked: fail.isLocked,
        remainingSec: fail.remainingSec,
      },
    };
  }

  // Success: clear lockout
  clearFailures(cleanUser);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
  const userPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  activeTokens.set(token, {
    user: userPayload,
    expiresAt,
  });

  return {
    status: 200,
    body: {
      success: true,
      token,
      user: userPayload,
      expiresAt,
    },
  };
}

// Handler for Session Verification
export function handleVerifyRequest(authHeader?: string): { status: number; body: any } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: 401, body: { authenticated: false } };
  }
  const token = authHeader.split(' ')[1];
  const session = activeTokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeTokens.delete(token);
    return { status: 401, body: { authenticated: false } };
  }
  return { status: 200, body: { authenticated: true, user: session.user } };
}

// Handler for Logout
export function handleLogoutRequest(authHeader?: string): { status: number; body: any } {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeTokens.delete(token);
  }
  return { status: 200, body: { success: true } };
}
