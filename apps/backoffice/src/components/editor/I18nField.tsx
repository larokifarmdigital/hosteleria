'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Field } from '@/components/ui/Field';
import { TextArea, TextInput } from '@/components/ui/inputs';
import { missingLocales } from '@/lib/forms/translations';
import { cn } from '@/lib/utils';

interface Props {
  /** Ruta del objeto i18n en el formulario, p. ej. `hero.title`. */
  name: string;
  label: string;
  hint?: string;
  locales: string[];
  activeLocale: string;
  localeNames: Record<string, string>;
  /** Idioma principal: su texto se enseña debajo, en pequeño, al traducir a los demás. */
  defaultLocale?: string;
  multiline?: boolean;
  /** Alto inicial del campo de varias líneas. */
  rows?: number;
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
export function I18nField({ name, label, hint, locales, activeLocale, localeNames, defaultLocale, multiline, rows, recommendedMax, error, errorFor, className }: Props) {
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
          <div key={code} hidden={code !== activeLocale}>
            <Field
              id={id}
              label={label}
              labelSuffix={localeNames[code] ?? code}
              hint={hint}
              describedBy={referenceId}
              // Mientras se escribe en el idioma principal no se avisa: la traducción se pide en su pestaña.
              warning={code !== defaultLocale && missing.includes(code) ? `Falta en ${(localeNames[code] ?? code).toLowerCase()}.` : undefined}
              error={code === errorFor ? error : undefined}
              count={recommendedMax ? { value: length, max: recommendedMax } : undefined}
              below={showReference ? <Original id={referenceId!} text={original!} lang={defaultLocale!} languageName={localeNames[defaultLocale!] ?? defaultLocale!} /> : undefined}
            >
              {control =>
                multiline ? (
                  <TextArea lang={code} rows={rows} {...control} {...register(`${name}.${code}`)} />
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

const LONG = 140;

/** El texto en el idioma principal, en una línea discreta bajo el campo; si es largo, se despliega. */
function Original({ id, text, lang, languageName }: { id: string; text: string; lang: string; languageName: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <div className="mt-1.5 flex flex-wrap items-start gap-x-2">
      <p id={id} className={cn('m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]', long && !open && 'line-clamp-2')}>
        <span className="font-semibold">En {languageName.toLowerCase()}:</span> <span lang={lang}>{text}</span>
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="inline-flex min-h-6 cursor-pointer items-center rounded-[6px] border-0 bg-transparent px-1 text-[12.5px] font-semibold text-[color:var(--color-accent)] underline-offset-2 hover:underline"
        >
          {open ? 'Ver menos' : `Ver todo en ${languageName.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}
