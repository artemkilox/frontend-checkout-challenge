import { request } from '../client';
import { apiPaths } from '../paths';
import type { CheckoutOptions, Quote, QuoteBody } from '../types';

export function getCheckoutOptions(token: string, signal?: AbortSignal) {
  return request<CheckoutOptions>({
    method: 'GET',
    path: apiPaths.checkoutOptions,
    token,
    signal,
  });
}

export function createQuote(body: QuoteBody, token: string, signal?: AbortSignal) {
  return request<Quote>({
    method: 'POST',
    path: apiPaths.quotes,
    token,
    body,
    signal,
  });
}

export function getQuote(quoteId: string, token: string) {
  return request<Quote>({
    method: 'GET',
    path: apiPaths.quote(quoteId),
    token,
  });
}
