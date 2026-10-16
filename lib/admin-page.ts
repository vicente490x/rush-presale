import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAdminSession, cookieName } from '@/lib/admin-auth';
export async function requireAdminPage() {
  const jar = await cookies();
  if (!await isAdminSession(jar.get(cookieName)?.value)) redirect('/admin/login');
}
