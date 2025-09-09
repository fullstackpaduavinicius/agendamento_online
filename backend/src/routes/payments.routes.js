// backend/src/routes/payments.routes.js
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { mp } from '../lib/mp.js';
import { calendarUpdated } from '../lib/socketHub.js';
import { sendMail } from '../lib/mailer.js'; // 👈 import do mailer

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
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        mpPaymentId: String(id),
        rawPayload: mpPayment,
      },
    });

    if (approved) {
      // Busca o appointment com user e specialist para montar o e-mail
      const appt = await prisma.appointment.findUnique({
        where: { id: pay.appointmentId },
        include: { user: true, specialist: true },
      });

      // Define a posição na fila baseada em quantos "PAID" existem no dia
      const countPaid = await prisma.appointment.count({
        where: { specialistId: appt.specialistId, date: appt.date, status: 'PAID' },
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'PAID', queueToken: countPaid + 1 },
      });

      // E-mail de confirmação
      const dataStr = new Date(appt.date).toLocaleDateString('pt-BR');
      const html = `
        <h2>Pagamento aprovado 🎉</h2>
        <p>Olá, ${appt.user?.name || 'cliente'}!</p>
        <p>Sua consulta com <b>${appt.specialist?.name || 'especialista'}</b> (${appt.specialist?.specialty || ''}) foi confirmada para <b>${dataStr}</b>.</p>
        <p><b>Atendimento por ordem de chegada</b>. Apresente este número ao chegar: <b>#${countPaid + 1}</b>.</p>
      `;
      try {
        if (appt.user?.email) {
          await sendMail(appt.user.email, 'Consulta confirmada', html);
        }
      } catch (e) {
        console.error('mail_error', e);
      }

      // Notifica o calendário em tempo real (frontend recarrega o mês)
      calendarUpdated(appt.specialistId, appt.date.toISOString());
    }

    return res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    return res.status(200).send('ok'); // evita re-tentativas infinitas
  }
});

export default router;
