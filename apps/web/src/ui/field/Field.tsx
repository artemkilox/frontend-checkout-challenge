import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import styles from './Field.module.css';

type Common = {
  label: string;
  error?: string;
  id: string;
};

export function TextField({
  label,
  error,
  id,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.field}>
      <label className={styles.field__label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.field__control} aria-invalid={Boolean(error)} {...props} />
      {error ? (
        <p className={styles.field__error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  error,
  id,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={styles.field}>
      <label className={styles.field__label} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.field__control} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error ? (
        <p className={styles.field__error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
