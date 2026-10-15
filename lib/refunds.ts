import { PaymentStatus, RefundStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const staleClaimMilliseconds = 15 * 60_000;

export async function claimRefund(orderId: string, claimedAt: Date) {
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      paymentStatus: PaymentStatus.PAID,
      OR: [
        { refundStatus: { in: [RefundStatus.NONE, RefundStatus.FAILED] } },
        {
          refundStatus: RefundStatus.PENDING,
          updatedAt: { lte: new Date(claimedAt.getTime() - staleClaimMilliseconds) }
        }
      ]
    },
    data: { refundStatus: RefundStatus.PENDING, updatedAt: claimedAt }
  });
  return result.count === 1;
}
