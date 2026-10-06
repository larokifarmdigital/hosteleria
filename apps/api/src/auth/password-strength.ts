import { zxcvbnOptions, zxcvbn } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/**
 * Valida la **fortaleza** de un password antes de hashearlo.
 *
 * ⚠️ No confundir con `src/auth/password.ts` que es el **hashing argon2**.
 * Este archivo solo valida que el password sea razonable; una vez validado,
 * se lo pasa al hasher.
 *
 * **Cómo mide la fortaleza**: usa `@zxcvbn-ts` (port de la lib de Dropbox),
 * que estima entropía real (longitud, diccionario, patrones de teclado,
 * fechas, etc.) y da un score 0-4. No usamos reglas "una mayúscula + un
 * número" porque son mentira — "Password1!" las cumple y es débil.
 *
 * **Qué rechazamos**:
 *  - Score < 2 (débiles tipo "qwerty123").
 *  - Longitud fuera de [8, 200].
 *  - Password que contiene el email o nombre del user (incluso con score
 *    alto — "casabella2026" es malo si el user es admin de Casabella).
 */

let initialized = false;
function initZxcvbn() {
  if (initialized) return;
  zxcvbnOptions.setOptions({
    translations: zxcvbnEnPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary
    }
  });
  initialized = true;
}

export interface PasswordCheckInput {
  password: string;
  /** Email, nombre, slug del restaurante… — NO deben aparecer en el password. */
  userInputs?: Array<string | undefined | null>;
}

export interface PasswordCheckResult {
  ok: boolean;
  score: number;      // 0-4 (zxcvbn)
  reason?: string;    // mensaje listo para mostrar al usuario si falla
}

/**
 * Valida un password. Si falla, `reason` ya trae un mensaje en español
 * listo para mostrar en el form.
 *
 * Dónde se usa:
 *  - `routes/auth.ts` → POST /auth/reset, POST /auth/set-password.
 *  - `routes/users.ts` → POST /users (si admin crea con password explícita).
 */
export function checkPasswordStrength(input: PasswordCheckInput): PasswordCheckResult {
  initZxcvbn();
  const { password, userInputs = [] } = input;

  if (password.length < 8) {
    return { ok: false, score: 0, reason: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (password.length > 200) {
    return { ok: false, score: 0, reason: 'La contraseña es demasiado larga (máx. 200).' };
  }

  const extraInputs = userInputs.filter((s): s is string => typeof s === 'string' && s.length > 0);
  const result = zxcvbn(password, extraInputs);

  if (result.score < 2) {
    const warning = result.feedback.warning || 'Elige una contraseña menos predecible.';
    const suggestion = result.feedback.suggestions[0] || 'Combina palabras poco comunes o añade símbolos.';
    return {
      ok: false,
      score: result.score,
      reason: `${warning} ${suggestion}`.trim()
    };
  }

  // Guard adicional: email/nombre no pueden aparecer en el password.
  const lower = password.toLowerCase();
  for (const inp of extraInputs) {
    const chunk = inp.toLowerCase().split(/[@. -]/)[0];
    if (chunk.length >= 4 && lower.includes(chunk)) {
      return { ok: false, score: result.score, reason: 'La contraseña no debe incluir tu email o nombre.' };
    }
  }

  return { ok: true, score: result.score };
}
