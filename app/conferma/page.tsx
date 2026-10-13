import { Confirmation } from '@/components/Confirmation';

export const metadata = { title: 'Conferma ordine — RUSH' };

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <Confirmation orderNumber={code ?? ''} />;
}
