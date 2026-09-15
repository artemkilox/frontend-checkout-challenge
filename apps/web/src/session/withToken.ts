import { createSession } from '@/api/resources/session';
import { isApiError } from '@/api/error';
import { sessionStore } from './storage';

export async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await resolveToken();
  try {
    return await fn(token);
  } catch (error) {
    if (!isApiError(error) || error.status !== 401) {
      throw error;
    }
    sessionStore.setToken(null);
    sessionStore.setSessionId(null);
    const next = await resolveToken();
    return fn(next);
  }
}

async function resolveToken(): Promise<string> {
  const existing = sessionStore.getToken();
  if (existing) {
    return existing;
  }
  const { data } = await createSession();
  sessionStore.setToken(data.token);
  sessionStore.setSessionId(data.id);
  return data.token;
}
