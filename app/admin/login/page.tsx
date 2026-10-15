import { AdminLogin } from '@/components/AdminLogin';
export const metadata = { title: 'Accesso amministratore — RUSH' };

export default function AdminLoginPage() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  return <AdminLogin adminEmail={adminEmail} developmentPasswordActive={false} />;
}
