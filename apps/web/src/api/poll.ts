export async function pollUntil<T>(params: {
  read: (signal: AbortSignal) => Promise<T>;
  isFinal: (value: T) => boolean;
  delayMs: (value: T) => number;
  signal: AbortSignal;
  isCurrent: () => boolean;
}): Promise<T | null> {
  let latest: T | undefined;

  while (!params.signal.aborted) {
    if (!params.isCurrent()) {
      return null;
    }

    try {
      latest = await params.read(params.signal);
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
      await wait(params.delayMs(latest), params.signal);
    } catch {
      return null;
    }
  }

  return null;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
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
