// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import http from 'http';
import rateLimit from 'express-rate-limit'; // 👈 import do rate-limit

import authRoutes from './routes/auth.routes.js';
import specialistsRoutes from './routes/specialists.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import meRoutes from './routes/me.routes.js';
import adminRoutes from './routes/admin.routes.js';

// --- helpers -------------------------------------------------
function buildAllowedOrigins() {
  const env = process.env.FRONTEND_URL || '';
  const list = env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length === 0) {
    list.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }
  return list;
}
const allowedOrigins = buildAllowedOrigins();

// --- app -----------------------------------------------------
const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 🔧 Se quiser manter preflight explícito (opcional):
// app.options('(.*)', cors());

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- rate limiters específicos ------------------------------
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

app.use('/auth', authLimiter);
app.use('/payments/webhook', webhookLimiter);
// ------------------------------------------------------------

app.get('/health', (_, res) => res.json({ ok: true }));

// rotas
app.use('/auth', authRoutes);
app.use('/specialists', specialistsRoutes);
app.use('/specialists', calendarRoutes); // /:id/calendar
app.use('/appointments', appointmentsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/me', meRoutes);
app.use('/admin', adminRoutes);

// 🔧 fallback 404 sem usar "*"
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// erro genérico
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message =
    err.message || (status === 500 ? 'Internal Server Error' : 'Request Error');
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', message, err?.stack || err);
  }
  res.status(status).json({ error: message });
});

// --- server + sockets ---------------------------------------
const server = http.createServer(app);

// Socket.IO
import { setupSockets } from './lib/sockets.js';
setupSockets(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  console.log(`API on ${url}`);
});

export { app, server };
