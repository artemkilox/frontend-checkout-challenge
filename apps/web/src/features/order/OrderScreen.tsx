'use client';

import { hasApiCode, isAbortError, isApiError } from '@/api/error';
import { pollUntil } from '@/api/poll';
import { getOrder, listOrderPayments } from '@/api/resources/orders';
import { getPayment } from '@/api/resources/payments';
import { getSandbox } from '@/api/resources/sandbox';
import type { Order, Payment, SandboxCard } from '@/api/types';
import { describeDelivery } from '@/domain/deliveryText';
import { findActivePayment } from '@/domain/indexes';
import { PaymentDialog } from '@/features/payment/PaymentDialog';
import { isFinalPaymentStatus, runCardPayment } from '@/features/payment/runCardPayment';
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
  const [waiting, setWaiting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cards, setCards] = useState<SandboxCard[]>([]);
  const [cardId, setCardId] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [delayMs, setDelayMs] = useState(400);
  const generation = useRef(0);
  const payLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setError(null);
    void (async () => {
      try {
        const result = await withToken((token) => getOrder(orderId, token, controller.signal));
        if (generation.current !== current) {
          return;
        }
        setOrder(result.data);
        sessionStore.setOrderId(result.data.id);
        if (result.data.paymentStatus === 'pending') {
          setWaiting(true);
          const payments = await withToken((token) =>
            listOrderPayments(orderId, token, controller.signal),
          );
          const active = findActivePayment(payments.data);
          if (active) {
            sessionStore.setPaymentId(active.id);
            const polled = await pollUntil<Payment>({
              read: async (signal) => {
                const payment = await withToken((token) => getPayment(active.id, token, signal));
                return payment.data;
              },
              isFinal: (value) => isFinalPaymentStatus(value.status),
              delayMs: () => 400,
              signal: controller.signal,
              isCurrent: () => generation.current === current,
            });
            if (generation.current !== current) {
              return;
            }
            const fresh = await withToken((token) => getOrder(orderId, token, controller.signal));
            setOrder(fresh.data);
            if (polled && !isFinalPaymentStatus(polled.status)) {
              setWaiting(true);
            } else {
              setWaiting(false);
            }
          } else {
            setWaiting(false);
          }
        }
      } catch (err) {
        if (isAbortError(err) || generation.current !== current) {
          return;
        }
        setError(isApiError(err) ? err.message : 'Не удалось загрузить заказ.');
      }
    })();
    return () => {
      generation.current += 1;
      controller.abort();
    };
  }, [orderId]);

  const retryPay = async (scenario: 'success' | 'decline' | 'cancel') => {
    if (!order || payLock.current) {
      return;
    }
    payLock.current = true;
    const current = ++generation.current;
    const controller = new AbortController();
    setPayBusy(true);
    setPayError(null);
    if (scenario !== 'cancel') {
      setWaiting(true);
    }
    try {
      const result = await runCardPayment({
        orderId: order.id,
        scenario,
        signal: controller.signal,
        isCurrent: () => generation.current === current,
        delayMs,
      });
      if (!result || generation.current !== current) {
        return;
      }
      setOrder(result.order);
      if (result.order.status === 'paid') {
        setPayOpen(false);
        setWaiting(false);
        return;
      }
      if (result.payment.status === 'failed') {
        setPayError('Банк отказал в оплате. Можно повторить.');
      }
      if (result.payment.status === 'cancelled') {
        setPayOpen(false);
        setPayError('Оплата отменена.');
      }
    } catch (err) {
      if (hasApiCode(err, 'ORDER_ALREADY_PAID')) {
        const fresh = await withToken((token) => getOrder(orderId, token));
        setOrder(fresh.data);
        setPayOpen(false);
        return;
      }
      setPayError(isApiError(err) ? err.message : 'Не удалось оплатить.');
    } finally {
      payLock.current = false;
      setPayBusy(false);
      setWaiting(false);
    }
  };

  const openPay = async () => {
    try {
      const sandbox = await getSandbox();
      setCards(sandbox.data.cards);
      setDelayMs(Math.min(sandbox.data.settlementDelayMs || 400, 800));
      if (sandbox.data.cards[0]) {
        setCardId(sandbox.data.cards[0].id);
      }
      setPayOpen(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Не удалось загрузить тестовые карты.');
    }
  };

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

  const paid = order.status === 'paid' && order.paymentStatus === 'succeeded';
  const cash = order.paymentMethod === 'cash_on_delivery';
  const canPay = order.status === 'awaiting_payment';
  const selected = cards.find((card) => card.id === cardId);

  return (
    <section>
      <h1 className={styles.order__title}>Заказ {order.number}</h1>
      {waiting ? <Notice>Проверяем оплату на сервере…</Notice> : null}
      {paid ? <p className={styles.order__lead}>Оплата подтверждена.</p> : null}
      {cash ? <p className={styles.order__lead}>Заказ оформлен, оплата при получении.</p> : null}
      {canPay && !waiting ? (
        <Notice>Заказ ещё не оплачен. Можно повторить оплату картой.</Notice>
      ) : null}
      {payError ? <Notice tone="error">{payError}</Notice> : null}
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
          <Button type="button" onClick={() => void openPay()}>
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
      {payOpen ? (
        <PaymentDialog
          cards={cards}
          selectedId={cardId}
          onSelect={setCardId}
          busy={payBusy}
          waiting={waiting}
          error={payError}
          onPay={() => {
            void retryPay(selected?.scenario ?? 'success');
          }}
          onCancel={() => {
            void retryPay('cancel');
          }}
        />
      ) : null}
    </section>
  );
}
