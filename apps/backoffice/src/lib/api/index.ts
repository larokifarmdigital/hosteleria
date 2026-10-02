/**
 * Barrel del lado "transporte" del api. Importar el `http` client, los
 * errores normalizados y los toasts desde aquí.
 *
 *   import { http, ApiError, showSuccessToast } from '@/lib/api';
 *
 * Para los hooks de TanStack Query, importar de '@/lib/query/hooks'.
 */
export { http } from './client';
export { ApiError, reportError } from './error';
export * from './toast';
