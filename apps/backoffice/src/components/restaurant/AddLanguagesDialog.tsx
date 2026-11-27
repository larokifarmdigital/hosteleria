'use client';

import { useState } from 'react';
import type { Restaurant } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useCreateLanguage, useLanguages } from '@/lib/query/hooks';

interface Props {
  restaurant: Restaurant;
  isAdmin: boolean;
  /** Guarda los idiomas nuevos (códigos que se suman a los que ya tiene). */
  onAdd: (codes: string[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Añadir idiomas a la web: se marcan de la lista los que aún no tiene y, si falta
 * uno, se crea aquí mismo (no hay una pantalla de idiomas en Administración).
 */
export function AddLanguagesDialog({ restaurant, isAdmin, onAdd, onClose }: Props) {
  const { data: languages = [] } = useLanguages();
  const createLanguage = useCreateLanguage();
  const active = restaurant.activeLocales as string[];
  const available = languages.filter(l => !active.includes(l.code as string));
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggle = (code: string) => setPicked(list => (list.includes(code) ? list.filter(c => c !== code) : [...list, code]));

  const create = async () => {
    const code = newCode.trim().toLowerCase();
    const name = newName.trim();
    if (!/^[a-z]{2,3}$/.test(code)) { setError('El código son 2 o 3 letras, por ejemplo «eu» para el euskera.'); return; }
    if (!name) { setError('Escribe cómo se llama el idioma, por ejemplo «Euskara».'); return; }
    if (active.includes(code)) { setError('La web ya tiene ese idioma.'); return; }
    setError(null);
    try {
      if (!languages.some(l => l.code === code)) await createLanguage.mutateAsync({ code, name });
      setPicked(list => (list.includes(code) ? list : [...list, code]));
      setNewCode(''); setNewName(''); setCreating(false);
      showSuccessToast('Idioma creado', `${name} queda marcado para añadirlo.`);
    } catch {
      // El hook ya enseña el error.
    }
  };

  const save = async () => {
    setSaving(true);
    try { await onAdd(picked); onClose(); } catch { /* el hook ya avisa */ } finally { setSaving(false); }
  };

  return (
    <Modal
      open
      onClose={() => { if (!saving) onClose(); }}
      title="Añadir idiomas"
      description="Marca los idiomas que quieres añadir a la web. Después tendrás que traducir a ellos los textos que ya tienes."
    >
      {available.length > 0 ? (
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Idiomas que se pueden añadir</legend>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 max-[420px]:grid-cols-1">
            {available.map(l => {
              const code = l.code as string;
              return (
                <li key={l.id}>
                  <label htmlFor={`lang-${code}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-white px-3 text-[14px] font-semibold text-[color:var(--color-ink)]">
                    <input id={`lang-${code}`} type="checkbox" checked={picked.includes(code)} onChange={() => toggle(code)} className="h-5 w-5 flex-shrink-0 cursor-pointer" style={{ accentColor: 'var(--color-accent)' }} />
                    <span>{l.name} <span className="font-normal uppercase text-[color:var(--color-muted)]">· {code}</span></span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : (
        <p className="m-0 text-[14px] text-[color:var(--color-ink-soft)]">La web ya tiene todos los idiomas de la lista.</p>
      )}

      {isAdmin ? (
        creating ? (
          <div className="mt-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3.5">
            <p className="m-0 mb-3 text-[14px] font-semibold text-[color:var(--color-ink)]">Crear otro idioma</p>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 max-[420px]:grid-cols-1">
              <Field id="new-lang-code" label="Código" hint="2 o 3 letras">
                {c => <TextInput {...c} value={newCode} maxLength={3} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={e => setNewCode(e.target.value)} />}
              </Field>
              <Field id="new-lang-name" label="Nombre" hint="Como se escribe en ese idioma">
                {c => <TextInput {...c} value={newName} maxLength={40} autoComplete="off" onChange={e => setNewName(e.target.value)} />}
              </Field>
            </div>
            <p role="alert" className={error ? 'm-0 mt-2 text-[13px] font-semibold text-[color:var(--color-danger)]' : 'sr-only'}>{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" disabled={createLanguage.isPending} onClick={create}>{createLanguage.isPending ? 'Creando…' : 'Crear idioma'}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setError(null); }}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-4" variant="ghost" onClick={() => setCreating(true)}>¿No está en la lista? Crear otro idioma</Button>
        )
      ) : (
        <p className="m-0 mt-4 text-[12.5px] text-[color:var(--color-muted)]">¿Falta un idioma en la lista? Pide a un administrador que lo cree.</p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <Button disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving || picked.length === 0} onClick={save}>
          {saving ? 'Añadiendo…' : picked.length > 1 ? `Añadir ${picked.length} idiomas` : 'Añadir idioma'}
        </Button>
      </div>
    </Modal>
  );
}
