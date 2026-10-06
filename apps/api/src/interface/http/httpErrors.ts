/**
 * Mapper único de errores de dominio → HTTP + handler global de errores.
 *
 * Vive aquí (no en el dominio) para que un CLI o cron pueda reusar los
 * UCs sin arrastrar HTTPException.
 *
 * **Shape del body de error** (contrato público):
 *   `{ "error": "<code>" }` como JSON, status según la tabla de abajo.
 *
 * **Tabla de códigos** (los códigos vienen del `message` de la excepción):
 *   400 — validación o invariantes:
 *     unknown_locale:<code>, weak_password..., no_snapshot, language_in_use,
 *     cannot_delete_last_space, cannot_delete_self, must_have_default_space,
 *     category_has_dishes, category_has_wines, media_in_use:dishes=X,spaces=Y,
 *     upload_not_found_in_r2, upload_size_mismatch, invalid_or_expired_token
 *   401 — invalid_credentials, unauthorized
 *   403 — admin_required, restaurant_forbidden, space_forbidden
 *   404 — <entity>_not_found:<idOrSlug>, not_found
 *   409 — slug_taken:<slug>, email_taken:<email>, language_code_taken:<code>,
 *         space_slug_taken:<slug>
 *   429 — rate_limited (lo emite el middleware de rate-limit)
 *   500 — internal_error (fallback)
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
  MediaUploadMissingError,
  MediaUploadSizeMismatchError
} from '../../domain/models/media.js';
import { InvalidTokenError } from '../../domain/services/tokenGenerator.js';

import { CannotDeleteSelfError } from '../../application/users/deleteUserUseCase.js';
import { MustHaveDefaultSpaceError } from '../../application/spaces/patchSpaceUseCase.js';

/** Devuelve el status HTTP correspondiente al error, o `null` si no lo reconocemos. */
export function statusForDomainError(err: unknown): number | null {
  // ─── 400 Bad Request ────────────────────────────────────────────
  if (err instanceof UnknownLocaleError) return 400;
  if (err instanceof WeakPasswordError) return 400;
  if (err instanceof NoSnapshotError) return 400;
  if (err instanceof LanguageInUseError) return 400;
  if (err instanceof CannotDeleteLastSpaceError) return 400;
  if (err instanceof CannotDeleteSelfError) return 400;
  if (err instanceof MustHaveDefaultSpaceError) return 400;
  if (err instanceof CategoryHasDishesError) return 400;
  if (err instanceof CategoryHasWinesError) return 400;
  if (err instanceof MediaHasReferencesError) return 400;
  if (err instanceof MediaUploadMissingError) return 400;
  if (err instanceof MediaUploadSizeMismatchError) return 400;
  if (err instanceof InvalidTokenError) return 400;

  // ─── 401 Unauthorized ───────────────────────────────────────────
  if (err instanceof InvalidCredentialsError) return 401;

  // ─── 404 Not Found ──────────────────────────────────────────────
  if (err instanceof RestaurantNotFoundError) return 404;
  if (err instanceof UserNotFoundError) return 404;
  if (err instanceof SessionNotFoundError) return 404;
  if (err instanceof LanguageNotFoundError) return 404;
  if (err instanceof SpaceNotFoundError) return 404;
  if (err instanceof DishNotFoundError) return 404;
  if (err instanceof DishCategoryNotFoundError) return 404;
  if (err instanceof WineNotFoundError) return 404;
  if (err instanceof WineCategoryNotFoundError) return 404;
  if (err instanceof MediaNotFoundError) return 404;

  // ─── 409 Conflict ───────────────────────────────────────────────
  if (err instanceof SlugTakenError) return 409;
  if (err instanceof EmailTakenError) return 409;
  if (err instanceof LanguageCodeTakenError) return 409;
  if (err instanceof SpaceSlugTakenError) return 409;

  return null;
}

/**
 * Handler para `app.onError`. Serializa cualquier error como JSON
 * `{ "error": "<code>" }`:
 *   - HTTPException → `{ error: err.message }` + err.status.
 *   - Error de dominio reconocido → mismo shape, status del mapa.
 *   - Lo demás → 500 `{ error: "internal_error" }` y log.
 */
export function globalErrorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  const status = statusForDomainError(err);
  if (status !== null) {
    return c.json({ error: err.message }, status as 400 | 401 | 403 | 404 | 409);
  }
  console.error('[unhandled]', err);
  return c.json({ error: 'internal_error' }, 500);
}
