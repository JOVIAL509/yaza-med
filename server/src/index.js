import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import aiQuizRoutes from './routes/aiQuiz.js';
import { seedAdmin } from './services/seedAdmin.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_ORIGIN || '').split(','),
  ...(process.env.CLIENT_ORIGINS || '').split(',')
].map(origin => origin.trim()).filter(Boolean));
app.use((req, res, next) => {
  cors({
    origin(origin, callback) {
      const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
      const requestOrigin = `${forwardedProto || req.protocol}://${req.get('host')}`;
      // Same-origin browser requests and explicitly configured frontend origins are allowed.
      if (!origin || origin === requestOrigin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  })(req, res, next);
});
app.use(express.json({ limit: '256kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api', aiQuizRoutes);
app.use('/api', contentRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h' }));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
});

const preferredPort = Number(process.env.PORT) || 4000;
const portCandidates = [preferredPort, ...[4000, 4001, 4002, 4003].filter(port => port !== preferredPort)];
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri && process.env.NODE_ENV === 'production') {
  throw new Error('MONGODB_URI is required in production');
}
await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/yaza_med');
await seedAdmin();

const startServer = (index = 0) => {
  const port = portCandidates[index];
  const server = app.listen(port, '0.0.0.0', () => console.log(`Yaza Med listening on port ${port}`));
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && index < portCandidates.length - 1) {
      console.warn(`Port ${port} is busy; retrying on ${portCandidates[index + 1]}.`);
      startServer(index + 1);
      return;
    }
    throw error;
  });
};

startServer();
