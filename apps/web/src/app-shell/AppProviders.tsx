'use client';

import { ShopProvider } from '@/shop/ShopProvider';
import { PageShell } from '@/ui/page-shell/PageShell';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ShopProvider>
      <PageShell>{children}</PageShell>
    </ShopProvider>
  );
}
