import { ApiError, hasApiCode } from '@/api/error';
import { pollDelayMs, pollUntil, waitFor } from '@/api/poll';
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

export function paymentPollFallbackMs(settlementDelayMs?: number): number {
  if (!settlementDelayMs) {
    return 400;
  }
  return Math.min(settlementDelayMs, 800);
}

export async function watchPayment(params: {
  paymentId: string;
  signal: AbortSignal;
  isCurrent: () => boolean;
  fallbackDelayMs: number;
}): Promise<Payment | null> {
  const { paymentId, signal, isCurrent, fallbackDelayMs } = params;
  return pollUntil<Payment>({
    read: async (pollSignal) => {
      const result = await withToken((token) => getPayment(paymentId, token, pollSignal));
      return { value: result.data, retryAfterMs: result.retryAfterMs };
    },
    isFinal: (value) => isFinalPaymentStatus(value.status),
    delayMs: (_value, retryAfterMs) => pollDelayMs(retryAfterMs, fallbackDelayMs),
    signal,
    isCurrent,
  });
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
    const simulation = await withToken((token) =>
      createPaymentSimulation(payment.id, scenario, token, signal),
    );
    if (!isCurrent()) {
      return null;
    }
    if (simulation.retryAfterMs != null && simulation.retryAfterMs > 0) {
      try {
        await waitFor(simulation.retryAfterMs, signal);
      } catch {
        return null;
      }
    }
  }

  const polled = await watchPayment({
    paymentId: payment.id,
    signal,
    isCurrent,
    fallbackDelayMs: delayMs,
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
