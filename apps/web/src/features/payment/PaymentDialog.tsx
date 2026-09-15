'use client';

import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import type { SandboxCard } from '@/api/types';
import styles from './PaymentDialog.module.css';

type PaymentDialogProps = {
  cards: SandboxCard[];
  selectedId: string;
  onSelect: (id: string) => void;
  busy: boolean;
  waiting: boolean;
  error: string | null;
  onPay: () => void;
  onCancel: () => void;
};

export function PaymentDialog({
  cards,
  selectedId,
  onSelect,
  busy,
  waiting,
  error,
  onPay,
  onCancel,
}: PaymentDialogProps) {
  return (
    <div className={styles.pay} role="presentation">
      <div
        className={styles.pay__dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
      >
        <h2 id="pay-title" className={styles.pay__title}>
          Тестовая оплата
        </h2>
        <p className={styles.pay__text}>
          Номер карты вводить не нужно. Выберите сценарий из списка.
        </p>
        {waiting ? <Notice>Ждём подтверждение оплаты…</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className={styles.pay__list} role="radiogroup" aria-label="Тестовые карты">
          {cards.map((card) => (
            <label key={card.id} className={styles.pay__option}>
              <input
                type="radio"
                name="sandbox-card"
                value={card.id}
                checked={selectedId === card.id}
                disabled={busy}
                onChange={() => onSelect(card.id)}
              />
              <span>
                {card.title}
                <br />
                {card.maskedNumber}
              </span>
            </label>
          ))}
        </div>
        <div className={styles.pay__actions}>
          <Button type="button" disabled={busy || !selectedId} onClick={onPay}>
            Оплатить
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
