import { SignJWT, jwtVerify } from 'jose';
const cookieName = 'rush_admin_session';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET deve contenere almeno 32 caratteri casuali.');
  return new TextEncoder().encode(value);
}
export async function createAdminSession() {
  return new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(process.env.ADMIN_ID ?? 'rush-admin').setIssuer('rush-admin').setAudience('rush-backoffice')
    .setIssuedAt().setExpirationTime('12h').sign(secret());
}
export async function adminIdentity(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: 'rush-admin', audience: 'rush-backoffice' });
    return payload.role === 'admin' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
export async function isAdminSession(token: string | undefined) { return Boolean(await adminIdentity(token)); }
export { cookieName };
