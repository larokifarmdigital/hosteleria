'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { i18nFromForm, i18nToForm } from '@/lib/forms/i18n';
import { missingLocales } from '@/lib/forms/translations';
import { useCreateDishCategory, useCreateWineCategory, usePatchDishCategory, usePatchWineCategory } from '@/lib/query/hooks';
import type { MenuCategory, MenuKind, MenuScope } from './types';

interface Props {
  kind: MenuKind;
  scope: MenuScope;
  /** `null` = categoría nueva. */
  category: MenuCategory | null;
  nextOrder: number;
  onClose: () => void;
}

/** Pocos campos y cortos: un input por idioma, todos a la vista, en vez de pestañas. */
export function CategoryDialog({ kind, scope, category, nextOrder, onClose }: Props) {
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<Record<string, string>>({
    defaultValues: i18nToForm(category?.name, scope.locales)
  });

  const missing = missingLocales(watch(), scope.locales);

  const createDish = useCreateDishCategory();
  const createWine = useCreateWineCategory();
  const patchDish = usePatchDishCategory();
  const patchWine = usePatchWineCategory();
  const saving = createDish.isPending || createWine.isPending || patchDish.isPending || patchWine.isPending;

  const onSubmit = handleSubmit(async values => {
    if (!values[scope.defaultLocale]?.trim()) {
      setError(scope.defaultLocale, { message: 'Escribe el nombre de la categoría.' }, { shouldFocus: true });
      return;
    }
    const name = i18nFromForm(category?.name, values);
    try {
      if (category) {
        await (kind === 'wines' ? patchWine : patchDish).mutateAsync({ id: category.id, body: { name } });
        showSuccessToast('Categoría guardada');
      } else {
        if (kind === 'wines') await createWine.mutateAsync({ spaceId: scope.spaceId, name, order: nextOrder });
        else await createDish.mutateAsync({ spaceId: scope.spaceId, name, order: nextOrder, kind: kind === 'drinks' ? 'drink' : 'dish' });
        showSuccessToast('Categoría añadida');
      }
      onClose();
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto con lo escrito.
    }
  });

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-lg)] focus:outline-none">
          <Dialog.Title className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
            {category ? 'Cambiar nombre de la categoría' : 'Nueva categoría'}
          </Dialog.Title>
          <Dialog.Description className="m-0 mt-1.5 text-[13.5px] text-[color:var(--color-muted)]">
            {kind === 'dishes' ? 'Por ejemplo: Entrantes, Arroces, Postres.' : kind === 'wines' ? 'Por ejemplo: Tintos, Blancos, Espumosos.' : 'Por ejemplo: Cafés, Cervezas, Refrescos.'}
          </Dialog.Description>
          <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
            {scope.locales.map(code => (
              <Field
                key={code}
                id={`cat-${code}`}
                label={scope.locales.length > 1 ? `Nombre en ${(scope.localeNames[code] ?? code).toLowerCase()}` : 'Nombre'}
                required={code === scope.defaultLocale}
                error={errors[code]?.message}
                warning={missing.includes(code) && !errors[code] ? 'Falta esta traducción.' : undefined}
              >
                {control => <TextInput lang={code} autoComplete="off" {...control} {...register(code)} />}
              </Field>
            ))}
            <div className="mt-2 flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
