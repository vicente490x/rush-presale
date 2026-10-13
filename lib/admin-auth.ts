import { SignJWT, jwtVerify } from 'jose';

const cookieName = 'rush_admin_session';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET deve contenere almeno 32 caratteri casuali.');
  return new TextEncoder().encode(value);
}

export async function createAdminSession() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}

export async function isAdminSession(token: string | undefined) {
  if (!token) return false;
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export { cookieName };
