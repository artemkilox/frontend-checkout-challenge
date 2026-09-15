import type { ApiError } from '@/api/error';

const LABELS: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  city: 'city',
  street: 'street',
  house: 'house',
  apartment: 'apartment',
};

export function messagesFromApiFields(error: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < error.fields.length; i += 1) {
    const field = error.fields[i];
    const key = keyFromPath(field.path);
    if (key && !result[key]) {
      result[key] = humanFieldMessage(key);
    }
  }
  return result;
}

function keyFromPath(path: string): string | null {
  const parts = path.split('/');
  const last = parts[parts.length - 1];
  return last && last in LABELS ? last : null;
}

function humanFieldMessage(key: string): string {
  if (key === 'email') {
    return 'Проверьте email.';
  }
  if (key === 'phone') {
    return 'Проверьте телефон.';
  }
  return 'Проверьте это поле.';
}
