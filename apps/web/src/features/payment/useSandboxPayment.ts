'use client';

import { hasApiCode, isAbortError, isApiError } from '@/api/error';
import { getOrder } from '@/api/resources/orders';
import { getSandbox } from '@/api/resources/sandbox';
import type { Order, PaymentScenario, Sandbox, SandboxCard } from '@/api/types';
import { isOrderPaid } from '@/domain/orderStatus';
import { paymentPollFallbackMs, runCardPayment } from '@/features/payment/runCardPayment';
import { withToken } from '@/session/withToken';
import { useCallback, useEffect, useRef, useState } from 'react';

type Params = {
  orderId: string | undefined;
  sandbox?: Sandbox | null;
  onPaid: (order: Order) => void;
  onFailed: (order: Order) => void;
  onCancelled: (order: Order) => void;
  onPayStart?: () => void;
};

export type SandboxPaymentDialogProps = {
  cards: SandboxCard[];
  selectedId: string;
  onSelect: (id: string) => void;
  busy: boolean;
  waiting: boolean;
  error: string | null;
  onPay: () => void;
  onCancel: () => void;
};

function applyCards(
  sandbox: Sandbox,
  setCards: (cards: SandboxCard[]) => void,
  setDelayMs: (value: number) => void,
  setCardId: (value: (current: string) => string) => void,
) {
  setCards(sandbox.cards);
  setDelayMs(paymentPollFallbackMs(sandbox.settlementDelayMs));
  if (sandbox.cards[0]) {
    const first = sandbox.cards[0].id;
    setCardId((current) => current || first);
  }
}

export function useSandboxPayment(params: Params): {
  openDialog: () => Promise<void>;
  dialogProps: SandboxPaymentDialogProps | null;
  waiting: boolean;
  error: string | null;
} {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [payOpen, setPayOpen] = useState(false);
  const [cards, setCards] = useState<SandboxCard[]>([]);
  const [cardId, setCardId] = useState('');
  const [delayMs, setDelayMs] = useState(400);
  const [payBusy, setPayBusy] = useState(false);
  const [payWait, setPayWait] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const payLock = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    if (!params.sandbox) {
      return;
    }
    applyCards(params.sandbox, setCards, setDelayMs, setCardId);
  }, [params.sandbox]);

  const openDialog = useCallback(async () => {
    const current = paramsRef.current;
    const source =
      current.sandbox && current.sandbox.cards.length > 0
        ? current.sandbox
        : (await getSandbox()).data;
    applyCards(source, setCards, setDelayMs, setCardId);
    setPayError(null);
    setPayOpen(true);
  }, []);

  const pay = async (scenario: PaymentScenario) => {
    const current = paramsRef.current;
    if (!current.orderId || payLock.current) {
      return;
    }
    current.onPayStart?.();
    payLock.current = true;
    const token = generation.current + 1;
    generation.current = token;
    const controller = new AbortController();
    setPayBusy(true);
    setPayError(null);
    if (scenario !== 'cancel') {
      setPayWait(true);
    }
    try {
      const result = await runCardPayment({
        orderId: current.orderId,
        scenario,
        signal: controller.signal,
        isCurrent: () => generation.current === token,
        delayMs,
      });
      if (!result || generation.current !== token) {
        return;
      }
      if (isOrderPaid(result.order)) {
        setPayOpen(false);
        current.onPaid(result.order);
        return;
      }
      if (result.payment.status === 'failed') {
        setPayError('Банк отказал в оплате. Можно выбрать карту и повторить.');
        current.onFailed(result.order);
        return;
      }
      if (result.payment.status === 'cancelled') {
        setPayError('Оплата отменена. Заказ сохранён, можно оплатить снова.');
        setPayOpen(false);
        current.onCancelled(result.order);
      }
    } catch (error) {
      if (isAbortError(error) || generation.current !== token) {
        return;
      }
      if (hasApiCode(error, 'ORDER_ALREADY_PAID') && current.orderId) {
        const fresh = await withToken((tokenValue) => getOrder(current.orderId!, tokenValue));
        setPayOpen(false);
        current.onPaid(fresh.data);
        return;
      }
      setPayError(isApiError(error) ? error.message : 'Не удалось выполнить оплату.');
    } finally {
      payLock.current = false;
      setPayBusy(false);
      setPayWait(false);
    }
  };

  const selected = cards.find((card) => card.id === cardId);

  const dialogProps: SandboxPaymentDialogProps | null =
    payOpen && cards.length > 0
      ? {
          cards,
          selectedId: cardId,
          onSelect: setCardId,
          busy: payBusy,
          waiting: payWait,
          error: payError,
          onPay: () => {
            void pay(selected?.scenario ?? 'success');
          },
          onCancel: () => {
            void pay('cancel');
          },
        }
      : null;

  return {
    openDialog,
    dialogProps,
    waiting: payWait,
    error: payError,
  };
}
