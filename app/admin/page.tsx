import { AdminDashboard } from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — RUSH', robots: { index: false, follow: false, noarchive: true } };

export default function AdminPage() {
  return <AdminDashboard />;
}
