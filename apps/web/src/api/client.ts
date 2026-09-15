import { getApiBaseUrl } from './config';
import { ApiError, isAbortError, type ApiFieldError } from './error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type RequestSpec = {
  path: string;
  method: HttpMethod;
  token?: string | null;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type TransportResult<T> = {
  data: T;
  status: number;
  requestId: string | null;
  location: string | null;
  retryAfterMs: number | null;
};

type Envelope<T> = {
  data: T;
  meta?: { requestId: string };
  links?: unknown;
};

type ErrorEnvelope = {
  error: {
    code?: string;
    message?: string;
    fields?: ApiFieldError[];
  };
  meta?: { requestId: string };
};

export async function request<T>(spec: RequestSpec): Promise<TransportResult<T>> {
  const headers = new Headers();
  if (spec.token) {
    headers.set('Authorization', `Bearer ${spec.token}`);
  }
  if (spec.idempotencyKey) {
    headers.set('Idempotency-Key', spec.idempotencyKey);
  }

  const init: RequestInit = {
    method: spec.method,
    headers,
    signal: spec.signal,
  };

  if (spec.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(spec.body);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${spec.path}`, init);
  } catch (cause) {
    if (isAbortError(cause)) {
      throw cause;
    }
    throw new ApiError({
      kind: 'network',
      message: 'Не удалось связаться с сервером. Проверьте соединение и повторите.',
    });
  }

  const requestId = response.headers.get('x-request-id');
  const location = response.headers.get('location');
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError({
        kind: 'http',
        status: response.status,
        message: 'Сервер вернул пустой ответ с ошибкой.',
        requestId,
      });
    }
    return {
      data: undefined as T,
      status: response.status,
      requestId,
      location,
      retryAfterMs,
    };
  }

  const parsed = await readJson(response, requestId);

  if (!response.ok) {
    throw toHttpError(parsed, response.status, requestId);
  }

  if (!isEnvelope<T>(parsed)) {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: 'Ответ сервера имеет неожиданный формат.',
      requestId,
    });
  }

  return {
    data: parsed.data,
    status: response.status,
    requestId: parsed.meta?.requestId ?? requestId,
    location,
    retryAfterMs,
  };
}

async function readJson(response: Response, requestId: string | null): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: 'Сервер вернул пустое тело ответа.',
      requestId,
    });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: 'Не удалось разобрать ответ сервера.',
      requestId,
    });
  }
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return typeof value === 'object' && value !== null && 'data' in value;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function toHttpError(parsed: unknown, status: number, requestId: string | null): ApiError {
  if (isErrorEnvelope(parsed) && parsed.error && typeof parsed.error === 'object') {
    const fields = Array.isArray(parsed.error.fields)
      ? parsed.error.fields.filter(isFieldError)
      : [];
    return new ApiError({
      kind: 'http',
      status,
      code: typeof parsed.error.code === 'string' ? parsed.error.code : null,
      message:
        typeof parsed.error.message === 'string'
          ? parsed.error.message
          : 'Запрос завершился ошибкой.',
      fields,
      requestId: parsed.meta?.requestId ?? requestId,
    });
  }
  return new ApiError({
    kind: 'http',
    status,
    message: 'Запрос завершился ошибкой.',
    requestId,
  });
}

function isFieldError(value: unknown): value is ApiFieldError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { path?: unknown; message?: unknown };
  return typeof record.path === 'string' && typeof record.message === 'string';
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return Math.round(seconds * 1000);
}
