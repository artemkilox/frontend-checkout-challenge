import { request } from '../client';
import { apiPaths } from '../paths';
import type { Cart, CartItem, SetCartItemBody } from '../types';

export function getCart(token: string, signal?: AbortSignal) {
  return request<Cart>({
    method: 'GET',
    path: apiPaths.cart,
    token,
    signal,
  });
}

export function getCartItem(productId: string, token: string) {
  return request<CartItem>({
    method: 'GET',
    path: apiPaths.cartItem(productId),
    token,
  });
}

export function setCartItem(
  productId: string,
  body: SetCartItemBody,
  token: string,
  signal?: AbortSignal,
) {
  return request<CartItem>({
    method: 'PUT',
    path: apiPaths.cartItem(productId),
    token,
    body,
    signal,
  });
}

export function deleteCartItem(productId: string, token: string, signal?: AbortSignal) {
  return request<void>({
    method: 'DELETE',
    path: apiPaths.cartItem(productId),
    token,
    signal,
  });
}
