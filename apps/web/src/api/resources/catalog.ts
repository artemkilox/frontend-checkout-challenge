import { request } from '../client';
import { apiPaths } from '../paths';
import type { Product } from '../types';

export function listProducts(signal?: AbortSignal) {
  return request<Product[]>({
    method: 'GET',
    path: apiPaths.products,
    signal,
  });
}
