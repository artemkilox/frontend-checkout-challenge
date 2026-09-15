export type ApiFieldError = {
  path: string;
  message: string;
};

export type ApiErrorKind = 'network' | 'http' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly fields: readonly ApiFieldError[];
  readonly requestId: string | null;

  constructor(input: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    code?: string | null;
    fields?: readonly ApiFieldError[];
    requestId?: string | null;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.kind = input.kind;
    this.status = input.status ?? null;
    this.code = input.code ?? null;
    this.fields = input.fields ?? [];
    this.requestId = input.requestId ?? null;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isAbortError(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'name' in value && (value as { name: string }).name === 'AbortError';
}

export function hasApiCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}
