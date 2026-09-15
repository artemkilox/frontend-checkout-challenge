'use client';

import { ApiError, hasApiCode, isAbortError, isApiError } from '@/api/error';
import { deleteCartItem, getCart, setCartItem } from '@/api/resources/cart';
import { listProducts } from '@/api/resources/catalog';
import type { Cart, Product } from '@/api/types';
import { productsById, quantityByProductId } from '@/domain/indexes';
import { withToken } from '@/session/withToken';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ShopContextValue = {
  ready: boolean;
  bootError: ApiError | null;
  retryBoot: () => void;
  products: Product[];
  productById: Map<string, Product>;
  cart: Cart | null;
  quantityByProductId: Map<string, number>;
  pendingProductId: string | null;
  actionError: ApiError | null;
  clearActionError: () => void;
  addToCart: (productId: string) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  refreshCart: (signal?: AbortSignal) => Promise<Cart | null>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<ApiError | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [bootNonce, setBootNonce] = useState(0);

  const productById = useMemo(() => productsById(products), [products]);
  const qtyMap = useMemo(() => quantityByProductId(cart?.items ?? []), [cart]);

  const refreshCart = useCallback(async (signal?: AbortSignal) => {
    const result = await withToken((token) => getCart(token, signal));
    if (signal?.aborted) {
      return null;
    }
    setCart(result.data);
    return result.data;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setBootError(null);
    void (async () => {
      try {
        const [catalog, nextCart] = await Promise.all([
          listProducts(controller.signal),
          withToken((token) => getCart(token, controller.signal)),
        ]);
        if (controller.signal.aborted) {
          return;
        }
        setProducts(catalog.data);
        setCart(nextCart.data);
        setReady(true);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setBootError(
          isApiError(error)
            ? error
            : new ApiError({
                kind: 'network',
                message: 'Не удалось загрузить магазин.',
              }),
        );
      }
    })();
    return () => controller.abort();
  }, [bootNonce]);

  const runCartChange = useCallback(
    async (productId: string, work: (token: string) => Promise<unknown>) => {
      if (pendingProductId) {
        return;
      }
      setPendingProductId(productId);
      setActionError(null);
      try {
        await withToken(work);
        await refreshCart();
      } catch (error) {
        if (isApiError(error)) {
          setActionError(error);
          if (hasApiCode(error, 'CART_VERSION_CONFLICT')) {
            await refreshCart();
          }
        }
      } finally {
        setPendingProductId(null);
      }
    },
    [pendingProductId, refreshCart],
  );

  const addToCart = useCallback(
    async (productId: string) => {
      const product = productById.get(productId);
      if (!product || product.stock < 1) {
        return;
      }
      const current = qtyMap.get(productId) ?? 0;
      if (current >= product.stock) {
        return;
      }
      await runCartChange(productId, (token) =>
        setCartItem(productId, { quantity: current + 1 }, token),
      );
    },
    [productById, qtyMap, runCartChange],
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const product = productById.get(productId);
      if (!product) {
        return;
      }
      if (quantity < 1) {
        await runCartChange(productId, (token) => deleteCartItem(productId, token));
        return;
      }
      const next = Math.min(quantity, product.stock);
      await runCartChange(productId, (token) => setCartItem(productId, { quantity: next }, token));
    },
    [productById, runCartChange],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      await runCartChange(productId, (token) => deleteCartItem(productId, token));
    },
    [runCartChange],
  );

  const value = useMemo<ShopContextValue>(
    () => ({
      ready,
      bootError,
      retryBoot: () => setBootNonce((n) => n + 1),
      products,
      productById,
      cart,
      quantityByProductId: qtyMap,
      pendingProductId,
      actionError,
      clearActionError: () => setActionError(null),
      addToCart,
      setQuantity,
      removeItem,
      refreshCart,
    }),
    [
      ready,
      bootError,
      products,
      productById,
      cart,
      qtyMap,
      pendingProductId,
      actionError,
      addToCart,
      setQuantity,
      removeItem,
      refreshCart,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) {
    throw new ApiError({
      kind: 'parse',
      message: 'Магазин ещё не готов.',
    });
  }
  return value;
}
