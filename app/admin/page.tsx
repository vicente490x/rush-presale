import { AdminDashboard } from '@/components/AdminDashboard';
import { requireAdminPage } from '@/lib/admin-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — RUSH' };

export default async function AdminPage() {
  await requireAdminPage();
  return <AdminDashboard />;
}
