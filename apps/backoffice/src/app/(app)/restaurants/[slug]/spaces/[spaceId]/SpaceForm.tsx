'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Restaurant, ScheduleDay, Space } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { PublishPanel } from '@/components/editor/PublishPanel';
import { SaveBar } from '@/components/editor/SaveBar';
import { Section } from '@/components/shared/Section';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { countErrors } from '@/lib/forms/errors';
import { i18nFromForm, i18nToForm, sameContent } from '@/lib/forms/i18n';
import { i18nValues, optionalText, requiredText } from '@/lib/forms/rules';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { useDiscardSpace, usePatchSpace, usePublishSpace } from '@/lib/query/hooks';

const HERO_FIELDS = ['title', 'subtitle', 'note', 'metaLeft', 'metaRight', 'cta', 'imageAlt'] as const;
const MANIFESTO_FIELDS = ['eyebrow', 'text'] as const;

const schema = z.object({
  name: requiredText(120),
  descriptor: optionalText(200),
  hero: z.object({
    title: i18nValues,
    subtitle: i18nValues,
    note: i18nValues,
    metaLeft: i18nValues,
    metaRight: i18nValues,
    cta: i18nValues,
    imageAlt: i18nValues
  }),
  manifesto: z.object({ eyebrow: i18nValues, text: i18nValues })
});

type FormValues = z.infer<typeof schema>;

function toForm(space: Space, locales: string[]): FormValues {
  return {
    name: space.name,
    descriptor: space.descriptor ?? '',
    hero: Object.fromEntries(HERO_FIELDS.map(f => [f, i18nToForm(space.hero[f], locales)])) as FormValues['hero'],
    manifesto: Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nToForm(space.manifesto[f], locales)])) as FormValues['manifesto']
  };
}

function changedBlocks(space: Space): string[] {
  const snap = space.publishedSnapshot;
  if (!snap) return [];
  const blocks: [string, unknown, unknown][] = [
    ['Descripción corta', space.descriptor, snap.descriptor],
    ['Portada', space.hero, snap.hero],
    ['Texto de presentación', space.manifesto, snap.manifesto]
  ];
  return blocks.filter(([, now, before]) => !sameContent(now, before)).map(([label]) => label);
}

const DAY_LABEL: Record<ScheduleDay['day'], string> = {
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
  Su: 'Domingo'
};

interface Props {
  restaurant: Restaurant;
  space: Space;
  localeNames: Record<string, string>;
  /** Contenido extra del lateral, bajo el panel de publicación. */
  aside?: React.ReactNode;
}

export function SpaceForm({ restaurant, space, localeNames, aside }: Props) {
  const locales = restaurant.activeLocales as string[];
  const [locale, setLocale] = useState(restaurant.defaultLocale as string);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(space, locales) });
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitted } } = form;

  const patch = usePatchSpace(restaurant.slug, space.id);
  const publish = usePublishSpace(restaurant.slug, space.id);
  const discard = useDiscardSpace(restaurant.slug, space.id);

  useUnsavedChangesWarning(isDirty);

  const onSave = handleSubmit(async values => {
    try {
      const saved = await patch.mutateAsync({
        name: values.name,
        descriptor: values.descriptor,
        // El api sustituye `hero` y `manifesto` enteros: se parte del valor actual
        // para conservar lo que este formulario no edita (la foto de portada).
        hero: {
          ...space.hero,
          ...Object.fromEntries(HERO_FIELDS.map(f => [f, i18nFromForm(space.hero[f], values.hero[f])]))
        },
        manifesto: {
          ...space.manifesto,
          ...Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nFromForm(space.manifesto[f], values.manifesto[f])]))
        },
        // Guardar nunca publica: deja el contenido como borrador hasta que se pulse Publicar.
        state: 'draft'
      });
      reset(toForm(saved, locales));
      showSuccessToast('Cambios guardados', 'Aún no están en la web: publica cuando quieras.');
    } catch {
      // El hook ya muestra el error; el formulario conserva lo escrito.
    }
  });

  const i18n = { locales, activeLocale: locale, localeNames };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave} noValidate className={isDirty ? 'pb-24' : undefined}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Section title="Datos del espacio">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="s-name" label="Nombre" error={errors.name?.message} required>
                  {control => <TextInput {...control} autoComplete="off" {...register('name')} />}
                </Field>
                <Field id="s-descriptor" label="Descripción corta" error={errors.descriptor?.message} hint="Una línea, por ejemplo «Terraza con vistas al puerto».">
                  {control => <TextInput {...control} autoComplete="off" {...register('descriptor')} />}
                </Field>
              </div>
            </Section>

            <div>
              <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} />

              <div className="flex flex-col gap-6">
                <Section title="Portada" description="Lo primero que ve quien entra en la web.">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <I18nField className="md:col-span-2" name="hero.title" label="Título" recommendedMax={42} {...i18n} />
                    <I18nField className="md:col-span-2" name="hero.subtitle" label="Subtítulo" {...i18n} />
                    <I18nField className="md:col-span-2" name="hero.note" label="Texto breve" multiline recommendedMax={240} {...i18n} />
                    <I18nField name="hero.metaLeft" label="Dato a la izquierda" hint="Por ejemplo, el barrio." {...i18n} />
                    <I18nField name="hero.metaRight" label="Dato a la derecha" hint="Por ejemplo, el tipo de cocina." {...i18n} />
                    <I18nField name="hero.cta" label="Texto del botón" hint="Por ejemplo, «Reservar mesa»." {...i18n} />
                    <I18nField name="hero.imageAlt" label="Descripción de la foto" hint="Qué se ve en la foto, para quien no puede verla." {...i18n} />
                  </div>
                </Section>

                <Section title="Texto de presentación">
                  <div className="flex flex-col gap-5">
                    <I18nField name="manifesto.eyebrow" label="Antetítulo" hint="Una o dos palabras encima del texto." {...i18n} />
                    <I18nField name="manifesto.text" label="Texto" multiline {...i18n} />
                  </div>
                </Section>
              </div>
            </div>

            <Section title="Horarios" description="De momento solo se pueden consultar; la edición llegará más adelante.">
              {space.schedule.every(d => d.shifts.length === 0) ? (
                <p className="m-0 text-[14px] text-[color:var(--color-muted)]">Este espacio aún no tiene horarios.</p>
              ) : (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14.5px]">
                  {space.schedule.map(day => (
                    <div key={day.day} className="contents">
                      <dt className="font-semibold text-[color:var(--color-ink)]">{DAY_LABEL[day.day]}</dt>
                      <dd className={day.shifts.length ? 'tabular m-0 text-[color:var(--color-ink)]' : 'm-0 text-[color:var(--color-muted)]'}>
                        {day.shifts.length ? day.shifts.map(s => `${s.open} – ${s.close}`).join(' · ') : 'Cerrado'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Section>
          </div>

          <aside aria-label="Publicación y otros espacios" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
            <PublishPanel
              subject="este espacio"
              isPublished={space.state === 'published'}
              hasPublishedVersion={!!space.publishedSnapshot}
              changes={changedBlocks(space)}
              formDirty={isDirty}
              publishing={publish.isPending}
              discarding={discard.isPending}
              onPublish={() => publish.mutateAsync().then(() => showSuccessToast('Publicado', 'La web se actualizará en un par de minutos.'))}
              onDiscard={() => discard.mutateAsync().then(s => { reset(toForm(s, locales)); showSuccessToast('Has vuelto a lo publicado'); })}
            />
            {aside}
          </aside>
        </div>

        <SaveBar dirty={isDirty} saving={patch.isPending} errorCount={isSubmitted ? countErrors(errors) : 0} onDiscard={() => reset()} />
      </form>
    </FormProvider>
  );
}
