import { z } from 'zod';

const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function formatPrice(value: number): string {
  return formatter.format(value);
}

/** Campo de precio como texto: admite coma o punto y hasta dos decimales. Vacío = sin precio. */
export const priceText = z
  .string()
  .trim()
  .refine(v => v === '' || /^\d{1,5}([.,]\d{1,2})?$/.test(v), 'Escribe solo el importe, por ejemplo 12,50.');

export function priceFromForm(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : Number(trimmed.replace(',', '.'));
}

export function priceToForm(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}
