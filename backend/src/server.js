import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import http from 'http';

import authRoutes from './routes/auth.routes.js';
import specialistsRoutes from './routes/specialists.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import paymentsRoutes from './routes/payments.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/specialists', specialistsRoutes);
app.use('/specialists', calendarRoutes); // /:id/calendar
app.use('/appointments', appointmentsRoutes);
app.use('/payments', paymentsRoutes);

const server = http.createServer(app);

// Socket.IO
import { setupSockets } from './lib/sockets.js';
setupSockets(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API on ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});
