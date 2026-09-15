'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useShop } from '@/shop/ShopProvider';
import styles from './PageShell.module.css';

type PageShellProps = {
  children: ReactNode;
};

const NAV = [
  { href: '/', label: 'Каталог' },
  { href: '/cart', label: 'Корзина' },
  { href: '/checkout', label: 'Оформление' },
  { href: '/orders', label: 'Мои заказы' },
] as const;

export function PageShell({ children }: PageShellProps) {
  const shop = useShop();
  const count = shop.cart?.quantity ?? 0;

  return (
    <div className={styles['page-shell']}>
      <header className={styles['page-shell__header']}>
        <p className={styles['page-shell__title']}>Магазин</p>
        <nav className={styles['page-shell__nav']} aria-label="Основная навигация">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles['page-shell__link']}>
              {item.label}
              {item.href === '/cart' && count > 0 ? (
                <span className={styles['page-shell__count']}>{count}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>
      <main className={styles['page-shell__main']}>{children}</main>
    </div>
  );
}
