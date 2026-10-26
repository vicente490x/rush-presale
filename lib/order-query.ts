import { ClothingSize, DeliveryStatus, PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
import { z } from 'zod';
export const querySchema = z.object({
  q: z.string().trim().max(100).default(''), page: z.coerce.number().int().min(1).max(100000).default(1),
  payment: z.nativeEnum(PaymentStatus).optional(), refund: z.nativeEnum(RefundStatus).optional(),
  size: z.nativeEnum(ClothingSize).optional(), delivery: z.nativeEnum(DeliveryStatus).optional(),
  sort: z.enum(['createdAt', 'paidAt', 'expiresAt', 'amountCents', 'orderNumber', 'quantity']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc')
});
export function orderQuery(request: Request) {
  const url = new URL(request.url);
  const raw = Object.fromEntries([...url.searchParams.entries()].filter(([key, value]) => key !== 'format' && value !== ''));
  const query = querySchema.parse(raw);
  const where: Prisma.OrderWhereInput = { excludedBatchId: null,
    ...(query.payment ? { paymentStatus: query.payment } : {}), ...(query.refund ? { refundStatus: query.refund } : {}),
    ...(query.size ? { size: query.size } : {}), ...(query.delivery ? { deliveryStatus: query.delivery } : {}),
    ...(query.q ? { OR: ['orderNumber', 'firstName', 'lastName', 'email'].map(key => ({ [key]: { contains: query.q, mode: 'insensitive' } })) } : {})
  };
  const orderBy: Prisma.OrderOrderByWithRelationInput[] = [{ [query.sort]: query.direction }, { id: 'asc' }];
  return { query, where, orderBy };
}
