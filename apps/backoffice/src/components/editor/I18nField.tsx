'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Field } from '@/components/ui/Field';
import { TextArea, TextInput } from '@/components/ui/inputs';
import { localeList, missingLocales } from '@/lib/forms/translations';
import { cn } from '@/lib/utils';

interface Props {
  /** Ruta del objeto i18n en el formulario, p. ej. `hero.title`. */
  name: string;
  label: string;
  hint?: string;
  locales: string[];
  activeLocale: string;
  localeNames: Record<string, string>;
  /** Idioma principal: su texto se enseña como referencia al traducir a los demás. */
  defaultLocale?: string;
  /** Dónde va la referencia: al lado del campo (campos anchos) o encima. */
  reference?: 'side' | 'above';
  multiline?: boolean;
  /** Longitud recomendada: muestra contador, no bloquea. */
  recommendedMax?: number;
  /** Error a mostrar y en qué idioma: solo el control de ese idioma lo enseña. */
  error?: string;
  errorFor?: string;
  className?: string;
}

/**
 * Un control por idioma; solo se ve el del idioma activo. Los demás siguen
 * montados (ocultos) para que el formulario conserve y valide sus valores.
 */
export function I18nField({ name, label, hint, locales, activeLocale, localeNames, defaultLocale, reference = 'above', multiline, recommendedMax, error, errorFor, className }: Props) {
  const { register, control } = useFormContext();
  const values = (useWatch({ control, name }) ?? {}) as Record<string, string>;
  const missing = missingLocales(values, locales);
  const original = defaultLocale ? values[defaultLocale]?.trim() : undefined;

  return (
    <div className={className}>
      {locales.map(code => {
        const id = `${name.replace(/\./g, '-')}-${code}`;
        const length = (values[code] ?? '').length;
        const showReference = !!original && code !== defaultLocale;
        const referenceId = showReference ? `${id}-reference` : undefined;
        return (
          <div key={code} hidden={code !== activeLocale} className={cn(showReference && reference === 'side' && 'md:grid md:grid-cols-2 md:gap-5')}>
            {showReference && (
              <div id={referenceId} className={cn('min-w-0', reference === 'side' ? 'mb-3 md:mb-0' : 'mb-3')}>
                <p className="m-0 mb-1.5 text-[13.5px] font-semibold text-[color:var(--color-muted)]">
                  {label} en {(localeNames[defaultLocale!] ?? defaultLocale!).toLowerCase()}
                </p>
                <p lang={defaultLocale} className="m-0 whitespace-pre-wrap break-words rounded-[10px] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-3.5 py-2.5 text-[15px] leading-[1.5] text-[color:var(--color-ink-soft)]">
                  {original}
                </p>
              </div>
            )}
            <Field
              id={id}
              label={label}
              labelSuffix={localeNames[code] ?? code}
              hint={hint}
              describedBy={referenceId}
              warning={missing.length > 0 ? `Falta en ${localeList(missing, localeNames)}.` : undefined}
              error={code === errorFor ? error : undefined}
              count={recommendedMax ? { value: length, max: recommendedMax } : undefined}
            >
              {control =>
                multiline ? (
                  <TextArea lang={code} {...control} {...register(`${name}.${code}`)} />
                ) : (
                  <TextInput lang={code} {...control} {...register(`${name}.${code}`)} />
                )
              }
            </Field>
          </div>
        );
      })}
    </div>
  );
}
