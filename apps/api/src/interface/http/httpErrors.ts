/**
 * Mapea errores de dominio → códigos HTTP + mensaje.
 *
 * Esto vive en la capa HTTP (no en el dominio) a propósito: el dominio
 * no sabe que existe HTTP. Si mañana añadimos otra capa (CLI, cron,
 * webhook), reusa los mismos UCs y mapea excepciones a su manera.
 *
 * El Hono `onError` captura cualquier excepción no manejada; aquí
 * centralizamos la traducción.
 */
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';

import {
  SlugTakenError,
  RestaurantNotFoundError,
  NoSnapshotError,
  UnknownLocaleError
} from '../../domain/models/restaurant.js';
import {
  UserNotFoundError,
  EmailTakenError,
  InvalidCredentialsError,
  WeakPasswordError
} from '../../domain/models/user.js';
import { SessionNotFoundError } from '../../domain/models/session.js';
import {
  LanguageNotFoundError,
  LanguageCodeTakenError,
  LanguageInUseError
} from '../../domain/models/language.js';
import {
  SpaceNotFoundError,
  SpaceSlugTakenError,
  CannotDeleteLastSpaceError
} from '../../domain/models/space.js';
import {
  DishNotFoundError,
  DishCategoryNotFoundError,
  CategoryHasDishesError
} from '../../domain/models/dish.js';
import {
  WineNotFoundError,
  WineCategoryNotFoundError,
  CategoryHasWinesError
} from '../../domain/models/wine.js';
import {
  MediaNotFoundError,
  MediaHasReferencesError,
  MediaUploadNotConfirmedError
} from '../../domain/models/media.js';

import { CannotDeleteSelfError } from '../../application/users/deleteUserUseCase.js';
import { MustHaveDefaultSpaceError } from '../../application/spaces/patchSpaceUseCase.js';

/**
 * Convierte una excepción de dominio en HTTPException (si procede).
 * Devuelve `null` si no corresponde a ninguna categoría conocida — el
 * caller decide (típicamente dejar que Hono devuelva 500 + loguear).
 */
export function mapDomainError(err: unknown): HTTPException | null {
  // ─── 400 Bad Request ────────────────────────────────────────────
  if (err instanceof UnknownLocaleError) return http400(err);
  if (err instanceof WeakPasswordError) return http400(err);
  if (err instanceof NoSnapshotError) return http400(err);
  if (err instanceof LanguageInUseError) return http400(err);
  if (err instanceof CannotDeleteLastSpaceError) return http400(err);
  if (err instanceof CannotDeleteSelfError) return http400(err);
  if (err instanceof MustHaveDefaultSpaceError) return http400(err);
  if (err instanceof CategoryHasDishesError) return http400(err);
  if (err instanceof CategoryHasWinesError) return http400(err);
  if (err instanceof MediaHasReferencesError) return http400(err);
  if (err instanceof MediaUploadNotConfirmedError) return http400(err);

  // ─── 401 Unauthorized ───────────────────────────────────────────
  if (err instanceof InvalidCredentialsError) return http401(err);

  // ─── 404 Not Found ──────────────────────────────────────────────
  if (err instanceof RestaurantNotFoundError) return http404(err);
  if (err instanceof UserNotFoundError) return http404(err);
  if (err instanceof SessionNotFoundError) return http404(err);
  if (err instanceof LanguageNotFoundError) return http404(err);
  if (err instanceof SpaceNotFoundError) return http404(err);
  if (err instanceof DishNotFoundError) return http404(err);
  if (err instanceof DishCategoryNotFoundError) return http404(err);
  if (err instanceof WineNotFoundError) return http404(err);
  if (err instanceof WineCategoryNotFoundError) return http404(err);
  if (err instanceof MediaNotFoundError) return http404(err);

  // ─── 409 Conflict ───────────────────────────────────────────────
  if (err instanceof SlugTakenError) return http409(err);
  if (err instanceof EmailTakenError) return http409(err);
  if (err instanceof LanguageCodeTakenError) return http409(err);
  if (err instanceof SpaceSlugTakenError) return http409(err);

  return null;
}

const http400 = (e: Error) => new HTTPException(400, { message: e.message });
const http401 = (e: Error) => new HTTPException(401, { message: e.message });
const http404 = (e: Error) => new HTTPException(404, { message: e.message });
const http409 = (e: Error) => new HTTPException(409, { message: e.message });

/**
 * Handler global para `app.onError`. Convierte errores de dominio a HTTP,
 * y re-lanza los que ya son HTTPException para que Hono los maneje.
 */
export function globalErrorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) return err.getResponse();
  const mapped = mapDomainError(err);
  if (mapped) return mapped.getResponse();
  console.error('[unhandled]', err);
  return c.json({ error: 'internal_server_error' }, 500);
}
