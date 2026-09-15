import type { Address, Customer, Delivery, PaymentMethod } from '@/api/types';
import { isCompletePhone } from './phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CheckoutDraft = {
  name: string;
  email: string;
  phone: string;
  deliveryMethod: 'pickup' | 'courier';
  pickupPointId: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  paymentMethod: PaymentMethod;
};

export const emptyCheckoutDraft = (): CheckoutDraft => ({
  name: '',
  email: '',
  phone: '',
  deliveryMethod: 'pickup',
  pickupPointId: 'point-center',
  city: '',
  street: '',
  house: '',
  apartment: '',
  paymentMethod: 'card',
});

export function customerFromDraft(draft: CheckoutDraft): Customer {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
  };
}

export function deliveryFromDraft(draft: CheckoutDraft): Delivery {
  if (draft.deliveryMethod === 'pickup') {
    return {
      method: 'pickup',
      pickupPointId: draft.pickupPointId as 'point-center' | 'point-north',
    };
  }
  const address: Address = {
    city: draft.city.trim(),
    street: draft.street.trim(),
    house: draft.house.trim(),
  };
  const apartment = draft.apartment.trim();
  if (apartment) {
    address.apartment = apartment;
  }
  return { method: 'courier', address };
}

export function validateCustomer(customer: Customer): Record<string, string> {
  const errors: Record<string, string> = {};
  if (customer.name.length < 2) {
    errors.name = 'Укажите имя — не меньше двух символов.';
  }
  if (!EMAIL.test(customer.email)) {
    errors.email = 'Укажите корректный email.';
  }
  if (!isCompletePhone(customer.phone)) {
    errors.phone = 'Укажите телефон: +7 999 000-00-00.';
  }
  return errors;
}

export function validateDelivery(draft: CheckoutDraft): Record<string, string> {
  if (draft.deliveryMethod === 'pickup') {
    if (!draft.pickupPointId) {
      return { pickupPointId: 'Выберите пункт выдачи.' };
    }
    return {};
  }
  const errors: Record<string, string> = {};
  if (draft.city.trim().length < 2) {
    errors.city = 'Укажите город.';
  }
  if (draft.street.trim().length < 2) {
    errors.street = 'Укажите улицу.';
  }
  if (draft.house.trim().length < 1) {
    errors.house = 'Укажите дом.';
  }
  return errors;
}

export function isDraftReadyToQuote(draft: CheckoutDraft): boolean {
  return Object.keys(validateDelivery(draft)).length === 0;
}
