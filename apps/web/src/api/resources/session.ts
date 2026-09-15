import { request } from '../client';
import { apiPaths } from '../paths';
import type { Session, SessionInfo } from '../types';

export function createSession() {
  return request<Session>({
    method: 'POST',
    path: apiPaths.sessions,
    body: {},
  });
}

export function getSession(sessionId: string, token: string) {
  return request<SessionInfo>({
    method: 'GET',
    path: apiPaths.session(sessionId),
    token,
  });
}
