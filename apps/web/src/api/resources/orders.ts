import { request } from '../client';
import { apiPaths } from '../paths';
import type { CreateOrderBody, Order, Payment } from '../types';

export function createOrder(
  body: CreateOrderBody,
  token: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return request<Order>({
    method: 'POST',
    path: apiPaths.orders,
    token,
    body,
    idempotencyKey,
    signal,
  });
}

export function listOrders(token: string, signal?: AbortSignal) {
  return request<Order[]>({
    method: 'GET',
    path: apiPaths.orders,
    token,
    signal,
  });
}

export function getOrder(orderId: string, token: string, signal?: AbortSignal) {
  return request<Order>({
    method: 'GET',
    path: apiPaths.order(orderId),
    token,
    signal,
  });
}

export function listOrderPayments(orderId: string, token: string, signal?: AbortSignal) {
  return request<Payment[]>({
    method: 'GET',
    path: apiPaths.orderPayments(orderId),
    token,
    signal,
  });
}

export function createOrderPayment(
  orderId: string,
  token: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return request<Payment>({
    method: 'POST',
    path: apiPaths.orderPayments(orderId),
    token,
    body: {},
    idempotencyKey,
    signal,
  });
}
