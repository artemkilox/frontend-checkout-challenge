const DRAFT_KEY = 'checkout.formDraft';
const ATTEMPT_PREFIX = 'checkout.payAttempt.';

function read(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(key);
}

function write(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (value === null) {
    window.sessionStorage.removeItem(key);
    return;
  }
  window.sessionStorage.setItem(key, value);
}

export function readJson<T>(key: string): T | null {
  const raw = read(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  write(key, JSON.stringify(value));
}

export const formDraftKey = DRAFT_KEY;

export function paymentAttemptOf(orderId: string): number {
  const raw = read(`${ATTEMPT_PREFIX}${orderId}`);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function bumpPaymentAttempt(orderId: string): number {
  const next = paymentAttemptOf(orderId) + 1;
  write(`${ATTEMPT_PREFIX}${orderId}`, String(next));
  return next;
}
