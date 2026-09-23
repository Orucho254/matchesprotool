import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './src/server/createApp';

async function startServer() {
  const app = createExpressApp();

  // Dev server and API backend must listen on port 3000 (DEFAULT_APP_PORT) behind NGINX (which listens on 8080)
  const defaultPort = parseInt(process.env.DEFAULT_APP_PORT || process.env.APP_PORT || '3000', 10);
  let PORT = defaultPort;

  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const argPort = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(argPort)) PORT = argPort;
  }

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
    app.use(expressStaticGzip(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  // Generic 500 error handler that conceals internal stack traces
  app.use((err: any, req: any, res: any, _next: any) => {
    res.status(500).json({ error: 'Internal server error occurred.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function expressStaticGzip(distPath: string) {
  const express = require('express');
  return express.static(distPath);
}

startServer();
