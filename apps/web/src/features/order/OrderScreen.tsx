'use client';

import { isAbortError, isApiError } from '@/api/error';
import { getOrder, listOrderPayments } from '@/api/resources/orders';
import type { Order } from '@/api/types';
import { describeDelivery } from '@/domain/deliveryText';
import { findActivePayment } from '@/domain/indexes';
import { isOrderPaid } from '@/domain/orderStatus';
import { PaymentDialog } from '@/features/payment/PaymentDialog';
import { paymentPollFallbackMs, watchPayment } from '@/features/payment/runCardPayment';
import { useSandboxPayment } from '@/features/payment/useSandboxPayment';
import { formatRubFromKopecks } from '@/lib/money';
import { sessionStore } from '@/session/storage';
import { withToken } from '@/session/withToken';
import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './OrderScreen.module.css';

export function OrderScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeWait, setResumeWait] = useState(false);
  const loadAbort = useRef<AbortController | null>(null);

  const payment = useSandboxPayment({
    orderId: order?.id,
    onPaid: (next) => {
      setOrder(next);
    },
    onFailed: (next) => {
      setOrder(next);
    },
    onCancelled: (next) => {
      setOrder(next);
    },
    onPayStart: () => {
      loadAbort.current?.abort();
      setResumeWait(false);
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    loadAbort.current = controller;
    setError(null);
    void (async () => {
      try {
        const result = await withToken((token) => getOrder(orderId, token, controller.signal));
        if (controller.signal.aborted) {
          return;
        }
        setOrder(result.data);
        sessionStore.setOrderId(result.data.id);
        if (result.data.paymentStatus !== 'pending') {
          return;
        }
        setResumeWait(true);
        const payments = await withToken((token) =>
          listOrderPayments(orderId, token, controller.signal),
        );
        if (controller.signal.aborted) {
          return;
        }
        const active = findActivePayment(payments.data);
        if (!active) {
          setResumeWait(false);
          return;
        }
        sessionStore.setPaymentId(active.id);
        await watchPayment({
          paymentId: active.id,
          signal: controller.signal,
          isCurrent: () => !controller.signal.aborted,
          fallbackDelayMs: paymentPollFallbackMs(),
        });
        if (controller.signal.aborted) {
          return;
        }
        const fresh = await withToken((token) => getOrder(orderId, token, controller.signal));
        if (controller.signal.aborted) {
          return;
        }
        setOrder(fresh.data);
        setResumeWait(false);
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) {
          return;
        }
        setError(isApiError(err) ? err.message : 'Не удалось загрузить заказ.');
        setResumeWait(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [orderId]);

  if (error && !order) {
    return (
      <section>
        <Notice tone="error">{error}</Notice>
        <Button type="button" onClick={() => router.push('/')}>
          В каталог
        </Button>
      </section>
    );
  }

  if (!order) {
    return <Notice>Загружаем заказ…</Notice>;
  }

  const paid = isOrderPaid(order);
  const cash = order.paymentMethod === 'cash_on_delivery';
  const canPay = order.status === 'awaiting_payment';
  const waiting = resumeWait || payment.waiting;

  return (
    <section>
      <h1 className={styles.order__title}>Заказ {order.number}</h1>
      {waiting ? <Notice>Проверяем оплату на сервере…</Notice> : null}
      {paid ? <p className={styles.order__lead}>Оплата подтверждена.</p> : null}
      {cash ? <p className={styles.order__lead}>Заказ оформлен, оплата при получении.</p> : null}
      {canPay && !waiting ? (
        <Notice>Заказ ещё не оплачен. Можно повторить оплату картой.</Notice>
      ) : null}
      {payment.error && !payment.dialogProps ? (
        <Notice tone="error">{payment.error}</Notice>
      ) : null}
      <div className={styles.order__card}>
        <p>Статус заказа: {order.status}</p>
        <p>Оплата: {order.paymentStatus}</p>
        <p>Доставка: {describeDelivery(order.delivery)}</p>
        <p>
          Получатель: {order.customer.name}, {order.customer.email}, {order.customer.phone}
        </p>
        <ul>
          {order.items.map((item) => (
            <li key={item.productId}>
              {item.title} × {item.quantity} — {formatRubFromKopecks(item.lineTotal)}
            </li>
          ))}
        </ul>
        <p>Товары: {formatRubFromKopecks(order.subtotal)}</p>
        <p>Доставка: {formatRubFromKopecks(order.shipping)}</p>
        <p>Сумма: {formatRubFromKopecks(order.total)}</p>
      </div>
      <div className={styles.order__actions}>
        {canPay ? (
          <Button
            type="button"
            onClick={() => {
              void payment.openDialog().catch((err: unknown) => {
                setError(isApiError(err) ? err.message : 'Не удалось загрузить тестовые карты.');
              });
            }}
          >
            Оплатить картой
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => router.push('/orders')}>
          Мои заказы
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/')}>
          В каталог
        </Button>
      </div>
      {payment.dialogProps ? <PaymentDialog {...payment.dialogProps} /> : null}
    </section>
  );
}
