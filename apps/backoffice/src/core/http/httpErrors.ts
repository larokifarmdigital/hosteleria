// Las `HTTPException` de los middlewares llevan el code en `message`; aquí
// se traduce a texto humano. Lo que no sea `DomainError` ni `HTTPException`
// sale como 500 genérico.
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import { DomainError } from '../../domain/models/errors.js';

const HTTP_EXCEPTION_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Debes iniciar sesión para hacer esto.',
  ADMIN_REQUIRED: 'Solo los administradores pueden hacer esto.',
  RESTAURANT_FORBIDDEN: 'No tienes acceso a este restaurante.',
  SPACE_FORBIDDEN: 'No tienes acceso a este espacio.',
  MISSING_SLUG: 'Falta el identificador del restaurante en la URL.',
  RESTAURANT_NOT_FOUND: 'El restaurante no existe.',
  RATE_LIMITED: 'Demasiadas peticiones en poco tiempo. Espera un momento e inténtalo de nuevo.'
};

export interface ErrorBody {
  code: string;
  message: string;
}

export function globalErrorHandler(err: Error, c: Context): Response {
  if (err instanceof DomainError) {
    return c.json<ErrorBody>({ code: err.code, message: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    const code = err.message || 'HTTP_ERROR';
    const message = HTTP_EXCEPTION_MESSAGES[code] ?? err.message;
    return c.json<ErrorBody>({ code, message }, err.status);
  }

  console.error('[unhandled]', err);
  return c.json<ErrorBody>({ code: 'INTERNAL_ERROR', message: 'Error inesperado. Inténtalo de nuevo.' }, 500);
}
