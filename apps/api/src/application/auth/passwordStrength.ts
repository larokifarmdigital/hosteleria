import { zxcvbnOptions, zxcvbn } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/**
 * Mide fortaleza con zxcvbn (score real por diccionario y patrones) en
 * vez de reglas "una mayúscula + un número" — "Password1!" las cumple y
 * es débil. Rechaza también passwords que incluyan el email/nombre del
 * user, incluso con score alto ("casabella2026" vale 0 si gestionas Casabella).
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
  userInputs?: Array<string | undefined | null>;
}

export interface PasswordCheckResult {
  ok: boolean;
  score: number;
  reason?: string;
}

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

  const lower = password.toLowerCase();
  for (const inp of extraInputs) {
    const chunk = inp.toLowerCase().split(/[@. -]/)[0];
    if (chunk.length >= 4 && lower.includes(chunk)) {
      return { ok: false, score: result.score, reason: 'La contraseña no debe incluir tu email o nombre.' };
    }
  }

  return { ok: true, score: result.score };
}
