'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Wine, WineCategory } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { Checkbox, FormSelect, TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { i18nFromForm, i18nToForm } from '@/lib/forms/i18n';
import { priceFromForm, priceText, priceToForm } from '@/lib/forms/price';
import { gapsByLocale, translationGaps } from '@/lib/forms/translations';
import { i18nValues, optionalText, requiredText } from '@/lib/forms/rules';
import { useCreateWine, useDeleteWine, useUpdateWine } from '@/lib/query/hooks';
import { ItemSheetShell } from './ItemSheetShell';
import { categoryLabel, type MenuScope } from './types';

const schema = z.object({
  categoryId: z.string().min(1, 'Elige una categoría.'),
  name: requiredText(200),
  region: optionalText(200),
  note: i18nValues,
  priceGlass: priceText,
  priceBottle: priceText,
  active: z.boolean()
});
type FormValues = z.infer<typeof schema>;

interface Props {
  scope: MenuScope;
  categories: WineCategory[];
  /** `null` = vino nuevo. */
  wine: Wine | null;
  initialCategoryId?: string;
  nextOrder: number;
  onClose: () => void;
}

export function WineSheet({ scope, categories, wine, initialCategoryId, nextOrder, onClose }: Props) {
  const [locale, setLocale] = useState(scope.defaultLocale);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: wine?.categoryId ?? initialCategoryId ?? categories[0]?.id ?? '',
      name: wine?.name ?? '',
      region: wine?.region ?? '',
      note: i18nToForm(wine?.note, scope.locales),
      priceGlass: priceToForm(wine?.priceGlass),
      priceBottle: priceToForm(wine?.priceBottle),
      active: wine?.active ?? true
    }
  });
  const { register, handleSubmit, watch, formState: { errors, isDirty } } = form;
  const pending = gapsByLocale(translationGaps([{ name: 'note', label: 'Nota', section: '' }], { note: watch('note') }, scope.locales));

  const create = useCreateWine();
  const update = useUpdateWine();
  const remove = useDeleteWine();
  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async values => {
    const note = i18nFromForm(wine?.note, values.note);
    const priceGlass = priceFromForm(values.priceGlass);
    const priceBottle = priceFromForm(values.priceBottle);
    try {
      if (wine) {
        await update.mutateAsync({
          id: wine.id,
          body: { categoryId: values.categoryId, name: values.name, region: values.region || null, note, priceGlass, priceBottle, active: values.active }
        });
        showSuccessToast('Vino guardado', 'Sale en tu web al publicar.');
      } else {
        await create.mutateAsync({
          spaceId: scope.spaceId, categoryId: values.categoryId, name: values.name,
          region: values.region || undefined, note,
          priceGlass: priceGlass ?? undefined, priceBottle: priceBottle ?? undefined,
          active: values.active, order: nextOrder
        });
        showSuccessToast('Vino añadido', 'Sale en tu web al publicar.');
      }
      onClose();
    } catch {
      // El hook ya muestra el error; el panel sigue abierto con lo escrito.
    }
  });

  return (
    <ItemSheetShell
      title={wine ? 'Editar vino' : 'Nuevo vino'}
      dirty={isDirty}
      saving={saving}
      onSubmit={onSubmit}
      onClose={onClose}
      deletion={wine ? {
        label: 'Eliminar vino',
        name: wine.name,
        pending: remove.isPending,
        onConfirm: () => remove.mutateAsync(wine.id).then(() => { showSuccessToast('Vino eliminado'); onClose(); })
      } : undefined}
    >
      <FormProvider {...form}>
        <div className="flex flex-col gap-5">
          <Field id="w-category" label="Categoría" error={errors.categoryId?.message} required>
            {control => (
              <FormSelect {...control} control={form.control} name='categoryId'>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{categoryLabel(c, scope.defaultLocale)}</option>
                ))}
              </FormSelect>
            )}
          </Field>

          <Field id="w-name" label="Nombre del vino" hint="Tal como aparece en la etiqueta: no se traduce." error={errors.name?.message} required>
            {control => <TextInput {...control} autoComplete="off" {...register('name')} />}
          </Field>

          <Field id="w-region" label="Región o denominación" error={errors.region?.message}>
            {control => <TextInput {...control} autoComplete="off" {...register('region')} />}
          </Field>

          <div>
            {scope.locales.length > 1 && (
              <LocaleTabs locales={scope.locales} value={locale} onChange={setLocale} names={scope.localeNames} missing={pending} first={scope.defaultLocale} compact />
            )}
            <I18nField name="note" label="Nota" hint="Uva, crianza o una frase breve. Opcional." multiline locales={scope.locales} activeLocale={locale} localeNames={scope.localeNames} defaultLocale={scope.defaultLocale} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="w-glass" label="Precio por copa" error={errors.priceGlass?.message}>
              {control => <TextInput {...control} inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('priceGlass')} />}
            </Field>
            <Field id="w-bottle" label="Precio por botella" error={errors.priceBottle?.message}>
              {control => <TextInput {...control} inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('priceBottle')} />}
            </Field>
          </div>

          <Checkbox id="w-active" label="Visible en la carta" hint="Desmárcalo para ocultarlo sin borrarlo." {...register('active')} />
        </div>
      </FormProvider>
    </ItemSheetShell>
  );
}
