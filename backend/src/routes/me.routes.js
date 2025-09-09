import { Router } from 'express';
import { authGuard } from '../middlewares/authGuard.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /me/appointments
router.get('/appointments', authGuard(), async (req, res) => {
  const items = await prisma.appointment.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    include: {
      specialist: { select: { id: true, name: true, specialty: true } },
      payment: true
    }
  });

  const data = items.map(a => ({
    id: a.id,
    date: a.date,
    status: a.status,
    queueToken: a.queueToken,
    specialist: a.specialist,
    amountCents: a.payment?.amountCents ?? null
  }));

  res.json(data);
});

export default router;
