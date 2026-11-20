'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Field } from '@/components/ui/Field';
import { TextArea, TextInput } from '@/components/ui/inputs';

interface Props {
  /** Ruta del objeto i18n en el formulario, p. ej. `hero.title`. */
  name: string;
  label: string;
  hint?: string;
  locales: string[];
  activeLocale: string;
  localeNames: Record<string, string>;
  multiline?: boolean;
  /** Longitud recomendada: muestra contador, no bloquea. */
  recommendedMax?: number;
  className?: string;
}

/**
 * Un control por idioma; solo se ve el del idioma activo. Los demás siguen
 * montados (ocultos) para que el formulario conserve y valide sus valores.
 */
export function I18nField({ name, label, hint, locales, activeLocale, localeNames, multiline, recommendedMax, className }: Props) {
  const { register, control } = useFormContext();
  const values = (useWatch({ control, name }) ?? {}) as Record<string, string>;

  return (
    <div className={className}>
      {locales.map(code => {
        const id = `${name.replace(/\./g, '-')}-${code}`;
        const length = (values[code] ?? '').length;
        return (
          <div key={code} hidden={code !== activeLocale}>
            <Field
              id={id}
              label={label}
              labelSuffix={localeNames[code] ?? code}
              hint={hint}
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
