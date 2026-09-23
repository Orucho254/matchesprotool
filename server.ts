import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  serverCalculateDigitPredictionSignal,
  serverEvaluateEvenOddStrategy,
  serverEvaluateSmcStrategy,
  serverEvaluateOverStrategy,
  serverBatchComputePredictions,
} from './src/server/strategyEngine';

// Server-side user store with PBKDF2-SHA256 hashes
interface ServerUser {
  id: string;
  username: string;
  email: string;
  role: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

function hashPasswordNode(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

// Secure server-side credential store (environment-driven, never exposed to client)
const AUTHORIZED_SALT =
  process.env.AUTH_SALT ||
  crypto
    .createHash('sha256')
    .update(process.env.APPLET_ID || 'deriv_quantum_secure_salt_v1')
    .digest('hex');

const AUTHORIZED_HASH = hashPasswordNode('tool911', AUTHORIZED_SALT);

const serverUsers: ServerUser[] = [
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

interface SessionData {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  };
  expiresAt: number;
}

const activeTokens = new Map<string, SessionData>();

// Server-side Brute-force Rate Limiter
interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}
const lockoutStore = new Map<string, LockoutEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

function checkLockout(identifier: string): { isLocked: boolean; remainingSec: number } {
  const entry = lockoutStore.get(identifier);
  if (!entry) return { isLocked: false, remainingSec: 0 };
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const remainingSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { isLocked: true, remainingSec };
  }
  return { isLocked: false, remainingSec: 0 };
}

function recordFailure(identifier: string): { isLocked: boolean; remainingSec: number } {
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

function clearFailures(identifier: string) {
  lockoutStore.delete(identifier);
}

// Sanitization & Input Validation Helper
function validateDigitsArray(digits: unknown): number[] | null {
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

async function startServer() {
  const app = express();

  // Security: Remove X-Powered-By fingerprint
  app.disable('x-powered-by');

  // Dev server and API backend must listen on port 3000 (DEFAULT_APP_PORT) behind NGINX (which listens on 8080)
  const defaultPort = parseInt(process.env.DEFAULT_APP_PORT || process.env.APP_PORT || '3000', 10);
  let PORT = defaultPort;

  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const argPort = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(argPort)) PORT = argPort;
  }

  // Security Headers & Permissive CORS middleware for dev, preview and iframe environments
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Production Security Headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: wss:; frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;"
    );
    res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Global Sliding Window Rate Limiter & Abuse Protection
  const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 240; // 240 requests/minute per client IP

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = ipRequestCounts.get(rawIp);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
      ipRequestCounts.set(rawIp, record);
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS_PER_WINDOW) {
        const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfterSec.toString());
        return res.status(429).json({
          error: 'Rate limit exceeded: Too many requests. Please slow down.',
          retryAfterSec,
        });
      }
    }
    next();
  });

  // Body parser with size limits to prevent payload exhaustion
  app.use(express.json({ limit: '1mb' }));

  // Prevent source-file exposure or secret-file access
  app.use((req, res, next) => {
    const lowercaseUrl = req.url.toLowerCase();
    if (
      lowercaseUrl.includes('.env') ||
      lowercaseUrl.includes('server.ts') ||
      lowercaseUrl.endsWith('.map') ||
      lowercaseUrl.includes('.git')
    ) {
      return res.status(404).send('Not found');
    }
    next();
  });

  // Server-side Authentication Guard Middleware
  interface AuthenticatedRequest extends express.Request {
    user?: SessionData['user'];
  }

  const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required. Please provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const session = activeTokens.get(token);

    if (!session || session.expiresAt < Date.now()) {
      if (session) activeTokens.delete(token);
      return res.status(401).json({
        error: 'Unauthorized: Session expired or invalid. Please re-authenticate.',
      });
    }

    req.user = session.user;
    next();
  };

  // Lazy / ready Gemini AI client (server-side only)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Login Endpoint (Strictly server-side verified)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const lockout = checkLockout(cleanUser);
    if (lockout.isLocked) {
      return res.status(429).json({
        error: `Account temporarily locked due to repeated failed login attempts. Please wait ${lockout.remainingSec}s before retrying.`,
        isLocked: true,
        remainingSec: lockout.remainingSec,
      });
    }

    const user = serverUsers.find((u) => u.username.toLowerCase() === cleanUser);
    if (!user) {
      const fail = recordFailure(cleanUser);
      return res.status(401).json({
        error: 'Access denied: Invalid credentials. You must insert correct credentials.',
        isLocked: fail.isLocked,
        remainingSec: fail.remainingSec,
      });
    }

    const computed = hashPasswordNode(String(password), user.salt);
    if (computed !== user.passwordHash) {
      const fail = recordFailure(cleanUser);
      return res.status(401).json({
        error: 'Access denied: Invalid credentials. You must insert correct credentials.',
        isLocked: fail.isLocked,
        remainingSec: fail.remainingSec,
      });
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

    return res.json({
      success: true,
      token,
      user: userPayload,
      expiresAt,
    });
  });

  // Auth: Verify Session Endpoint
  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false });
    }
    const token = authHeader.split(' ')[1];
    const session = activeTokens.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) activeTokens.delete(token);
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: session.user });
  });

  // Auth: Logout Endpoint
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      activeTokens.delete(token);
    }
    return res.json({ success: true });
  });

  // ==========================================
  // Protected Proprietary Strategy Endpoints
  // ==========================================

  // 1. Protected Digit Prediction Signal
  app.post('/api/analysis/digit-signal', requireAuth, (req, res) => {
    try {
      const { market, activeToolType } = req.body;
      if (!market || !market.prediction) {
        return res.status(400).json({ error: 'Market data and prediction payload required' });
      }
      const signal = serverCalculateDigitPredictionSignal(market, activeToolType);
      return res.json({ success: true, signal });
    } catch {
      return res.status(500).json({ error: 'Failed to calculate digit prediction signal' });
    }
  });

  // 2. Protected Even / Odd Strategy Evaluation
  app.post('/api/analysis/even-odd', requireAuth, (req, res) => {
    try {
      const { recentDigits } = req.body;
      const validDigits = validateDigitsArray(recentDigits);
      if (!validDigits || validDigits.length === 0) {
        return res.status(400).json({ error: 'Valid recentDigits array (0-9) required' });
      }
      const analysis = serverEvaluateEvenOddStrategy(validDigits);
      return res.json({ success: true, analysis });
    } catch {
      return res.status(500).json({ error: 'Failed to evaluate Even/Odd strategy' });
    }
  });

  // 3. Protected SMC Rise / Fall Strategy Evaluation
  app.post('/api/analysis/smc', requireAuth, (req, res) => {
    try {
      const { candles, currentPrice, pipSize } = req.body;
      if (!Array.isArray(candles) || candles.length === 0 || typeof currentPrice !== 'number') {
        return res.status(400).json({ error: 'Valid candles array and numeric currentPrice required' });
      }
      const analysis = serverEvaluateSmcStrategy(candles.slice(-100), currentPrice, Number(pipSize) || 2);
      return res.json({ success: true, analysis });
    } catch {
      return res.status(500).json({ error: 'Failed to evaluate SMC Rise/Fall strategy' });
    }
  });

  // 4. Protected Over / Under Strategy Evaluation
  app.post('/api/analysis/over-under', requireAuth, (req, res) => {
    try {
      const { level, digits } = req.body;
      const numLevel = Number(level);
      if (!numLevel || numLevel < 1 || numLevel > 8) {
        return res.status(400).json({ error: 'Valid Over level (1-8) required' });
      }
      const validDigits = validateDigitsArray(digits);
      if (!validDigits) {
        return res.status(400).json({ error: 'Valid digits array required' });
      }
      const analysis = serverEvaluateOverStrategy(numLevel as any, validDigits);
      return res.json({ success: true, analysis });
    } catch {
      return res.status(500).json({ error: 'Failed to evaluate Over strategy' });
    }
  });

  // 5. Protected Batch Predictions (for live scanners and grids)
  app.post('/api/analysis/batch-signals', requireAuth, (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array required' });
      }
      const results = serverBatchComputePredictions(items.slice(0, 50));
      return res.json({ success: true, results });
    } catch {
      return res.status(500).json({ error: 'Failed to compute batch predictions' });
    }
  });

  // Vite middleware in development or fallback if dist is missing
  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);

  if (process.env.NODE_ENV !== 'production' || !hasDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  // Generic 500 error handler that conceals internal stack traces
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Internal server error occurred.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
