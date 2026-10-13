import { addCalendarMonths } from '@/lib/dates';

export type OrderLike = {
  paymentStatus?: string;
  refundStatus?: string;
  quantity?: number;
  expiresAt?: Date | string | null;
};

export function computePaidPieces(orders: OrderLike[]) {
  return orders.reduce((total, order) => {
    const isPaid = order.paymentStatus === 'PAID';
    const isRefunded = order.refundStatus === 'REFUNDED';
    const quantity = Number(order.quantity ?? 0);
    return isPaid && !isRefunded && Number.isFinite(quantity) ? total + quantity : total;
  }, 0);
}

export function thresholdReached(pieces: number, threshold: number) {
  return pieces >= threshold;
}

export function buildOrderExpiry(paidAt: Date) {
  return addCalendarMonths(paidAt, 2);
}

export function shouldWarnExpiry(now: Date, expiresAt: Date) {
  const deltaMs = expiresAt.getTime() - now.getTime();
  return deltaMs > 0 && deltaMs <= 7 * 24 * 60 * 60 * 1000;
}

export function shouldAutoRefund(order: OrderLike, now: Date, productionStatus: string) {
  const expiresAt = order.expiresAt instanceof Date ? order.expiresAt : order.expiresAt ? new Date(order.expiresAt) : null;
  if (!expiresAt) return false;
  if (order.paymentStatus !== 'PAID') return false;
  if (order.refundStatus === 'REFUNDED') return false;
  if (productionStatus === 'PRODUZIONE_AVVIATA' || productionStatus === 'PRODUZIONE_COMPLETATA') return false;
  return expiresAt <= now;
}
