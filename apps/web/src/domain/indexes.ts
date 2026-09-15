import type { CartItem, Product } from '@/api/types';

export function mapByKey<T>(items: readonly T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    map.set(key(item), item);
  }
  return map;
}

export function productsById(products: readonly Product[]): Map<string, Product> {
  return mapByKey(products, (product) => product.id);
}

export function quantityByProductId(items: readonly CartItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    map.set(item.productId, item.quantity);
  }
  return map;
}

export function findActivePayment<T extends { status: string }>(payments: readonly T[]): T | null {
  for (let i = 0; i < payments.length; i += 1) {
    const payment = payments[i];
    if (payment.status === 'pending' || payment.status === 'processing') {
      return payment;
    }
  }
  return null;
}
