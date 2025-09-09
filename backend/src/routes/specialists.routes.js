import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  const q = req.query.q?.toString().trim();
  const where = q ? { AND: [{ active: true }, { OR: [
    { name: { contains: q, mode: 'insensitive' } },
    { specialty: { contains: q, mode: 'insensitive' } }
  ]}]} : { active: true };

  const items = await prisma.specialist.findMany({
    where, orderBy: { name: 'asc' }
  });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const spec = await prisma.specialist.findUnique({ where: { id: req.params.id }});
  if (!spec || !spec.active) return res.status(404).json({ error: 'not_found' });
  res.json(spec);
});

export default router;
