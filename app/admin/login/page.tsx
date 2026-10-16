import { headers } from 'next/headers';
import { AdminLogin } from '@/components/AdminLogin';
import { appEnv } from '@/lib/config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accesso amministratore — RUSH' };
export default async function AdminLoginPage() {
  const host = (await headers()).get('host')?.split(':')[0];
  const localDevelopment = appEnv() === 'development' && process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(host ?? '');
  return <AdminLogin localDevelopment={localDevelopment} />;
}
