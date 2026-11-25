'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LegalPage, LegalPageType, Restaurant } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { SaveBar } from '@/components/editor/SaveBar';
import { Button } from '@/components/shared/Button';
import { Callout } from '@/components/shared/Callout';
import { Section } from '@/components/shared/Section';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { countErrors } from '@/lib/forms/errors';
import { i18nFromForm, i18nToForm } from '@/lib/forms/i18n';
import { i18nValues } from '@/lib/forms/rules';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { useDeleteLegalPage, useSaveLegalPage } from '@/lib/query/hooks';

const MAX_CONTENT = 60_000;

const schema = z.object({
  title: i18nValues,
  content: z.record(z.string().max(MAX_CONTENT, 'El texto es demasiado largo. Recórtalo o repártelo en apartados más breves.')),
  lastUpdated: z.string().refine(v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Elige una fecha.')
});

type FormValues = z.infer<typeof schema>;

function toForm(page: LegalPage | null, locales: string[]): FormValues {
  return {
    title: i18nToForm(page?.title, locales),
    content: i18nToForm(page?.content, locales),
    lastUpdated: page?.lastUpdated ?? ''
  };
}

interface Props {
  restaurant: Restaurant;
  type: LegalPageType;
  /** Nombre de la página, para los mensajes. */
  title: string;
  page: LegalPage | null;
  localeNames: Record<string, string>;
}

export function LegalPageForm({ restaurant, type, title, page, localeNames }: Props) {
  const router = useRouter();
  const locales = restaurant.activeLocales as string[];
  const defaultLocale = restaurant.defaultLocale as string;
  const [locale, setLocale] = useState(defaultLocale);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(page, locales) });
  const { register, handleSubmit, reset, setError, setFocus, watch, formState: { errors, isDirty, isSubmitted } } = form;

  const save = useSaveLegalPage(restaurant.slug, type);
  const remove = useDeleteLegalPage(restaurant.slug, type);

  useUnsavedChangesWarning(isDirty);

  const values = watch();
  const missingByLocale = Object.fromEntries(
    locales.map(code => [code, (['title', 'content'] as const).filter(f => !values[f]?.[code]?.trim()).length])
  );
  const anyText = locales.some(code => values.title?.[code]?.trim() || values.content?.[code]?.trim());
  const nameOf = (code: string) => (localeNames[code] ?? code.toUpperCase()).toLowerCase();

  const onSave = handleSubmit(async formValues => {
    // Esta página no tiene borrador: lo que se guarda es lo que sale en la web,
    // así que tiene que estar completa en todos los idiomas.
    for (const field of ['title', 'content'] as const) {
      const missing = locales.find(code => !formValues[field][code]?.trim());
      if (missing) {
        setLocale(missing);
        setError(`${field}.${missing}`, { message: field === 'title' ? `Escribe el título en ${nameOf(missing)}.` : `Escribe el texto en ${nameOf(missing)}.` });
        setTimeout(() => setFocus(`${field}.${missing}`), 0);
        return;
      }
    }
    try {
      const saved = await save.mutateAsync({
        title: i18nFromForm(page?.title, formValues.title),
        content: i18nFromForm(page?.content, formValues.content),
        lastUpdated: formValues.lastUpdated || null
      });
      reset(toForm(saved, locales));
      showSuccessToast('Página guardada');
    } catch {
      // El hook ya muestra el error; el formulario conserva lo escrito.
    }
  });

  const errorLocale = (field: 'title' | 'content') => locales.find(code => errors[field]?.[code]);
  const titleErrorLocale = errorLocale('title');
  const contentErrorLocale = errorLocale('content');
  const i18n = { locales, activeLocale: locale, localeNames, defaultLocale };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave} noValidate className={isDirty ? 'max-w-[900px] pb-24' : 'max-w-[900px]'}>
        <Callout className="mb-6" title="Esta página no tiene borrador">
          Lo que guardes es lo que saldrá en la web. Por eso hace falta escribirla en todos los idiomas antes de guardar.
        </Callout>

        <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={anyText ? missingByLocale : {}} />

        <Section title="Texto de la página">
          <div className="flex flex-col gap-5">
            <I18nField
              name="title"
              label="Título"
              errorFor={titleErrorLocale}
              error={titleErrorLocale ? errors.title?.[titleErrorLocale]?.message : undefined}
              {...i18n}
            />
            <I18nField
              name="content"
              label="Texto"
              multiline
              rows={22}
              hint="Empieza una línea con ## para un título de apartado y con - para una lista. Deja una línea en blanco entre párrafos."
              errorFor={contentErrorLocale}
              error={contentErrorLocale ? errors.content?.[contentErrorLocale]?.message : undefined}
              {...i18n}
            />
            <Field id="legal-last-updated" className="md:max-w-[260px]" label="Fecha de la última revisión" error={errors.lastUpdated?.message} hint="Se enseña al final de la página.">
              {control => <TextInput {...control} type="date" {...register('lastUpdated')} />}
            </Field>
          </div>
        </Section>

        {page && (
          <div className="mt-6">
            <Button variant="ghost" className="min-h-11" disabled={isDirty || remove.isPending} aria-describedby={isDirty ? 'legal-delete-note' : undefined} onClick={() => setConfirmingDelete(true)}>
              Borrar esta página
            </Button>
            {isDirty && (
              <p id="legal-delete-note" className="m-0 mt-2 text-[12.5px] text-[color:var(--color-muted)]">Guarda o deshaz los cambios para poder borrarla.</p>
            )}
          </div>
        )}

        <SaveBar dirty={isDirty} saving={save.isPending} errorCount={isSubmitted ? countErrors(errors) : 0} onDiscard={() => reset()} />
      </form>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`¿Borrar «${title}»?`}
        confirmLabel="Sí, borrar"
        pendingLabel="Borrando…"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutateAsync().then(
            () => { showSuccessToast('Página borrada'); router.push(`/restaurants/${restaurant.slug}?s=legal`); },
            () => {}
          )
        }
      >
        <p className="m-0">Se borrará el texto en todos los idiomas y la web dejará de enseñar esta página. No se puede deshacer.</p>
      </ConfirmDialog>
    </FormProvider>
  );
}
