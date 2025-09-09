import { verifyJwt } from '../lib/auth.js';

export function authGuard(roles = []) {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      const payload = verifyJwt(token);
      if (roles.length && !roles.includes(payload.role)) return res.status(403).json({ error: 'forbidden' });
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
