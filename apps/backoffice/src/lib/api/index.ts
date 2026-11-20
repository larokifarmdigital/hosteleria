/**
 * Barrel único de la capa de API.
 *
 *   import { api }                        from '@/lib/api';   // client (browser)
 *   import { getServerApi, getPublicApi } from '@/lib/api';   // server (RSC / actions)
 *   import { ApiError, handleApiError, matchErrorCode, useErrorToast } from '@/lib/api';
 *   import { Toaster, showErrorToast, showSuccessToast } from '@/lib/api';
 */
export { api } from './browser';
export { getServerApi, getPublicApi } from './server';
export { ApiError, handleApiError, matchErrorCode, useErrorToast, reportError } from './errorHandling';
export type { ApiClient, ErrorCode, ErrorBody } from '@hosteleria/api-client';
export * from './toast';
