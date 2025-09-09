// src/routes/payments.routes.js
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { mp } from '../lib/mp.js';

const router = Router();

router.all('/webhook', async (req, res) => {
  try {
    const type = req.query.type || req.body.type || req.query.topic || req.body.topic;
    const id = req.query['data.id'] || req.body?.data?.id;

    if (type !== 'payment' || !id) return res.status(200).send('ok');

    const mpPayment = await mp.payment.get({ id });

    // Pega o external_reference que enviamos na Preference (payment.id)
    const externalRef = mpPayment?.external_reference;
    if (!externalRef) return res.status(200).send('no-external-ref');

    let pay = await prisma.payment.findUnique({ where: { id: externalRef } });
    if (!pay) return res.status(200).send('no-payment');

    if (pay.status === 'APPROVED') return res.status(200).send('already');

    const approved = mpPayment.status === 'approved';

    await prisma.payment.update({
      where: { id: pay.id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', mpPaymentId: String(id), rawPayload: mpPayment }
    });

    if (approved) {
      const appt = await prisma.appointment.findUnique({ where: { id: pay.appointmentId } });
      const countPaid = await prisma.appointment.count({
        where: { specialistId: appt.specialistId, date: appt.date, status: 'PAID' }
      });
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'PAID', queueToken: countPaid + 1 }
      });
    }

    return res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    return res.status(200).send('ok'); // evita re-tentativas infinitas
  }
});

export default router;
