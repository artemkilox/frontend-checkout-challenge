export function phoneFromInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) {
    return '';
  }
  let local = digits;
  if (local[0] === '7' || local[0] === '8') {
    local = local.slice(1);
  }
  local = local.slice(0, 10);
  if (local.length === 0) {
    return '';
  }
  return `+7${local}`;
}

export function formatPhoneMask(stored: string): string {
  if (!stored) {
    return '';
  }
  const digits = stored.replace(/\D/g, '');
  let local = digits;
  if (local[0] === '7' || local[0] === '8') {
    local = local.slice(1);
  }
  local = local.slice(0, 10);
  let view = '+7';
  if (local.length > 0) {
    view += ` ${local.slice(0, 3)}`;
  }
  if (local.length > 3) {
    view += ` ${local.slice(3, 6)}`;
  }
  if (local.length > 6) {
    view += `-${local.slice(6, 8)}`;
  }
  if (local.length > 8) {
    view += `-${local.slice(8, 10)}`;
  }
  return view;
}

export function isCompletePhone(stored: string): boolean {
  return /^\+7\d{10}$/.test(stored);
}
