import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const orderAccessMaxAge = 7 * 24 * 3600;
export const orderAccessCookie = (orderNumber: string) => 'rush_order_' + createHash('sha256').update(orderNumber).digest('hex').slice(0, 24);
function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ORDER_ACCESS_NOT_CONFIGURED');
  return createHmac('sha256', secret).update('rush-order-access\0' + value).digest('hex');
}
export function issueOrderAccess(orderNumber: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + orderAccessMaxAge;
  return `${expires}.${signature(`${orderNumber}:${expires}`)}`;
}
export function hasOrderAccess(orderNumber: string, token: string | undefined, now = Date.now()) {
  if (!token || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, mac] = token.split('.');
  if (Number(expires) <= Math.floor(now / 1000) || Number(expires) > Math.floor(now / 1000) + orderAccessMaxAge) return false;
  return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(`${orderNumber}:${expires}`), 'hex'));
}
