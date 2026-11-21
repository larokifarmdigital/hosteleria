import { z } from 'zod';

export const requiredText = (max: number) =>
  z.string().trim().min(1, 'Este campo no puede quedar vacío.').max(max, `No puede superar los ${max} caracteres.`);

export const optionalText = (max: number) =>
  z.string().trim().max(max, `No puede superar los ${max} caracteres.`);

export const optionalEmail = z
  .string()
  .trim()
  .refine(v => v === '' || z.string().email().safeParse(v).success, 'Escribe un email completo, por ejemplo hola@turestaurante.com.');

export const optionalUrl = z
  .string()
  .trim()
  .refine(v => v === '' || /^https?:\/\/[^\s.]+\.\S+$/.test(v), 'Pega el enlace completo, empezando por https://');

/** Un texto por idioma, sin validación: la longitud es recomendación, no límite. */
export const i18nValues = z.record(z.string());

/** Enlace de Google Maps o el código «Insertar un mapa» tal cual se copia. Vacío = sin mapa. */
export const optionalMap = z
  .string()
  .trim()
  .max(2000, 'Es demasiado largo. Copia solo el enlace o el código del mapa.')
  .refine(v => v === '' || /^https?:\/\/\S+$/.test(v) || /<iframe[^>]+src=["']https?:\/\//i.test(v), 'Pega el enlace del mapa o el código de «Insertar un mapa» de Google Maps.');

/** Elemento nuevo de una lista: el id lo pone el formulario para poder reordenar. */
export function newItemId(): string {
  return crypto.randomUUID();
}
