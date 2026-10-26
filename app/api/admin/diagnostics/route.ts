import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminRoute, readJson } from '@/lib/http';
import { appEnv, stripeMode } from '@/lib/config';
import { enqueueEmail, deliverPendingEmails, recipientAllowed } from '@/lib/mail';
import { databaseRateLimit } from '@/lib/db-ratelimit';
import { DomainError } from '@/lib/errors';
import { reconcileCheckouts } from '@/lib/presale';
import { settings } from '@/lib/settings';
export const runtime = 'nodejs';
export const maxDuration = 300;
export const GET = adminRoute(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const [lastWebhook, errors, emailErrors, refunds, lastReceipt] = await Promise.all([
    prisma.stripeWebhookEvent.findFirst({ orderBy: { processedAt: 'desc' } }),
    prisma.applicationError.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.emailOutbox.findMany({ where: { sentAt: null, lastError: { not: null } }, select: { id: true, lastError: true, attempts: true, createdAt: true }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.refundOperation.findMany({ include: { order: { select: { orderNumber: true } } }, take: 30, orderBy: { updatedAt: 'desc' } }),
    prisma.webhookReceipt.findFirst({ orderBy: { receivedAt: 'desc' } })
  ]);
  return NextResponse.json({ environment: appEnv(), database: 'CONNECTED', stagingDatabaseConfirmed: process.env.STAGING_DATABASE_CONFIRMED === 'true',
    stripe: { mode: stripeMode(), configured: Boolean(process.env.STRIPE_SECRET_KEY), testKey: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')), webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET), connectionTested: false },
    email: { configured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM), senderVerified: 'Da verificare nel provider Resend', allowlistConfigured: Boolean(process.env.EMAIL_ALLOWLIST) },
    lastWebhook, lastReceipt, errors, emailErrors, refunds });
});
export const POST = adminRoute(async (request, _context, actor) => {
  const data = z.discriminatedUnion('action', [
    z.object({ action: z.literal('email-test'), email: z.string().trim().toLowerCase().email(), confirm: z.literal(true) }).strict(),
    z.object({ action: z.literal('reconcile-checkouts'), confirm: z.literal(true) }).strict()
  ]).parse(await readJson(request));
  if (!await databaseRateLimit(actor, 'diagnostics', 3, 60000)) throw new DomainError('Troppi controlli. Riprova fra un minuto.', 429);
  if (data.action === 'reconcile-checkouts') {
    const s = await settings();
    return NextResponse.json(await reconcileCheckouts(!s.presaleOpen || s.maintenance));
  }
  if (!recipientAllowed(data.email)) throw new DomainError('Destinatario non incluso in EMAIL_ALLOWLIST.', 400);
  const dedupeKey = 'email-test:' + randomUUID();
  await enqueueEmail({ dedupeKey, to: data.email, subject: 'RUSH — email di prova', text: 'Questa è una verifica richiesta esplicitamente dall’amministratore. Nessun ordine è stato creato.' });
  const message = await prisma.emailOutbox.findUniqueOrThrow({ where: { dedupeKey } });
  await deliverPendingEmails(1, undefined, message.id);
  const updated = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: message.id } });
  await prisma.auditLog.create({ data: { actor, action: 'TEST_EMAIL_REQUESTED', after: { sent: Boolean(updated.sentAt) } } });
  return NextResponse.json({ sent: Boolean(updated.sentAt), error: updated.lastError, providerId: updated.providerId }, { status: updated.sentAt ? 200 : 502 });
});
