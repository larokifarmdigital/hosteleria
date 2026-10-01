import { zxcvbnOptions, zxcvbn } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/**
 * Validación de fortaleza de password.
 *
 * Usa `@zxcvbn-ts` — mide entropía real (longitud, diccionario, patrones),
 * no reglas de "una mayúscula + un número". Score 0-4:
 *   0: muy débil (ej. "password")
 *   1: débil (ej. "qwerty123")
 *   2: aceptable (ej. "hostel2026")
 *   3: fuerte
 *   4: muy fuerte
 *
 * Exigimos score ≥ 2. Además rechazamos si contiene el email o el nombre
 * del usuario (incluso con score alto — bruteforce con context es trivial).
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
  /** Datos del usuario que NO deben aparecer en el password. */
  userInputs?: Array<string | undefined | null>;
}

export interface PasswordCheckResult {
  ok: boolean;
  score: number;      // 0-4
  reason?: string;    // mensaje para el user si falla
}

/**
 * Comprueba una password. Si falla, el `reason` ya está formateado para
 * mostrarle al editor.
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

  // Guard adicional: la password no puede contener el email/nombre (case-insensitive)
  const lower = password.toLowerCase();
  for (const inp of extraInputs) {
    const chunk = inp.toLowerCase().split(/[@. -]/)[0];
    if (chunk.length >= 4 && lower.includes(chunk)) {
      return { ok: false, score: result.score, reason: 'La contraseña no debe incluir tu email o nombre.' };
    }
  }

  return { ok: true, score: result.score };
}
