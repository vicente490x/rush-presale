import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { adminId, credentialFingerprint } from '@/lib/admin-account';
const cookieName = 'rush_admin_session';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET deve contenere almeno 32 caratteri casuali.');
  // Rotating the password hash also invalidates previously issued cookies.
  return createHash('sha256').update(value).update('\0').update(process.env.ADMIN_PASSWORD_HASH ?? '').digest();
}
const sessionId = (jti: string) => createHash('sha256').update(jti).digest('hex');
export async function createAdminSession(expectedHash?: string) {
  const actor = adminId();
  const user = await prisma.adminUser.findUnique({ where: { id: actor } });
  if (!user?.active || user.role !== 'ADMIN' || (expectedHash && user.passwordHash !== expectedHash)) throw new Error('ADMIN_NOT_AUTHORIZED');
  const jti = randomBytes(32).toString('base64url');
  const expires = Math.floor(Date.now() / 1000) + 43200;
  const token = await new SignJWT({ role: 'ADMIN' }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(actor).setJti(jti).setIssuer('rush-admin').setAudience('rush-backoffice')
    .setIssuedAt().setExpirationTime(expires).sign(secret());
  await prisma.adminSession.create({ data: { id: sessionId(jti), actor, credentialHash: credentialFingerprint(user.passwordHash), expiresAt: new Date(expires * 1000) } });
  return token;
}
async function verifiedSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: 'rush-admin', audience: 'rush-backoffice', requiredClaims: ['sub', 'jti', 'iat', 'exp'], maxTokenAge: '12h' });
    if (payload.role !== 'ADMIN' || payload.sub !== adminId() || !payload.jti) return null;
    return { id: sessionId(payload.jti), actor: payload.sub };
  } catch { return null; }
}
export async function adminIdentity(token: string | undefined) {
  const identity = await verifiedSession(token);
  if (!identity) return null;
  try {
    const [session, user] = await Promise.all([
      prisma.adminSession.findUnique({ where: { id: identity.id } }),
      prisma.adminUser.findUnique({ where: { id: identity.actor } })
    ]);
    return session && !session.revokedAt && session.expiresAt > new Date() && session.actor === identity.actor &&
      user?.active && user.role === 'ADMIN' && session.credentialHash === credentialFingerprint(user.passwordHash) ? identity.actor : null;
  } catch {
    console.error('ADMIN_SESSION_LOOKUP_FAILED');
    return null; // Database unavailable means no administrative access.
  }
}
export async function revokeAdminSession(token: string | undefined) {
  const identity = await verifiedSession(token);
  if (identity) await prisma.adminSession.updateMany({ where: { id: identity.id, revokedAt: null }, data: { revokedAt: new Date() } });
}
export async function isAdminSession(token: string | undefined) { return Boolean(await adminIdentity(token)); }
export { cookieName };
