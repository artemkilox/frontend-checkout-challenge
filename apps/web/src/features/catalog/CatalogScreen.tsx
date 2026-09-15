'use client';

import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import { formatRubFromKopecks } from '@/lib/money';
import { useShop } from '@/shop/ShopProvider';
import styles from './CatalogScreen.module.css';

export function CatalogScreen() {
  const shop = useShop();

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

  if (!shop.ready) {
    return <Notice>Загружаем каталог…</Notice>;
  }

  return (
    <section>
      <h1 className={styles.catalog__title}>Каталог</h1>
      <p className={styles.catalog__lead}>
        Товары с учебного склада. Остаток действует на одну корзину.
      </p>
      {shop.actionError ? <Notice tone="error">{shop.actionError.message}</Notice> : null}
      <ul className={styles.catalog__list}>
        {shop.products.map((product) => {
          const inCart = shop.quantityByProductId.get(product.id) ?? 0;
          const unavailable = product.stock < 1;
          const maxed = inCart >= product.stock;
          const pending = shop.pendingProductId === product.id;
          return (
            <li key={product.id} className={styles['product-card']}>
              <h2 className={styles['product-card__title']}>{product.title}</h2>
              <p className={styles['product-card__text']}>{product.description}</p>
              <p className={styles['product-card__price']}>{formatRubFromKopecks(product.price)}</p>
              <p className={styles['product-card__meta']}>
                {unavailable ? 'Нет в наличии' : `Доступно ${product.stock}`}
              </p>
              {unavailable ? (
                <Button type="button" disabled>
                  Недоступен
                </Button>
              ) : inCart > 0 ? (
                <div className={styles['product-card__stepper']}>
                  <Button
                    type="button"
                    variant="ghost"
                    compact
                    aria-label="Уменьшить количество"
                    disabled={pending}
                    onClick={() => {
                      void shop.setQuantity(product.id, inCart - 1);
                    }}
                  >
                    −
                  </Button>
                  <span className={styles['product-card__qty']} aria-live="polite">
                    {inCart}
                  </span>
                  <Button
                    type="button"
                    compact
                    aria-label="Увеличить количество"
                    disabled={pending || maxed}
                    onClick={() => {
                      void shop.addToCart(product.id);
                    }}
                  >
                    +
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    void shop.addToCart(product.id);
                  }}
                >
                  {pending ? 'Добавляем…' : 'В корзину'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
