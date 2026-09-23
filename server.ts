import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

// Secure server-side credential store (never exposed to client)
const AUTHORIZED_SALT = 'b91a7f43c2e84196da5e01b3f827ce45';
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

async function startServer() {
  const app = express();

  // Dynamic PORT from env or CLI arguments, defaulting to 3000
  let PORT = 3000;
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort)) PORT = envPort;
  }
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const argPort = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(argPort)) PORT = argPort;
  }

  // Permissive CORS middleware for dev, preview and iframe environments
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Lazy / ready Gemini AI client
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
