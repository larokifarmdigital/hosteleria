/**
 * Wrapper sobre `@hono/zod-validator` que lanza `ValidationError` (DomainError)
 * cuando el input no cumple el schema. Así todas las respuestas de error del
 * API siguen el mismo shape `{ code, message }` servido por `globalErrorHandler`.
 */
import { zValidator } from '@hono/zod-validator';
import type { ZodSchema, ZodIssue } from 'zod';
import { ValidationError } from '../../domain/models/errors.js';

type Target = 'json' | 'query' | 'param' | 'form' | 'header' | 'cookie';

export function validate<T extends ZodSchema>(target: Target, schema: T) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const issues = result.error.issues.map((i: ZodIssue) => ({
        path: i.path.join('.'),
        message: translateZodIssue(i)
      }));
      throw new ValidationError(issues);
    }
  });
}

/** Traducción rápida de los códigos zod más comunes a español. */
function translateZodIssue(issue: ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `Se esperaba ${issue.expected} y vino ${issue.received}.`;
    case 'invalid_string':
      if (issue.validation === 'email') return 'Debe ser un email válido.';
      if (issue.validation === 'url') return 'Debe ser una URL válida.';
      if (issue.validation === 'uuid') return 'Debe ser un UUID válido.';
      return issue.message;
    case 'too_small':
      if (issue.type === 'string') return `Debe tener al menos ${issue.minimum} caracteres.`;
      if (issue.type === 'array') return `Debe tener al menos ${issue.minimum} elemento(s).`;
      if (issue.type === 'number') return `Debe ser ${issue.inclusive ? '≥' : '>'} ${issue.minimum}.`;
      return issue.message;
    case 'too_big':
      if (issue.type === 'string') return `No puede superar los ${issue.maximum} caracteres.`;
      if (issue.type === 'array') return `No puede tener más de ${issue.maximum} elemento(s).`;
      if (issue.type === 'number') return `Debe ser ${issue.inclusive ? '≤' : '<'} ${issue.maximum}.`;
      return issue.message;
    case 'invalid_enum_value':
      return `Valor inválido. Opciones: ${issue.options.join(', ')}.`;
    case 'unrecognized_keys':
      return `Campos no permitidos: ${issue.keys.join(', ')}.`;
    default:
      return issue.message;
  }
}
