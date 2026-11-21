import { z } from 'zod';

// Piezas de validación que comparten varias rutas.

export const i18nSchema = z.record(z.string());

export const assetIdSchema = z.string().min(1).max(64);

export const addressSchema = z.object({
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  country: z.string().optional()
}).partial();
