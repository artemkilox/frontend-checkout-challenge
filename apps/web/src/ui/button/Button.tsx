import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  wide?: boolean;
  compact?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  wide,
  compact,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    variant === 'ghost' ? styles.button_ghost : '',
    wide ? styles.button_wide : '',
    compact ? styles.button_compact : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
