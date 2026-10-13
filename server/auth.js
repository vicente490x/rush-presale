import crypto from 'crypto';
import { config } from './config.js';

const sign = (p) => crypto.createHmac('sha256', config.sessionSecret).update(p).digest('base64url');

export function makeToken() {
  const p = String(Date.now() + 1000 * 60 * 60 * 12);
  return `${p}.${sign(p)}`;
}

function valid(token) {
  if (!token) return false;
  const [p, s] = token.split('.');
  if (!p || !s) return false;
  const a = Buffer.from(sign(p));
  const b = Buffer.from(s);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Number(p) > Date.now();
}

export function passwordOk(pw = '') {
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(config.adminPassword).digest();
  return crypto.timingSafeEqual(a, b);
}

export function requireAdmin(req, res, next) {
  if (valid(req.cookies?.rush_admin)) return next();
  res.status(401).json({ error: 'non_autorizzato' });
}
