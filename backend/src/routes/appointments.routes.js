// backend/src/routes/appointments.routes.js
import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma.js';
import { authGuard } from '../middlewares/authGuard.js';
import { mp } from '../lib/mp.js';
import { startOfDayLocal } from '../utils/capacity.js';

// >>> timezone plugins + calendarUpdated
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
import { calendarUpdated } from '../lib/socketHub.js';

dayjs.extend(utc);
dayjs.extend(tz);
const TZ = process.env.TZ || 'America/Maceio';
// <<<

const router = Router();

/**
 * POST /appointments
 * body: { specialistId: string, date: "YYYY-MM-DD" }
 */
router.post('/', authGuard(), async (req, res) => {
  const schema = z.object({
    specialistId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  const { specialistId, date } = schema.parse(req.body);

  const spec = await prisma.specialist.findUnique({ where: { id: specialistId } });
  if (!spec || !spec.active) {
    return res.status(404).json({ error: 'specialist_not_found' });
  }

  const d0 = startOfDayLocal(date);
  const weekday = dayjs(d0).day(); // 0..6

  // Verifica exceção para o dia
  const ex = await prisma.availabilityException.findUnique({
    where: { specialistId_date: { specialistId, date: d0 } },
  });

  let capacity = 0;
  let status = 'CLOSED';

  if (ex) {
    status = ex.status;
    capacity = ex.capacity ?? 0;
  } else {
    const rule = await prisma.availabilityRule.findFirst({
      where: { specialistId, weekday, active: true },
    });
    if (rule) {
      status = 'OPEN';
      capacity = rule.defaultCap;
    }
  }

  if (status !== 'OPEN' || capacity <= 0) {
    return res.status(400).json({ error: 'day_not_open' });
  }

  const booked = await prisma.appointment.count({
    where: { specialistId, date: d0, NOT: { status: 'CANCELED' } },
  });

  if (booked >= capacity) {
    return res.status(409).json({ error: 'day_full' });
  }

  // Cria appointment PENDING
  const appt = await prisma.appointment.create({
    data: {
      userId: req.user.sub,
      specialistId,
      date: d0,
      status: 'PENDING',
    },
  });

  // Valor em centavos → preco em reais para o MP
  const priceCents = spec.basePriceCents ?? 0;
  const unitPrice = Number((priceCents / 100).toFixed(2));

  // Cria registro Payment
  const payment = await prisma.payment.create({
    data: {
      appointmentId: appt.id,
      status: 'INITIATED',
      amountCents: priceCents,
    },
  });

  // Preference MP (expira em 15 min)
  const pref = await mp.preference.create({
    body: {
      items: [
        {
          id: appt.id, // opcional (auditoria)
          title: `Consulta - ${spec.name}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: unitPrice,
        },
      ],
      external_reference: payment.id, // chave p/ localizar no webhook
      back_urls: {
        success: `${process.env.FRONTEND_URL}/minhas-consultas?status=success`,
        failure: `${process.env.FRONTEND_URL}/minhas-consultas?status=failure`,
        pending: `${process.env.FRONTEND_URL}/minhas-consultas?status=pending`,
      },
      auto_return: 'approved',
      expires: true,
      date_of_expiration: dayjs().add(15, 'minute').toISOString(),
      notification_url: `${process.env.BACKEND_URL}/payments/webhook`,
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { mpPreferenceId: pref.id },
  });

  return res.json({
    appointmentId: appt.id,
    preferenceId: pref.id,
    init_point: pref.init_point,
  });
});

/**
 * POST /appointments/:id/cancel
 * Cancela a consulta (libera a vaga) respeitando a janela de cancelamento configurável.
 * Se estiver paga, tenta reembolso total via MP (Refund SDK v2).
 */
router.post('/:id/cancel', authGuard(), async (req, res) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!appt) return res.status(404).json({ error: 'not_found' });
  if (appt.userId !== req.user.sub) return res.status(403).json({ error: 'forbidden' });

  const limitHours = Number(process.env.CANCEL_HOURS ?? 24);
  const now = dayjs.tz(new Date(), TZ);
  const dayStart = dayjs.tz(appt.date, TZ); // 00:00 do dia da consulta

  if (dayStart.diff(now, 'hour') < limitHours) {
    return res.status(400).json({ error: 'cancel_window_closed' });
  }

  // Se estava pago, tenta reembolso
  if (appt.status === 'PAID' && appt.payment?.mpPaymentId) {
    try {
      // reembolso total; para parcial, inclua "amount"
      //await mp.refund.create({ payment_id: appt.payment.mpPaymentId });
      await prisma.payment.update({
        where: { id: appt.payment.id },
        data: { status: 'REFUNDED' },
      });
    } catch (e) {
      console.error('refund_error', e?.message || e);
      // Opcional: retornar 409 se reembolso falhar. Aqui segue cancelando mesmo assim.
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: 'CANCELED' },
  });

  // Notificar calendário para recalcular vagas
  calendarUpdated(appt.specialistId, appt.date.toISOString());

  res.json({ ok: true, appointmentId: updated.id });
});

export default router;
