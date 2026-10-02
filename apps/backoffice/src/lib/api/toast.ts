'use client';

import { toast } from 'sonner';
export { Toaster } from 'sonner';

/**
 * Fachada sobre `sonner` — centraliza el estilo de los toasts del api.
 * Si en algún momento cambiamos de lib, solo tocamos este archivo.
 */
export const showErrorToast = (message: string, description?: string) =>
  toast.error(message, { description, duration: 6000 });

export const showSuccessToast = (message: string, description?: string) =>
  toast.success(message, { description, duration: 3500 });

export const showInfoToast = (message: string, description?: string) =>
  toast(message, { description, duration: 4000 });
