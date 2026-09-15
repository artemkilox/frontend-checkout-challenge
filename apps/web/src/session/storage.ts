const TOKEN_KEY = 'checkout.sessionToken';
const SESSION_ID_KEY = 'checkout.sessionId';
const ORDER_ID_KEY = 'checkout.orderId';
const PAYMENT_ID_KEY = 'checkout.paymentId';
const ORDER_IDEMPOTENCY_KEY = 'checkout.idempotency.order';
const PAYMENT_IDEMPOTENCY_KEY = 'checkout.idempotency.payment';

function read(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(key);
}

function write(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

export const sessionStore = {
  getToken: () => read(TOKEN_KEY),
  setToken: (value: string | null) => write(TOKEN_KEY, value),
  getSessionId: () => read(SESSION_ID_KEY),
  setSessionId: (value: string | null) => write(SESSION_ID_KEY, value),
  getOrderId: () => read(ORDER_ID_KEY),
  setOrderId: (value: string | null) => write(ORDER_ID_KEY, value),
  getPaymentId: () => read(PAYMENT_ID_KEY),
  setPaymentId: (value: string | null) => write(PAYMENT_ID_KEY, value),
  getOrderIdempotencyKey: () => read(ORDER_IDEMPOTENCY_KEY),
  setOrderIdempotencyKey: (value: string | null) => write(ORDER_IDEMPOTENCY_KEY, value),
  getPaymentIdempotencyKey: () => read(PAYMENT_IDEMPOTENCY_KEY),
  setPaymentIdempotencyKey: (value: string | null) => write(PAYMENT_IDEMPOTENCY_KEY, value),
};
