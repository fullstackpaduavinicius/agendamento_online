import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma.js';
import { startOfDayLocal } from '../utils/capacity.js';

const router = Router();

// GET /specialists/:id/calendar?month=2025-09
router.get('/:id/calendar', async (req, res) => {
  const { id } = req.params;
  const month = req.query.month?.toString() || dayjs().format('YYYY-MM');
  const base = dayjs(`${month}-01`);
  if (!base.isValid()) return res.status(400).json({ error: 'invalid_month' });

  const start = base.startOf('month').toDate();
  const end   = base.endOf('month').toDate();

  const spec = await prisma.specialist.findUnique({ where: { id }});
  if (!spec || !spec.active) return res.status(404).json({ error: 'not_found' });

  // carregar regras e exceções do mês
  const rules = await prisma.availabilityRule.findMany({ where: { specialistId: id, active: true }});
  const exceptions = await prisma.availabilityException.findMany({ where: { specialistId: id, date: { gte: start, lte: end }}});

  // appointments (exceto cancelados)
  const appts = await prisma.appointment.findMany({
    where: { specialistId: id, date: { gte: start, lte: end }, NOT: { status: 'CANCELED' } }
  });

  const map = {};
  for (let d = base.startOf('month'); d.isBefore(base.endOf('month')); d = d.add(1, 'day')) {
    const dow = d.day(); // 0..6
    const d0 = startOfDayLocal(d);
    const ex = exceptions.find(e => dayjs(e.date).isSame(d0, 'day'));
    let status = 'OPEN';
    let capacity = null;

    if (ex) {
      status = ex.status;
      capacity = ex.capacity ?? null;
    } else {
      const rule = rules.find(r => r.weekday === dow && r.active);
      if (rule) {
        capacity = rule.defaultCap;
        status = 'OPEN';
      } else {
        status = 'CLOSED';
      }
    }

    const booked = appts.filter(a => dayjs(a.date).isSame(d0, 'day')).length;
    const finalCap = capacity ?? 0;
    const remaining = Math.max(finalCap - booked, 0);

    map[d.format('YYYY-MM-DD')] = { total: finalCap, booked, remaining, status };
  }

  res.json(map);
});

export default router;
