'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import { formatRubFromKopecks } from '@/lib/money';
import { useShop } from '@/shop/ShopProvider';
import styles from './CartScreen.module.css';

export function CartScreen() {
  const shop = useShop();
  const router = useRouter();

  if (shop.bootError) {
    return (
      <section>
        <Notice tone="error">{shop.bootError.message}</Notice>
        <Button type="button" onClick={shop.retryBoot}>
          Повторить
        </Button>
      </section>
    );
  }

  if (!shop.ready || !shop.cart) {
    return <Notice>Загружаем корзину…</Notice>;
  }

  if (shop.cart.items.length === 0) {
    return (
      <section>
        <h1 className={styles.cart__title}>Корзина</h1>
        <Notice>Корзина пуста. Добавьте товар из каталога.</Notice>
        <Button type="button" onClick={() => router.push('/')}>
          В каталог
        </Button>
      </section>
    );
  }

  return (
    <section>
      <h1 className={styles.cart__title}>Корзина</h1>
      {shop.actionError ? <Notice tone="error">{shop.actionError.message}</Notice> : null}
      <ul className={styles.cart__list}>
        {shop.cart.items.map((item) => {
          const product = shop.productById.get(item.productId);
          const max = product?.stock ?? item.quantity;
          const pending = shop.pendingProductId === item.productId;
          return (
            <li key={item.productId} className={styles['cart-item']}>
              <div>
                <h2 className={styles['cart-item__title']}>{item.title}</h2>
                <p className={styles['cart-item__price']}>
                  {formatRubFromKopecks(item.unitPrice)} · {formatRubFromKopecks(item.lineTotal)}
                </p>
              </div>
              <div className={styles['cart-item__controls']}>
                <label htmlFor={`qty-${item.productId}`}>Количество</label>
                <input
                  id={`qty-${item.productId}`}
                  className={styles['cart-item__qty']}
                  type="number"
                  min={1}
                  max={max}
                  value={item.quantity}
                  disabled={pending}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    void shop.setQuantity(
                      item.productId,
                      Number.isFinite(next) ? next : item.quantity,
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    void shop.removeItem(item.productId);
                  }}
                >
                  Удалить
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.cart__total}>Итого: {formatRubFromKopecks(shop.cart.subtotal)}</p>
      <div className={styles.cart__actions}>
        <Button type="button" onClick={() => router.push('/checkout')}>
          К оформлению
        </Button>
      </div>
    </section>
  );
}
