import express from 'express';
import {
  handleLoginRequest,
  handleVerifyRequest,
  handleLogoutRequest,
  activeTokens,
  validateDigitsArray,
  SessionData,
} from './authCore';
import {
  serverCalculateDigitPredictionSignal,
  serverEvaluateEvenOddStrategy,
  serverEvaluateSmcStrategy,
  serverEvaluateOverStrategy,
  serverBatchComputePredictions,
} from './strategyEngine';

export function createExpressApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');

  // Security Headers & CORS middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');

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

  // Global Sliding Window Rate Limiter
  const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 240;

  app.use((req, res, next) => {
    const rawIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
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

  // Body parser
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

  // Auth Guard Middleware
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

  // Create unified API router
  const apiRouter = express.Router();

  // Health
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Login Endpoint
  apiRouter.post('/auth/login', (req, res) => {
    const result = handleLoginRequest(req.body);
    return res.status(result.status).json(result.body);
  });

  // Explicit 405 Method Not Allowed handler for non-POST on /auth/login
  apiRouter.all('/auth/login', (req, res) => {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/login. Please send an HTTP POST request with username and password.`,
      allowedMethods: ['POST'],
    });
  });

  // Auth: Verify Endpoint
  apiRouter.get('/auth/verify', (req, res) => {
    const result = handleVerifyRequest(req.headers.authorization);
    return res.status(result.status).json(result.body);
  });

  apiRouter.all('/auth/verify', (req, res) => {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/verify. Please send an HTTP GET request with Bearer token.`,
      allowedMethods: ['GET'],
    });
  });

  // Auth: Logout Endpoint
  apiRouter.post('/auth/logout', (req, res) => {
    const result = handleLogoutRequest(req.headers.authorization);
    return res.status(result.status).json(result.body);
  });

  apiRouter.all('/auth/logout', (req, res) => {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed on /api/auth/logout. Please send an HTTP POST request.`,
      allowedMethods: ['POST'],
    });
  });

  // 1. Digit Prediction Signal
  apiRouter.post('/analysis/digit-signal', requireAuth, (req, res) => {
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

  // 2. Even / Odd Strategy
  apiRouter.post('/analysis/even-odd', requireAuth, (req, res) => {
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

  // 3. SMC Rise / Fall Strategy
  apiRouter.post('/analysis/smc', requireAuth, (req, res) => {
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

  // 4. Over / Under Strategy
  apiRouter.post('/analysis/over-under', requireAuth, (req, res) => {
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

  // 5. Batch Predictions
  apiRouter.post('/analysis/batch-signals', requireAuth, (req, res) => {
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

  // Mount API router at both /api and root / to support direct and rewritten proxy paths
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}
