'use client';

import { isAbortError, isApiError } from '@/api/error';
import { listOrders } from '@/api/resources/orders';
import type { Order } from '@/api/types';
import { orderStatusLabel } from '@/domain/orderStatus';
import { formatRubFromKopecks } from '@/lib/money';
import { withToken } from '@/session/withToken';
import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './OrdersScreen.module.css';

export function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await withToken((token) => listOrders(token, controller.signal));
        if (controller.signal.aborted) {
          return;
        }
        setOrders(result.data);
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) {
          return;
        }
        setError(isApiError(err) ? err.message : 'Не удалось загрузить заказы.');
      }
    })();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <section>
        <h1 className={styles.orders__title}>Мои заказы</h1>
        <Notice tone="error">{error}</Notice>
      </section>
    );
  }

  if (!orders) {
    return <Notice>Загружаем заказы…</Notice>;
  }

  if (orders.length === 0) {
    return (
      <section>
        <h1 className={styles.orders__title}>Мои заказы</h1>
        <Notice>Пока нет заказов в этой сессии.</Notice>
        <Button type="button" onClick={() => router.push('/')}>
          В каталог
        </Button>
      </section>
    );
  }

  return (
    <section>
      <h1 className={styles.orders__title}>Мои заказы</h1>
      <ul className={styles.orders__list}>
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              className={styles.orders__item}
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <div>
                <p className={styles.orders__number}>{order.number}</p>
                <p className={styles.orders__meta}>{orderStatusLabel(order.status)}</p>
              </div>
              <p className={styles.orders__meta}>{formatRubFromKopecks(order.total)}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
