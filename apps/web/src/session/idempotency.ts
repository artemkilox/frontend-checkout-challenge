function fpKey(slot: string): string {
  return `checkout.idempotency.fp.${slot}`;
}

function valueKey(slot: string): string {
  return `checkout.idempotency.key.${slot}`;
}

export function idempotencyKeyFor(slot: string, fingerprint: string): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }
  const storedFp = window.localStorage.getItem(fpKey(slot));
  const storedKey = window.localStorage.getItem(valueKey(slot));
  if (storedKey && storedFp === fingerprint) {
    return storedKey;
  }
  const key = crypto.randomUUID();
  window.localStorage.setItem(fpKey(slot), fingerprint);
  window.localStorage.setItem(valueKey(slot), key);
  return key;
}

export function clearIdempotency(slot: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(fpKey(slot));
  window.localStorage.removeItem(valueKey(slot));
}
