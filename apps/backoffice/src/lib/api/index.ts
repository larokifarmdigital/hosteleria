export { api } from './browser';
export { getServerApi, getPublicApi } from './server';
export { ApiError, handleApiError, matchErrorCode, useErrorToast, reportError } from './errorHandling';
export type { ApiClient, ErrorCode, ErrorBody } from '@hosteleria/api-client';
export * from './toast';
