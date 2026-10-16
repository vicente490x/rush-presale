import { SignJWT, jwtVerify } from 'jose';
export const stagingCookie = 'rush_staging_session';
function key() {
  const secret = process.env.STAGING_SESSION_SECRET;
  if (!secret || secret.length < 32 || secret === process.env.SESSION_SECRET) throw new Error('Configura STAGING_SESSION_SECRET distinto da SESSION_SECRET, almeno 32 caratteri.');
  return new TextEncoder().encode(secret);
}
export async function createStagingSession() {
  return new SignJWT({ role: 'viewer' }).setProtectedHeader({ alg: 'HS256' }).setIssuer('rush-staging').setAudience('rush-preview').setIssuedAt().setExpirationTime('12h').sign(key());
}
export async function isStagingSession(token: string | undefined) {
  if (!token) return false;
  try { const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'], issuer: 'rush-staging', audience: 'rush-preview' }); return payload.role === 'viewer'; } catch { return false; }
}
