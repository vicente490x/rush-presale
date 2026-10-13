import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/config';
import { logError, logInfo } from '@/lib/logger';

let resend: Resend | undefined;

function client() {
  if (appEnv !== 'production' && (process.env.MAIL_PROVIDER === 'console' || !process.env.RESEND_API_KEY)) {
    return undefined;
  }
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata.');
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function enqueueEmail(input: {
  dedupeKey: string;
  to: string;
  subject: string;
  text: string;
}) {
  await prisma.emailOutbox.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: input,
    update: {}
  });
}

export async function deliverPendingEmails(batchSize = 25) {
  const pending = await prisma.emailOutbox.findMany({
    where: { sentAt: null },
    orderBy: { createdAt: 'asc' },
    take: batchSize
  });
  let delivered = 0;

  for (const message of pending) {
    try {
      const sender = client();
      if (!sender) {
        await prisma.emailOutbox.update({
          where: { id: message.id },
          data: { sentAt: new Date(), attempts: { increment: 1 }, lastError: null }
        });
        logInfo('email.mock.skipped');
        delivered++;
        continue;
      }
      const result = await sender.emails.send({
        from: process.env.MAIL_FROM ?? '',
        to: message.to,
        subject: message.subject,
        text: message.text
      });
      if (result.error) throw new Error(result.error.message);
      await prisma.emailOutbox.update({
        where: { id: message.id },
        data: { sentAt: new Date(), attempts: { increment: 1 }, lastError: null }
      });
      delivered++;
    } catch (error) {
      await prisma.emailOutbox.update({
        where: { id: message.id },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Errore invio email'
        }
      });
      logError('email.delivery.failed', error);
    }
  }
  return delivered;
}

export function orderConfirmationText(order: {
  orderNumber: string;
  firstName: string;
  size: string;
  quantity: number;
  amountCents: number;
  expiresAt: Date | null;
}) {
  const expires = order.expiresAt?.toLocaleDateString('it-IT', { dateStyle: 'long', timeZone: 'UTC' }) ?? 'non disponibile';
  return `Ciao ${order.firstName},\n\nil tuo ordine PRE-SALE è confermato.\n\nOrdine: ${order.orderNumber}\nMaglietta RUSH — taglia ${order.size} × ${order.quantity}\nImporto pagato: ${(order.amountCents / 100).toFixed(2).replace('.', ',')}€\n\nSe la produzione non viene avviata entro il ${expires}, l’importo verrà rimborsato automaticamente.\n\n— RUSH`;
}
