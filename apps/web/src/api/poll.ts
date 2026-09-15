export async function pollUntil<T>(params: {
  read: (signal: AbortSignal) => Promise<{
    value: T;
    retryAfterMs: number | null;
  }>;
  isFinal: (value: T) => boolean;
  delayMs: (value: T, retryAfterMs: number | null) => number;
  signal: AbortSignal;
  isCurrent: () => boolean;
}): Promise<T | null> {
  let latest: T | undefined;
  let retryAfterMs: number | null = null;

  while (!params.signal.aborted) {
    if (!params.isCurrent()) {
      return null;
    }

    try {
      const result = await params.read(params.signal);
      latest = result.value;
      retryAfterMs = result.retryAfterMs;
    } catch (error) {
      if (params.signal.aborted || !params.isCurrent()) {
        return null;
      }
      throw error;
    }

    if (!params.isCurrent()) {
      return null;
    }

    if (latest === undefined) {
      continue;
    }

    if (params.isFinal(latest)) {
      return latest;
    }

    try {
      await waitFor(params.delayMs(latest, retryAfterMs), params.signal);
    } catch {
      return null;
    }
  }

  return null;
}

export function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  const duration = Math.max(0, ms);
  if (duration === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, duration);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function pollDelayMs(retryAfterMs: number | null, fallbackMs: number): number {
  if (retryAfterMs != null && retryAfterMs > 0) {
    return retryAfterMs;
  }
  return Math.max(fallbackMs, 300);
}
