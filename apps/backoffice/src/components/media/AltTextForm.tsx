'use client';

import { useRef, useState } from 'react';
import type { MediaAsset } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { usePatchMedia } from '@/lib/query/hooks';
import type { MediaScope } from './types';

const RECOMMENDED_MAX = 140;

interface Props {
  asset: MediaAsset;
  scope: MediaScope;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onSaved: (asset: MediaAsset) => void;
}

/** Descripción de la foto en todos los idiomas del restaurante. No deja guardar si falta alguno. */
export function AltTextForm({ asset, scope, submitLabel, cancelLabel, onCancel, onSaved }: Props) {
  const { locales, localeNames } = scope;
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(locales.map(code => [code, asset.altText?.[code] ?? '']))
  );
  const [submitted, setSubmitted] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const patch = usePatchMedia(asset.id);

  const nameOf = (code: string) => localeNames[code] ?? code.toUpperCase();
  const isEmpty = (code: string) => !values[code]?.trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Este formulario vive dentro de otros (el panel del plato): que no los envíe.
    e.stopPropagation();
    setSubmitted(true);
    const firstEmpty = locales.find(isEmpty);
    if (firstEmpty) {
      inputs.current[firstEmpty]?.focus();
      return;
    }
    try {
      // Se parte de lo que había para no borrar idiomas que ya no están activos.
      const altText = { ...asset.altText, ...Object.fromEntries(locales.map(code => [code, values[code].trim()])) };
      onSaved(await patch.mutateAsync({ altText }));
    } catch {
      // El hook ya muestra el error; el formulario conserva lo escrito.
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* Decorativa: los campos de al lado son justo su descripción. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.publicUrl}
          alt=""
          className="h-40 w-full flex-shrink-0 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] object-cover sm:h-36 sm:w-36"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--color-ink-soft)]">
            Cuenta qué se ve, como se lo dirías a alguien por teléfono: «Terraza con mesas de madera al atardecer».
            La leen quienes no pueden ver la foto, y también Google.
          </p>
          {locales.map(code => (
            <Field
              key={code}
              id={`alt-${asset.id}-${code}`}
              label={locales.length > 1 ? `Descripción en ${nameOf(code)}` : 'Descripción'}
              required
              error={submitted && isEmpty(code) ? `Escribe la descripción en ${nameOf(code)}.` : undefined}
              count={{ value: values[code].length, max: RECOMMENDED_MAX }}
            >
              {control => (
                <TextInput
                  {...control}
                  ref={el => { inputs.current[code] = el; }}
                  lang={code}
                  autoComplete="off"
                  value={values[code]}
                  onChange={e => setValues(v => ({ ...v, [code]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" disabled={patch.isPending} onClick={onCancel}>{cancelLabel}</Button>
        <Button type="submit" variant="primary" disabled={patch.isPending}>{patch.isPending ? 'Guardando…' : submitLabel}</Button>
      </div>
    </form>
  );
}
