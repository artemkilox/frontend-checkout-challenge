import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'ok';
}) {
  const extra = tone === 'error' ? styles.notice_error : tone === 'ok' ? styles.notice_ok : '';
  return <div className={`${styles.notice} ${extra}`.trim()}>{children}</div>;
}
