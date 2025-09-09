import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { signJwt } from '../lib/auth.js';
import { z } from 'zod';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();

router.post('/register', async (req, res) => {
  const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) });
  const data = schema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email }});
  if (exists) return res.status(409).json({ error: 'email_in_use' });

  const hash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({ data: { name: data.name, email: data.email, password: hash }});
  const token = signJwt({ sub: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const { email, password } = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }});
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  const token = signJwt({ sub: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
router.get('/me', authGuard(), async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.sub }});
  if (!u) return res.status(404).json({ error: 'not_found' });
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});
export default router;
