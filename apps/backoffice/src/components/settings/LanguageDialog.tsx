'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Language, Restaurant } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useCreateLanguage, useDeleteLanguage, usePatchLanguage } from '@/lib/query/hooks';

interface Props {
  /** `null` = idioma nuevo. */
  language: Language | null;
  /** Códigos que ya existen, para avisar antes de enviar. */
  existingCodes: string[];
  /** Restaurantes que lo tienen activo. */
  usedBy: Restaurant[];
  onClose: () => void;
}

function names(list: Restaurant[]): string {
  const all = list.map(r => r.name);
  return all.length <= 1 ? all[0] ?? '' : `${all.slice(0, -1).join(', ')} y ${all[all.length - 1]}`;
}

export function LanguageDialog({ language, existingCodes, usedBy, onClose }: Props) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ code: string; name: string }>({
    defaultValues: { code: language?.code ?? '', name: language?.name ?? '' }
  });
  const create = useCreateLanguage();
  const patch = usePatchLanguage();
  const remove = useDeleteLanguage();
  const saving = create.isPending || patch.isPending;
  const [deleting, setDeleting] = useState(false);

  const onSubmit = handleSubmit(async values => {
    const code = values.code.trim().toLowerCase();
    const name = values.name.trim();
    if (!language && !/^[a-z]{2}(-[a-z]{2})?$/.test(code)) {
      setError('code', { message: 'Usa el código de dos letras del idioma, por ejemplo «fr» para francés.' }, { shouldFocus: true });
      return;
    }
    if (!language && existingCodes.includes(code)) {
      setError('code', { message: `Ya hay un idioma con el código «${code}».` }, { shouldFocus: true });
      return;
    }
    if (!name) { setError('name', { message: 'Escribe el nombre del idioma.' }, { shouldFocus: true }); return; }
    try {
      if (language) {
        await patch.mutateAsync({ id: language.id, body: { name } });
        showSuccessToast('Idioma guardado');
      } else {
        await create.mutateAsync({ code, name });
        showSuccessToast('Idioma añadido', 'Actívalo en la ficha de cada restaurante que vaya a usarlo.');
      }
      onClose();
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto con lo escrito.
    }
  });

  return (
    <>
      <Modal
        open
        onClose={() => { if (!saving) onClose(); }}
        title={language ? `Editar ${language.name}` : 'Nuevo idioma'}
        description={language ? undefined : 'Queda disponible para todos los restaurantes. Cada uno decide si lo activa en su web.'}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {!language && (
            <Field id="l-code" label="Código" hint="Dos letras en minúscula: «fr», «it», «de»… Sale en la dirección de la web (/fr/) y no se puede cambiar después." error={errors.code?.message} required className="max-w-[220px]">
              {control => <TextInput autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={5} {...control} {...register('code')} />}
            </Field>
          )}
          <Field id="l-name" label="Nombre" hint="Como lo verán los visitantes en el selector de idioma, por ejemplo «Français»." error={errors.name?.message} required>
            {control => <TextInput autoComplete="off" {...control} {...register('name')} />}
          </Field>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando…' : language ? 'Guardar' : 'Añadir idioma'}</Button>
          </div>
        </form>

        {language && (
          <section aria-labelledby="l-delete" className="mt-6 border-t border-[color:var(--color-border)] pt-5">
            <h3 id="l-delete" className="m-0 text-[14px] font-bold text-[color:var(--color-ink)]">Eliminar el idioma</h3>
            {usedBy.length > 0 ? (
              <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">
                No se puede eliminar mientras {usedBy.length === 1 ? 'lo use' : 'lo usen'} {names(usedBy)}. Quítalo antes de los idiomas de {usedBy.length === 1 ? 'su ficha' : 'sus fichas'}.
              </p>
            ) : (
              <>
                <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">
                  Ningún restaurante lo tiene activo. Los textos que ya estuvieran escritos en este idioma se conservan, pero nadie podrá activarlo hasta que se vuelva a añadir.
                </p>
                <div className="mt-3">
                  <Button size="sm" className="text-[color:var(--color-danger)]" onClick={() => setDeleting(true)}>Eliminar idioma</Button>
                </div>
              </>
            )}
          </section>
        )}
      </Modal>

      {language && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`¿Eliminar ${language.name}?`}
          confirmLabel="Sí, eliminar"
          pendingLabel="Eliminando…"
          pending={remove.isPending}
          onConfirm={() => remove.mutateAsync(language.id).then(() => { showSuccessToast('Idioma eliminado'); setDeleting(false); onClose(); }, () => {})}
        >
          <p className="m-0">Dejará de poder activarse en los restaurantes. Se puede volver a añadir más adelante con el mismo código.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
