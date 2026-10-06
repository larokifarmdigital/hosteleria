/**
 * Serialización única de errores → `{ code, message }`.
 *
 *  - `code` — identificador estable para lógica del cliente.
 *  - `message` — texto en español listo para pintar directo al usuario.
 *
 * Fuentes posibles:
 *  1. `DomainError` — llevan `code` + `status` propios; el `message` ya es texto humano.
 *  2. `HTTPException` emitida por middlewares (auth, rate-limit, …) — el `message`
 *     es el code; aquí lo traducimos al texto humano via `HTTP_EXCEPTION_MESSAGES`.
 *  3. Zod validator — con el hook de `validate()` se re-lanza como `DomainError`.
 *  4. Lo demás → 500 `internal_error` genérico y log.
 */
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import { DomainError } from '../../domain/models/errors.js';

/** Textos para los códigos que viajan como `message` dentro de un `HTTPException`. */
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
