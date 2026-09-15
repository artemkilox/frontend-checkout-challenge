import type { Delivery } from '@/api/types';

export function describeDelivery(delivery: Delivery): string {
  if (delivery.method === 'pickup') {
    return delivery.pickupPointId === 'point-north'
      ? 'Самовывоз: Северный пункт'
      : 'Самовывоз: Центральный пункт';
  }
  const apartment = delivery.address.apartment ? `, кв. ${delivery.address.apartment}` : '';
  return `Курьер: ${delivery.address.city}, ${delivery.address.street}, ${delivery.address.house}${apartment}`;
}
