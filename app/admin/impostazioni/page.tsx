import { AdminSettings } from '@/components/AdminSettings';
import { requireAdminPage } from '@/lib/admin-page';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Impostazioni — RUSH' };
export default async function SettingsPage() { await requireAdminPage(); return <AdminSettings />; }
