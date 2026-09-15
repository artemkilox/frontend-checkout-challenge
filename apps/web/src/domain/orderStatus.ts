import type { OrderStatus } from '@/api/types';

export function orderStatusLabel(status: OrderStatus): string {
  if (status === 'paid') {
    return 'Оплачен';
  }
  if (status === 'confirmed') {
    return 'Оформлен';
  }
  return 'Ожидает оплаты';
}
