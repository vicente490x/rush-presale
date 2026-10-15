import { addCalendarMonths } from '@/lib/dates';

export function hasReachedThreshold(total: number, threshold: number) {
  return total >= threshold;
}

export function orderExpiry(paidAt: Date) {
  return addCalendarMonths(paidAt, 2);
}

export function isExpiryWarningDue(expiresAt: Date, currentTime: Date) {
  const sevenDays = currentTime.getTime() + 7 * 86_400_000;
  return expiresAt.getTime() > currentTime.getTime() && expiresAt.getTime() <= sevenDays;
}

export function isAutoRefundDue(expiresAt: Date, currentTime: Date, productionStarted: boolean) {
  return !productionStarted && expiresAt.getTime() <= currentTime.getTime();
}

export function countPaidPieces(orders: ReadonlyArray<{
  paymentStatus: string;
  refundStatus: string;
  quantity: number;
}>) {
  return orders.reduce((total, order) =>
    total + (order.paymentStatus === 'PAID' && order.refundStatus !== 'REFUNDED' ? order.quantity : 0), 0);
}

export function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ');
  return `"${/^\s*[=+\-@]/.test(text) ? `'${text}` : text.replace(/"/g, '""')}"`;
}
