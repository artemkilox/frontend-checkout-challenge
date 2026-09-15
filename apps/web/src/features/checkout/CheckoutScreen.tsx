'use client';

import { hasApiCode, isAbortError, isApiError } from '@/api/error';
import { createQuote, getCheckoutOptions } from '@/api/resources/checkout';
import { createOrder, getOrder } from '@/api/resources/orders';
import { getSandbox } from '@/api/resources/sandbox';
import type { CheckoutOptions, Order, Quote, Sandbox } from '@/api/types';
import { messagesFromApiFields } from '@/domain/apiFields';
import {
  customerFromDraft,
  deliveryFromDraft,
  emptyCheckoutDraft,
  isDraftReadyToQuote,
  validateCustomer,
  validateDelivery,
  type CheckoutDraft,
} from '@/domain/checkoutRules';
import { formatPhoneMask, phoneFromInput } from '@/domain/phone';
import { PaymentDialog } from '@/features/payment/PaymentDialog';
import { useSandboxPayment } from '@/features/payment/useSandboxPayment';
import { formatRubFromKopecks } from '@/lib/money';
import { formDraftKey, readJson, writeJson } from '@/session/browserStore';
import { idempotencyKeyFor } from '@/session/idempotency';
import { sessionStore } from '@/session/storage';
import { withToken } from '@/session/withToken';
import { useShop } from '@/shop/ShopProvider';
import { Button } from '@/ui/button/Button';
import { SelectField, TextField } from '@/ui/field/Field';
import { Notice } from '@/ui/notice/Notice';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CheckoutScreen.module.css';

export function CheckoutScreen() {
  const shop = useShop();
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft>(emptyCheckoutDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [unpaidOrder, setUnpaidOrder] = useState<Order | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const submitLock = useRef(false);
  const payment = useSandboxPayment({
    orderId: unpaidOrder?.id,
    sandbox,
    onPaid: (order) => {
      sessionStore.setPaymentId(null);
      router.push(`/orders/${order.id}`);
    },
    onFailed: (order) => {
      setUnpaidOrder(order);
    },
    onCancelled: (order) => {
      setUnpaidOrder(order);
    },
  });

  useEffect(() => {
    const saved = readJson<CheckoutDraft>(formDraftKey);
    if (saved) {
      setDraft({
        ...emptyCheckoutDraft(),
        ...saved,
        phone: saved.phone ? phoneFromInput(saved.phone) : '',
      });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(formDraftKey, draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!shop.ready) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const [nextOptions, nextSandbox] = await Promise.all([
          withToken((token) => getCheckoutOptions(token, controller.signal)),
          getSandbox(controller.signal),
        ]);
        if (controller.signal.aborted) {
          return;
        }
        setOptions(nextOptions.data);
        setSandbox(nextSandbox.data);
        const pickup = nextOptions.data.deliveryMethods.find((method) => method.id === 'pickup');
        if (pickup?.pickupPoints[0]) {
          setDraft((current) =>
            current.pickupPointId
              ? current
              : { ...current, pickupPointId: pickup.pickupPoints[0].id },
          );
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setFormError(isApiError(error) ? error.message : 'Не удалось загрузить оформление.');
      }
    })();
    return () => controller.abort();
  }, [shop.ready]);

  useEffect(() => {
    const orderId = sessionStore.getOrderId();
    if (!orderId) {
      return;
    }
    void withToken((token) => getOrder(orderId, token))
      .then((result) => {
        if (result.data.status === 'awaiting_payment') {
          setUnpaidOrder(result.data);
        }
      })
      .catch(() => undefined);
  }, []);

  const delivery = useMemo(
    () => deliveryFromDraft(draft),
    [
      draft.deliveryMethod,
      draft.pickupPointId,
      draft.city,
      draft.street,
      draft.house,
      draft.apartment,
    ],
  );
  const deliveryReady = isDraftReadyToQuote(draft);
  const cartVersion = shop.cart?.version;

  useEffect(() => {
    if (!shop.ready || !shop.cart || shop.cart.items.length === 0 || !deliveryReady) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setQuoteBusy(true);
    void (async () => {
      try {
        const result = await withToken((token) =>
          createQuote({ cartVersion: shop.cart!.version, delivery }, token, controller.signal),
        );
        if (!current) {
          return;
        }
        setQuote(result.data);
      } catch (error) {
        if (isAbortError(error) || !current) {
          return;
        }
        if (hasApiCode(error, 'CART_VERSION_CONFLICT') || hasApiCode(error, 'QUOTE_EXPIRED')) {
          await shop.refreshCart(controller.signal);
          return;
        }
        if (hasApiCode(error, 'CART_EMPTY')) {
          setQuote(null);
          return;
        }
        setQuote(null);
        setFormError(isApiError(error) ? error.message : 'Не удалось рассчитать доставку.');
      } finally {
        if (current) {
          setQuoteBusy(false);
        }
      }
    })();
    return () => {
      current = false;
      controller.abort();
    };
  }, [shop.ready, cartVersion, shop.cart?.items.length, delivery, deliveryReady, shop.refreshCart]);

  const patch = (partial: Partial<CheckoutDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
    setFieldErrors({});
  };

  const placeOrder = async () => {
    if (submitLock.current) {
      return;
    }
    setFormError(null);
    const customer = customerFromDraft(draft);
    const errors = { ...validateCustomer(customer), ...validateDelivery(draft) };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!shop.cart || shop.cart.items.length === 0) {
      setFormError('Корзина пуста. Добавьте товары перед оформлением.');
      return;
    }
    if (!quote) {
      setFormError('Дождитесь расчёта доставки.');
      return;
    }
    submitLock.current = true;
    try {
      const body = {
        quoteId: quote.id,
        customer,
        paymentMethod: draft.paymentMethod,
      };
      const key = idempotencyKeyFor('order', JSON.stringify(body));
      const created = await withToken((token) => createOrder(body, token, key));
      sessionStore.setOrderId(created.data.id);
      await shop.refreshCart();
      if (created.data.paymentMethod === 'cash_on_delivery') {
        router.push(`/orders/${created.data.id}`);
        return;
      }
      setUnpaidOrder(created.data);
      await payment.openDialog();
    } catch (error) {
      if (hasApiCode(error, 'CART_VERSION_CONFLICT') || hasApiCode(error, 'QUOTE_EXPIRED')) {
        await shop.refreshCart();
        setFormError('Данные обновились. Проверьте заказ и отправьте снова.');
        return;
      }
      if (isApiError(error)) {
        setFieldErrors(messagesFromApiFields(error));
        setFormError(error.message);
      }
    } finally {
      submitLock.current = false;
    }
  };

  if (shop.bootError) {
    return (
      <section>
        <Notice tone="error">{shop.bootError.message}</Notice>
        <Button type="button" onClick={shop.retryBoot}>
          Повторить
        </Button>
      </section>
    );
  }

  if (!shop.ready) {
    return <Notice>Готовим оформление…</Notice>;
  }

  const emptyCart = !shop.cart || shop.cart.items.length === 0;
  const pickup = options?.deliveryMethods.find((method) => method.id === 'pickup');

  return (
    <section>
      <h1 className={styles.checkout__title}>Оформление</h1>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {!payment.dialogProps && payment.error ? (
        <Notice tone="error">{payment.error}</Notice>
      ) : null}
      {unpaidOrder ? (
        <Notice>
          Есть заказ {unpaidOrder.number}, не оплаченный картой.{' '}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void payment.openDialog();
            }}
          >
            Оплатить
          </Button>
        </Notice>
      ) : null}
      {emptyCart ? (
        <Notice>Пустую корзину оформить нельзя.</Notice>
      ) : (
        <form
          className={styles.checkout__form}
          onSubmit={(event) => {
            event.preventDefault();
            void placeOrder();
          }}
        >
          <TextField
            id="customer-name"
            label="Имя"
            autoComplete="name"
            value={draft.name}
            error={fieldErrors.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
          <div className={styles.checkout__row}>
            <TextField
              id="customer-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={draft.email}
              error={fieldErrors.email}
              onChange={(event) => patch({ email: event.target.value })}
            />
            <TextField
              id="customer-phone"
              label="Телефон"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 999 000-00-00"
              value={formatPhoneMask(draft.phone)}
              error={fieldErrors.phone}
              onChange={(event) => patch({ phone: phoneFromInput(event.target.value) })}
            />
          </div>
          <fieldset className={styles.checkout__radios}>
            <legend>Доставка</legend>
            {options?.deliveryMethods.map((method) => (
              <label key={method.id} className={styles.checkout__radio}>
                <input
                  type="radio"
                  name="delivery"
                  value={method.id}
                  checked={draft.deliveryMethod === method.id}
                  onChange={() => patch({ deliveryMethod: method.id })}
                />
                <span>{method.title}</span>
              </label>
            ))}
          </fieldset>
          {draft.deliveryMethod === 'pickup' ? (
            <SelectField
              id="pickup-point"
              label="Пункт выдачи"
              value={draft.pickupPointId}
              error={fieldErrors.pickupPointId}
              onChange={(event) => patch({ pickupPointId: event.target.value })}
            >
              {(pickup?.pickupPoints ?? []).map((point) => (
                <option key={point.id} value={point.id}>
                  {point.title} — {point.address}
                </option>
              ))}
            </SelectField>
          ) : (
            <>
              <TextField
                id="addr-city"
                label="Город"
                value={draft.city}
                error={fieldErrors.city}
                onChange={(event) => patch({ city: event.target.value })}
              />
              <TextField
                id="addr-street"
                label="Улица"
                value={draft.street}
                error={fieldErrors.street}
                onChange={(event) => patch({ street: event.target.value })}
              />
              <div className={styles.checkout__row}>
                <TextField
                  id="addr-house"
                  label="Дом"
                  value={draft.house}
                  error={fieldErrors.house}
                  onChange={(event) => patch({ house: event.target.value })}
                />
                <TextField
                  id="addr-apt"
                  label="Квартира"
                  value={draft.apartment}
                  error={fieldErrors.apartment}
                  onChange={(event) => patch({ apartment: event.target.value })}
                />
              </div>
            </>
          )}
          <fieldset className={styles.checkout__radios}>
            <legend>Оплата</legend>
            {options?.paymentMethods.map((method) => (
              <label key={method.id} className={styles.checkout__radio}>
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={draft.paymentMethod === method.id}
                  onChange={() => patch({ paymentMethod: method.id })}
                />
                <span>{method.title}</span>
              </label>
            ))}
          </fieldset>
          <div className={styles.checkout__totals}>
            {quoteBusy ? <p>Считаем доставку…</p> : null}
            {quote ? (
              <>
                <p>Товары: {formatRubFromKopecks(quote.subtotal)}</p>
                <p>Доставка: {formatRubFromKopecks(quote.shipping)}</p>
                <p>К оплате: {formatRubFromKopecks(quote.total)}</p>
              </>
            ) : (
              <p>Итог появится после расчёта.</p>
            )}
          </div>
          <Button type="submit" disabled={emptyCart || quoteBusy || !quote}>
            Оформить заказ
          </Button>
        </form>
      )}
      {payment.dialogProps ? <PaymentDialog {...payment.dialogProps} /> : null}
    </section>
  );
}
