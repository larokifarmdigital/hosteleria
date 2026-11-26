'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Restaurant } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useLanguages, usePatchRestaurant } from '@/lib/query/hooks';

interface Props {
  restaurant: Restaurant;
  isAdmin: boolean;
  onClose: () => void;
}

/** Qué idiomas tiene la web del restaurante y cuál es el principal. */
export function LanguagesDialog({ restaurant, isAdmin, onClose }: Props) {
  const { data: languages = [] } = useLanguages();
  const patch = usePatchRestaurant(restaurant.slug);
  const [active, setActive] = useState<string[]>(restaurant.activeLocales as string[]);
  const [main, setMain] = useState<string>(restaurant.defaultLocale as string);
  const [error, setError] = useState<string | null>(null);

  const before = restaurant.activeLocales as string[];
  const added = active.filter(code => !before.includes(code));
  const removed = before.filter(code => !active.includes(code));
  const changed = added.length > 0 || removed.length > 0 || main !== restaurant.defaultLocale;
  const nameOf = (code: string) => languages.find(l => l.code === code)?.name ?? code.toUpperCase();
  const list = (codes: string[]) => codes.map(nameOf).join(', ');

  const toggle = (code: string) => {
    setError(null);
    setActive(current => {
      const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
      // El principal tiene que ser uno de los activos.
      if (!next.includes(main) && next.length > 0) setMain(next[0]);
      return next;
    });
  };

  const save = async () => {
    if (active.length === 0) { setError('La web necesita al menos un idioma.'); return; }
    try {
      // En el orden de la lista de idiomas, no en el de marcado.
      const codes = languages.map(l => l.code as string).filter(code => active.includes(code));
      await patch.mutateAsync({ activeLocaleCodes: codes, defaultLocaleCode: main, state: 'draft' });
      showSuccessToast('Idiomas guardados', 'El cambio llega a la web cuando publiques el restaurante.');
      onClose();
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto.
    }
  };

  return (
    <Modal
      open
      onClose={() => { if (!patch.isPending) onClose(); }}
      title="Idiomas de la web"
      description="Marca los idiomas en los que se puede leer la web y elige el principal, que es el que se enseña primero."
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Idiomas de la web</legend>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {languages.map(l => {
            const code = l.code as string;
            const on = active.includes(code);
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-[color:var(--color-border)] bg-white px-3.5 py-1.5">
                <label htmlFor={`lang-${code}`} className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-[14px] font-semibold text-[color:var(--color-ink)]">
                  <input
                    id={`lang-${code}`}
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(code)}
                    className="h-6 w-6 flex-shrink-0 cursor-pointer"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>{l.name} <span className="font-normal uppercase text-[color:var(--color-muted)]">· {code}</span></span>
                </label>
                {on && (
                  <label htmlFor={`main-${code}`} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-medium text-[color:var(--color-ink-soft)]">
                    <input
                      id={`main-${code}`}
                      type="radio"
                      name="idioma-principal"
                      checked={main === code}
                      onChange={() => setMain(code)}
                      className="h-5 w-5 cursor-pointer"
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    Principal
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div role="status" className="mt-4 flex flex-col gap-2 text-[13px] leading-[1.5] text-[color:var(--color-ink-soft)]">
        {added.length > 0 && (
          <p className="m-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-warn-soft)] px-3.5 py-2.5">
            <strong className="font-semibold text-[color:var(--color-ink)]">Vas a añadir {list(added)}.</strong>{' '}
            Antes de poder publicar tendrás que traducir a {added.length === 1 ? 'ese idioma' : 'esos idiomas'} todos los textos que ya tienes escritos. El bloque «Pendiente» te dirá cuáles faltan.
          </p>
        )}
        {removed.length > 0 && (
          <p className="m-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3.5 py-2.5">
            <strong className="font-semibold text-[color:var(--color-ink)]">Vas a quitar {list(removed)}.</strong>{' '}
            Sus páginas dejarán de existir en la web cuando publiques. Los textos ya traducidos se guardan por si lo vuelves a activar.
          </p>
        )}
      </div>

      <p role="alert" className={error ? 'm-0 mt-3 text-[13px] font-semibold text-[color:var(--color-danger)]' : 'sr-only'}>{error}</p>

      <p className="m-0 mt-4 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
        ¿Falta un idioma en la lista?{' '}
        {isAdmin
          ? <Link href="/settings" className="inline-flex min-h-6 items-center font-semibold text-[color:var(--color-accent)] underline underline-offset-2">Añádelo en Administración</Link>
          : 'Pide a un administrador que lo añada.'}
      </p>

      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" disabled={patch.isPending} onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={patch.isPending || !changed} onClick={save}>{patch.isPending ? 'Guardando…' : 'Guardar idiomas'}</Button>
      </div>
    </Modal>
  );
}
