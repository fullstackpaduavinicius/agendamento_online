// backend/src/routes/admin.routes.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();
const onlyAdmin = authGuard(['ADMIN']);

// --- Specialists ---
router.post('/specialists', onlyAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    specialty: z.string().min(2),
    bio: z.string().optional(),
    photoUrl: z.string().url().optional(),
    basePriceCents: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const created = await prisma.specialist.create({ data });
  res.json(created);
});

router.put('/specialists/:id', onlyAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    specialty: z.string().min(2).optional(),
    bio: z.string().optional(),
    photoUrl: z.string().url().optional(),
    basePriceCents: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const updated = await prisma.specialist.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// --- Rules ---
router.get('/availability/rules', onlyAdmin, async (req, res) => {
  const specialistId = req.query.specialistId?.toString();
  if (!specialistId) return res.status(400).json({ error: 'specialistId_required' });
  const items = await prisma.availabilityRule.findMany({
    where: { specialistId },
    orderBy: { weekday: 'asc' },
  });
  res.json(items);
});

router.post('/availability/rules', onlyAdmin, async (req, res) => {
  const schema = z.object({
    specialistId: z.string().min(1),
    weekday: z.number().int().min(0).max(6),
    defaultCap: z.number().int().min(1),
    active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const created = await prisma.availabilityRule.create({ data });
  res.json(created);
});

router.delete('/availability/rules/:id', onlyAdmin, async (req, res) => {
  await prisma.availabilityRule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// --- Exceptions ---
router.get('/availability/exceptions', onlyAdmin, async (req, res) => {
  const specialistId = req.query.specialistId?.toString();
  const month = req.query.month?.toString(); // YYYY-MM
  if (!specialistId) return res.status(400).json({ error: 'specialistId_required' });

  let where = { specialistId };
  if (month) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1 + 1, 0, 23, 59, 59));
    where = { ...where, date: { gte: start, lte: end } };
  }
  const items = await prisma.availabilityException.findMany({ where, orderBy: { date: 'asc' } });
  res.json(items);
});

router.post('/availability/exceptions', onlyAdmin, async (req, res) => {
  const schema = z.object({
    specialistId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['OPEN', 'CLOSED', 'FULL', 'UNAVAILABLE']),
    capacity: z.number().int().min(0).nullable().optional(),
    reason: z.string().optional(),
  });
  const { specialistId, date, status, capacity, reason } = schema.parse(req.body);
  const d0 = new Date(`${date}T00:00:00.000Z`);
  const up = await prisma.availabilityException.upsert({
    where: { specialistId_date: { specialistId, date: d0 } },
    create: { specialistId, date: d0, status, capacity: capacity ?? null, reason },
    update: { status, capacity: capacity ?? null, reason },
  });
  res.json(up);
});

// =========================
// Painel "Hoje" (admin)
// =========================
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(tz);
const TZ = process.env.TZ || 'America/Maceio';

/**
 * GET /admin/today?specialistId=...&date=YYYY-MM-DD
 * Lista os atendimentos do dia (default: hoje no TZ)
 */
router.get('/today', onlyAdmin, async (req, res) => {
  const specialistId = req.query.specialistId?.toString();
  if (!specialistId) return res.status(400).json({ error: 'specialistId_required' });

  const dateStr = req.query.date?.toString() || dayjs().tz(TZ).format('YYYY-MM-DD');
  const d0 = new Date(`${dateStr}T00:00:00.000Z`);

  const items = await prisma.appointment.findMany({
    where: { specialistId, date: d0, NOT: { status: 'CANCELED' } },
    orderBy: [{ status: 'asc' }, { queueToken: 'asc' }, { createdAt: 'asc' }],
    include: {
      user: { select: { id: true, name: true, email: true } },
      payment: true,
    },
  });

  res.json(items);
});

/**
 * POST /admin/appointments/:id/status
 * body: { status: "NO_SHOW" | "SERVED" | "PENDING" | "PAID" }
 */
router.post('/appointments/:id/status', onlyAdmin, async (req, res) => {
  const status = String(req.body.status || '');
  const allowed = ['NO_SHOW', 'SERVED', 'PENDING', 'PAID'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid_status' });

  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(updated);
});

/**
 * POST /admin/appointments/reorder
 * body: { specialistId, date: "YYYY-MM-DD", idsInOrder: [] }
 */
router.post('/appointments/reorder', onlyAdmin, async (req, res) => {
  const { specialistId, date, idsInOrder } = req.body || {};
  if (!specialistId || !date || !Array.isArray(idsInOrder)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  // normaliza para 00:00Z (compatível com seu modelo)
  // (não é necessário usar d0 depois, mas mantém a semântica de dia)
  // eslint-disable-next-line no-unused-vars
  const d0 = new Date(`${date}T00:00:00.000Z`);

  // reatribui queueToken sequencial conforme ordem enviada
  for (let i = 0; i < idsInOrder.length; i++) {
    const id = idsInOrder[i];
    await prisma.appointment.update({
      where: { id },
      data: { queueToken: i + 1 },
    });
  }

  // opcional: notificar front com Socket.IO aqui (ex.: calendarUpdated)
  res.json({ ok: true });
});

export default router;
