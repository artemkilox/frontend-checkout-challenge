import { request } from '../client';
import { apiPaths } from '../paths';
import type { Sandbox } from '../types';

export function getSandbox(signal?: AbortSignal) {
  return request<Sandbox>({
    method: 'GET',
    path: apiPaths.sandbox,
    signal,
  });
}
