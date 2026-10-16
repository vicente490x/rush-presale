import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/config';
let resend: Resend | undefined;
export async function enqueueEmail(input: { dedupeKey: string; to: string; subject: string; text: string }) {
  await prisma.emailOutbox.upsert({ where: { dedupeKey: input.dedupeKey }, create: input, update: {} });
}
type Mail = { id: string; to: string; subject: string; text: string };
export type EmailSender = (message: Mail) => Promise<string>;
const send: EmailSender = async message => {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('EMAIL_NOT_CONFIGURED');
  resend ??= new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({ from: process.env.MAIL_FROM, to: message.to, subject: message.subject, text: message.text }, { idempotencyKey: `rush-email/${message.id}`, signal: AbortSignal.timeout(8000) });
  if (result.error || !result.data?.id) throw new Error('EMAIL_PROVIDER_FAILED');
  return result.data.id;
};
export function recipientAllowed(to: string) {
  if (appEnv() === 'production') return true;
  return (process.env.EMAIL_ALLOWLIST ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(to.trim().toLowerCase());
}
export async function deliverPendingEmails(batchSize = 25, sender: EmailSender = send, onlyId?: string) {
  const now = new Date();
  const pending = await prisma.emailOutbox.findMany({ where: { ...(onlyId ? { id: onlyId } : {}), sentAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, orderBy: { createdAt: 'asc' }, take: batchSize });
  let delivered = 0;
  for (const message of pending) {
    if (!recipientAllowed(message.to)) {
      await prisma.emailOutbox.updateMany({ where: { id: message.id, sentAt: null }, data: { lastError: 'EMAIL_RECIPIENT_BLOCKED' } });
      continue;
    }
    if (message.firstAttemptAt && now.getTime() - message.firstAttemptAt.getTime() >= 23 * 3600000) {
      await prisma.emailOutbox.updateMany({ where: { id: message.id, sentAt: null }, data: { lastError: 'EMAIL_AMBIGUOUS_REVIEW_REQUIRED' } });
      continue;
    }
    const claimed = await prisma.emailOutbox.updateMany({
      where: { id: message.id, sentAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      data: { leaseUntil: new Date(Date.now() + 5 * 60000), firstAttemptAt: message.firstAttemptAt ?? now, attempts: { increment: 1 } }
    });
    if (!claimed.count) continue;
    try {
      const providerId = await sender(message);
      await prisma.$transaction(async tx => {
        const sentAt = new Date();
        await tx.emailOutbox.update({ where: { id: message.id }, data: { sentAt, providerId, lastError: null, leaseUntil: null } });
        if (message.dedupeKey.startsWith('order-confirmation:')) await tx.order.updateMany({
          where: { id: message.dedupeKey.slice('order-confirmation:'.length), confirmationSentAt: null }, data: { confirmationSentAt: sentAt }
        });
      });
      delivered++;
    } catch {
      await prisma.emailOutbox.updateMany({ where: { id: message.id, sentAt: null }, data: { lastError: 'EMAIL_RETRY_REQUIRED', leaseUntil: new Date(Date.now() + 60000) } });
    }
  }
  return delivered;
}
