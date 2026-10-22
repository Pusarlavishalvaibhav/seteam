import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Mount REST API endpoints under /api
  app.use('/api', apiRouter);

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Serve production static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlateConnect server running at http://localhost:${PORT}`);
    console.log(`API endpoints accessible at http://localhost:${PORT}/api/docs`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PlateConnect server:', err);
  process.exit(1);
});
