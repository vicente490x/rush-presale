import { timingSafeEqual } from 'node:crypto';
export function cronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization');
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from('Bearer ' + expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
