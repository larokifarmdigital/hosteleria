export { api } from './browser';
// Sin './server': usa next/headers y este barrel lo importan client components.
export { ApiError, handleApiError, matchErrorCode, useErrorToast, reportError } from './errorHandling';
export type { ApiClient, ErrorCode, ErrorBody } from '@hosteleria/api-client';
export * from './toast';
