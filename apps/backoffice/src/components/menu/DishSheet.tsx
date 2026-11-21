'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Dish, DishCategory } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { ImageField } from '@/components/media/ImageField';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { Checkbox, Select, TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { i18nFromForm, i18nToForm } from '@/lib/forms/i18n';
import { priceFromForm, priceText, priceToForm } from '@/lib/forms/price';
import { i18nValues } from '@/lib/forms/rules';
import { useCreateDish, useDeleteDish, useUpdateDish } from '@/lib/query/hooks';
import { ItemSheetShell } from './ItemSheetShell';
import { categoryLabel, type MenuScope } from './types';

const schema = z.object({
  categoryId: z.string().min(1, 'Elige una categoría.'),
  name: i18nValues,
  note: i18nValues,
  price: priceText,
  active: z.boolean(),
  imageAssetId: z.string().nullable()
});
type FormValues = z.infer<typeof schema>;

interface Props {
  scope: MenuScope;
  categories: DishCategory[];
  /** `null` = plato nuevo. */
  dish: Dish | null;
  /** Categoría preseleccionada al crear. */
  initialCategoryId?: string;
  /** Posición del nuevo plato dentro de su categoría. */
  nextOrder: number;
  onClose: () => void;
}

export function DishSheet({ scope, categories, dish, initialCategoryId, nextOrder, onClose }: Props) {
  const [locale, setLocale] = useState(scope.defaultLocale);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: dish?.categoryId ?? initialCategoryId ?? categories[0]?.id ?? '',
      name: i18nToForm(dish?.name, scope.locales),
      note: i18nToForm(dish?.note, scope.locales),
      price: priceToForm(dish?.price),
      active: dish?.active ?? true,
      imageAssetId: dish?.imageAssetId ?? null
    }
  });
  const { register, handleSubmit, setError, setFocus, setValue, watch, formState: { errors, isDirty } } = form;

  const create = useCreateDish();
  const update = useUpdateDish();
  const remove = useDeleteDish();
  const saving = create.isPending || update.isPending;
  const defaultLocaleName = scope.localeNames[scope.defaultLocale] ?? scope.defaultLocale;

  const onSubmit = handleSubmit(async values => {
    // El nombre en el idioma principal es el que identifica el plato en esta lista.
    if (!values.name[scope.defaultLocale]?.trim()) {
      setLocale(scope.defaultLocale);
      setError(`name.${scope.defaultLocale}`, { message: `Escribe el nombre en ${defaultLocaleName.toLowerCase()}.` });
      setTimeout(() => setFocus(`name.${scope.defaultLocale}`), 0);
      return;
    }
    const name = i18nFromForm(dish?.name, values.name);
    const note = i18nFromForm(dish?.note, values.note);
    const price = priceFromForm(values.price);
    try {
      if (dish) {
        await update.mutateAsync({ id: dish.id, body: { categoryId: values.categoryId, name, note, price, active: values.active, imageAssetId: values.imageAssetId } });
        showSuccessToast('Plato guardado');
      } else {
        await create.mutateAsync({
          spaceId: scope.spaceId, categoryId: values.categoryId, name, note,
          price: price ?? undefined, active: values.active, order: nextOrder,
          imageAssetId: values.imageAssetId ?? undefined
        });
        showSuccessToast('Plato añadido');
      }
      onClose();
    } catch {
      // El hook ya muestra el error; el panel sigue abierto con lo escrito.
    }
  });

  const i18n = { locales: scope.locales, activeLocale: locale, localeNames: scope.localeNames };

  return (
    <ItemSheetShell
      title={dish ? 'Editar plato' : 'Nuevo plato'}
      dirty={isDirty}
      saving={saving}
      onSubmit={onSubmit}
      onClose={onClose}
      deletion={dish ? {
        label: 'Eliminar plato',
        name: dish.name[scope.defaultLocale] ?? 'este plato',
        pending: remove.isPending,
        onConfirm: () => remove.mutateAsync(dish.id).then(() => { showSuccessToast('Plato eliminado'); onClose(); })
      } : undefined}
    >
      <FormProvider {...form}>
        <div className="flex flex-col gap-5">
          <Field id="d-category" label="Categoría" error={errors.categoryId?.message} required>
            {control => (
              <Select {...control} {...register('categoryId')}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{categoryLabel(c, scope.defaultLocale)}</option>
                ))}
              </Select>
            )}
          </Field>

          <div>
            {scope.locales.length > 1 && (
              <LocaleTabs locales={scope.locales} value={locale} onChange={setLocale} names={scope.localeNames} />
            )}
            <div className="flex flex-col gap-5">
              <I18nField name="name" label="Nombre del plato" errorFor={scope.defaultLocale} error={errors.name?.[scope.defaultLocale]?.message} {...i18n} />
              <I18nField name="note" label="Descripción" hint="Ingredientes o una frase breve. Opcional." multiline {...i18n} />
            </div>
          </div>

          <Field id="d-price" label="Precio" hint="En euros. Déjalo vacío si no quieres mostrar precio." error={errors.price?.message} className="max-w-[200px]">
            {control => <TextInput {...control} inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('price')} />}
          </Field>

          <ImageField
            label="Foto del plato"
            hint="Opcional. Mejor una foto del plato tal como llega a la mesa."
            scope={scope}
            purpose="dish"
            assetId={watch('imageAssetId')}
            onChange={asset => setValue('imageAssetId', asset?.id ?? null, { shouldDirty: true })}
            showDescription
          />

          <Checkbox id="d-active" label="Visible en la carta" hint="Desmárcalo para ocultarlo sin borrarlo, por ejemplo fuera de temporada." {...register('active')} />
        </div>
      </FormProvider>
    </ItemSheetShell>
  );
}
