import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Server-side user store with salted SHA-256 hashes
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
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

const demoSalt = '7c9f4d1e2b8a05c6e3f1947265a8d9b0';
const demoHash = hashPasswordNode('QuantumTrade2026!', demoSalt);

const serverUsers: ServerUser[] = [
  {
    id: 'usr_demo_01',
    username: 'demo_trader',
    email: 'trader@deriv-quant.ai',
    role: 'PRO_TRADER',
    salt: demoSalt,
    passwordHash: demoHash,
    createdAt: new Date().toISOString(),
  },
];

const activeTokens = new Set<string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy / ready Gemini AI client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = serverUsers.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const computed = hashPasswordNode(password, user.salt);
    if (computed !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  // Auth: Register Endpoint
  app.post('/api/auth/register', (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username (min 3 chars) and password (min 6 chars) required' });
    }

    if (serverUsers.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      return res.status(409).json({ error: 'Username already registered' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPasswordNode(password, salt);
    const newUser: ServerUser = {
      id: `usr_${Date.now()}`,
      username: username.trim(),
      email: email || `${username.trim()}@trader.internal`,
      role: 'TRADER',
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    serverUsers.push(newUser);
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  });

  // Auth: Verify Session Endpoint
  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false });
    }
    const token = authHeader.split(' ')[1];
    if (!activeTokens.has(token)) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true });
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

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
