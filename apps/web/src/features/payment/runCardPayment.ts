import { ApiError, hasApiCode } from '@/api/error';
import { pollUntil } from '@/api/poll';
import { createOrderPayment, getOrder, listOrderPayments } from '@/api/resources/orders';
import { createPaymentSimulation, getPayment } from '@/api/resources/payments';
import type { Order, Payment, PaymentScenario } from '@/api/types';
import { findActivePayment } from '@/domain/indexes';
import { bumpPaymentAttempt, paymentAttemptOf } from '@/session/browserStore';
import { clearIdempotency, idempotencyKeyFor } from '@/session/idempotency';
import { sessionStore } from '@/session/storage';
import { withToken } from '@/session/withToken';

export function isFinalPaymentStatus(status: string): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

export async function runCardPayment(params: {
  orderId: string;
  scenario: PaymentScenario;
  signal: AbortSignal;
  isCurrent: () => boolean;
  delayMs: number;
}): Promise<{ payment: Payment; order: Order } | null> {
  const { orderId, scenario, signal, isCurrent, delayMs } = params;

  const listed = await withToken((token) => listOrderPayments(orderId, token, signal));
  if (!isCurrent()) {
    return null;
  }

  let payment = findActivePayment(listed.data);

  if (!payment) {
    const attempt = paymentAttemptOf(orderId);
    const key = idempotencyKeyFor(`payment:${orderId}:${attempt}`, orderId);
    try {
      const created = await withToken((token) => createOrderPayment(orderId, token, key, signal));
      payment = created.data;
    } catch (error) {
      if (!hasApiCode(error, 'PAYMENT_IN_PROGRESS')) {
        throw error;
      }
      const again = await withToken((token) => listOrderPayments(orderId, token, signal));
      payment = findActivePayment(again.data);
    }
  }

  if (!payment) {
    throw new ApiError({
      kind: 'http',
      message: 'Не удалось создать попытку оплаты.',
    });
  }

  sessionStore.setPaymentId(payment.id);

  if (payment.status === 'pending') {
    await withToken((token) => createPaymentSimulation(payment.id, scenario, token, signal));
  }

  const polled = await pollUntil({
    read: async (pollSignal) => {
      const result = await withToken((token) => getPayment(payment.id, token, pollSignal));
      return result.data;
    },
    isFinal: (value) => isFinalPaymentStatus(value.status),
    delayMs: () => Math.max(delayMs, 300),
    signal,
    isCurrent,
  });

  if (!polled || !isCurrent()) {
    return null;
  }

  if (polled.status === 'failed' || polled.status === 'cancelled') {
    const attempt = paymentAttemptOf(orderId);
    clearIdempotency(`payment:${orderId}:${attempt}`);
    bumpPaymentAttempt(orderId);
    sessionStore.setPaymentId(null);
  }

  const order = await withToken((token) => getOrder(orderId, token, signal));
  if (!isCurrent()) {
    return null;
  }
  return { payment: polled, order: order.data };
}
