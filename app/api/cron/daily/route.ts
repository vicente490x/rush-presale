import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createRefund } from '@/lib/stripe';
import { deliverPendingEmails, enqueueEmail } from '@/lib/mail';
import { hasProductionStarted, settings } from '@/lib/settings';
import { removeExpiredAssets } from '@/lib/storage';
import { now as getNow } from '@/lib/clock';
import { isAutoRefundDue, isExpiryWarningDue } from '@/lib/presale-logic';
import { claimRefund } from '@/lib/refunds';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  const now = getNow();
  const soon = new Date(now.getTime() + 7 * 86_400_000);
  const current = await settings();
  const stats = { pendingExpired: 0, warnings: 0, refunds: 0, refundErrors: 0, assetsRemoved: 0, emailsDelivered: 0 };

  try {
    const pending = await prisma.order.updateMany({
      where: { paymentStatus: PaymentStatus.PENDING, createdAt: { lte: new Date(now.getTime() - 35 * 60_000) } },
      data: { paymentStatus: PaymentStatus.FAILED }
    });
    stats.pendingExpired = pending.count;

    if (!hasProductionStarted(current.productionStatus)) {
      const warnings = await prisma.order.findMany({
        where: {
          paymentStatus: PaymentStatus.PAID,
          refundStatus: RefundStatus.NONE,
          expiryWarningSentAt: null,
          expiresAt: { gt: now, lte: soon }
        }
      });
      for (const order of warnings) {
        if (!order.expiresAt || !isExpiryWarningDue(order.expiresAt, now)) continue;
        if (!process.env.ADMIN_EMAIL) continue;
        const claimed = await prisma.order.updateMany({
          where: { id: order.id, expiryWarningSentAt: null },
          data: { expiryWarningSentAt: now }
        });
        if (!claimed.count) continue;
        await enqueueEmail({
          dedupeKey: `expiry-warning:${order.id}`,
          to: process.env.ADMIN_EMAIL,
          subject: `RUSH PRE-SALE — ordine in scadenza (${order.orderNumber})`,
          text: `L’ordine ${order.orderNumber} di ${order.firstName} ${order.lastName} scade entro 7 giorni.`
        });
        stats.warnings++;
      }

      const due = await prisma.order.findMany({
        where: {
          paymentStatus: PaymentStatus.PAID,
          refundStatus: { in: [RefundStatus.NONE, RefundStatus.FAILED, RefundStatus.PENDING] },
          expiresAt: { lte: now }
        }
      });
      for (const order of due) {
        if (!order.expiresAt || !isAutoRefundDue(order.expiresAt, now, false)) continue;
        if (!order.stripePaymentIntentId) {
          await prisma.order.updateMany({
            where: { id: order.id, refundStatus: { in: [RefundStatus.NONE, RefundStatus.FAILED] } },
            data: { refundStatus: RefundStatus.FAILED }
          });
          stats.refundErrors++;
          continue;
        }
        const claimedAt = getNow();
        if (!await claimRefund(order.id, claimedAt)) continue;
        try {
          await createRefund(
            { payment_intent: order.stripePaymentIntentId },
            { idempotencyKey: `refund-${order.orderNumber}` }
          );
          await prisma.$transaction(async (tx) => {
            const completed = await tx.order.updateMany({
              where: { id: order.id, refundStatus: RefundStatus.PENDING, updatedAt: claimedAt },
              data: { refundStatus: RefundStatus.REFUNDED, orderStatus: OrderStatus.REFUNDED, refundedAt: now }
            });
            if (completed.count !== 1) return;
            await tx.emailOutbox.upsert({
              where: { dedupeKey: `automatic-refund:${order.id}` },
              create: {
                dedupeKey: `automatic-refund:${order.id}`,
                to: order.email,
                subject: `RUSH PRE-SALE — ordine ${order.orderNumber} rimborsato`,
                text: `Ciao ${order.firstName},\n\nla produzione non è stata avviata entro i due mesi previsti. Abbiamo rimborsato l’ordine ${order.orderNumber}; l’accredito arriva sul metodo di pagamento utilizzato, di solito entro 5-10 giorni lavorativi.\n\n— RUSH`
              },
              update: {}
            });
            if (process.env.ADMIN_EMAIL) {
              await tx.emailOutbox.upsert({
                where: { dedupeKey: `automatic-refund-admin:${order.id}` },
                create: {
                  dedupeKey: `automatic-refund-admin:${order.id}`,
                  to: process.env.ADMIN_EMAIL,
                  subject: `ORDINE SCADUTO — RIMBORSO AUTOMATICO (${order.orderNumber})`,
                  text: `Ordine ${order.orderNumber} di ${order.firstName} ${order.lastName} rimborsato automaticamente alla scadenza.`
                },
                update: {}
              });
            }
          });
          stats.refunds++;
        } catch (error) {
          await prisma.order.updateMany({
            where: { id: order.id, refundStatus: RefundStatus.PENDING, updatedAt: claimedAt },
            data: { refundStatus: RefundStatus.FAILED }
          });
          console.error(`Rimborso automatico ${order.orderNumber} non riuscito`, error);
          stats.refundErrors++;
        }
      }
    }

    const reset = new Date(now);
    reset.setUTCHours(0, 0, 0, 0);
    await prisma.settings.updateMany({
      where: { id: 'global', tryOnSpendResetAt: { lt: reset } },
      data: { tryOnDailyCount: 0, tryOnDailySpendUsd: 0, tryOnSpendResetAt: reset }
    });
    stats.assetsRemoved = await removeExpiredAssets(now);
    stats.emailsDelivered = await deliverPendingEmails();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Cron giornaliero non completato', error);
    return NextResponse.json({ error: 'Attività pianificate non completate.', stats }, { status: 500 });
  }
}
