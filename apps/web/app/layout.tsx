import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/app-shell/AppProviders';
import { sans } from '@/ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Оформление заказа',
  description: 'Каталог, корзина и оформление заказа',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className={sans.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
