'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Restaurant, Space } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { PublishPanel } from '@/components/editor/PublishPanel';
import { SaveBar } from '@/components/editor/SaveBar';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { ScheduleEditor } from '@/components/editor/ScheduleEditor';
import { ImageField } from '@/components/media/ImageField';
import { ImageListField } from '@/components/media/ImageListField';
import { Section } from '@/components/shared/Section';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { TextArea, TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { countErrors } from '@/lib/forms/errors';
import { compact, i18nFromForm, i18nToForm, sameContent } from '@/lib/forms/i18n';
import { i18nValues, optionalEmail, optionalMap, optionalText, requiredText } from '@/lib/forms/rules';
import { scheduleForCompare, scheduleSchema } from '@/lib/forms/schedule';
import type { TranslatableField } from '@/lib/forms/translations';
import { useTranslationStatus } from '@/lib/forms/useTranslationStatus';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { useDiscardSpace, usePatchSpace, usePublishSpace } from '@/lib/query/hooks';

const HERO_FIELDS = ['title', 'subtitle', 'note', 'metaLeft', 'metaRight', 'cta', 'imageAlt'] as const;
const MANIFESTO_FIELDS = ['eyebrow', 'text'] as const;
const SCHEDULE_TEXT_FIELDS = ['title', 'text', 'open', 'nextOpening', 'closed'] as const;
const ADDRESS_FIELDS = ['street', 'postalCode', 'city', 'district', 'province', 'country'] as const;
const BOOKING_FIELDS = ['phone', 'whatsapp', 'email'] as const;

const COVER = 'Portada';
const INTRO = 'Texto de presentación';
const SCHEDULE_TEXTS = 'Textos del horario';
const TRANSLATABLE: TranslatableField[] = [
  { name: 'hero.title', label: 'Título', section: COVER },
  { name: 'hero.subtitle', label: 'Subtítulo', section: COVER },
  { name: 'hero.note', label: 'Texto breve', section: COVER },
  { name: 'hero.metaLeft', label: 'Dato a la izquierda', section: COVER },
  { name: 'hero.metaRight', label: 'Dato a la derecha', section: COVER },
  { name: 'hero.cta', label: 'Texto del botón', section: COVER },
  { name: 'manifesto.eyebrow', label: 'Antetítulo', section: INTRO },
  { name: 'manifesto.text', label: 'Texto', section: INTRO },
  { name: 'scheduleTexts.title', label: 'Título', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.text', label: 'Texto', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.open', label: 'Aviso de abierto', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.nextOpening', label: 'Aviso de próxima apertura', section: SCHEDULE_TEXTS },
  { name: 'scheduleTexts.closed', label: 'Aviso de cerrado', section: SCHEDULE_TEXTS }
];
const IMAGE_ALT: TranslatableField = { name: 'hero.imageAlt', label: 'Descripción de la foto', section: COVER };

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
    imageAlt: i18nValues,
    /** Vacío = sin foto. */
    imageAssetId: z.string()
  }),
  manifesto: z.object({ eyebrow: i18nValues, text: i18nValues }),
  gallery: z.array(z.string()),
  scheduleTexts: z.object({ title: i18nValues, text: i18nValues, open: i18nValues, nextOpening: i18nValues, closed: i18nValues }),
  schedule: scheduleSchema,
  address: z.object({
    street: optionalText(200),
    postalCode: optionalText(20),
    city: optionalText(120),
    district: optionalText(120),
    province: optionalText(120),
    country: optionalText(120)
  }),
  mapUrl: optionalMap,
  bookingContact: z.object({ phone: optionalText(40), whatsapp: optionalText(40), email: optionalEmail })
});

type FormValues = z.infer<typeof schema>;

function toForm(space: Space, locales: string[]): FormValues {
  return {
    name: space.name,
    descriptor: space.descriptor ?? '',
    hero: {
      ...Object.fromEntries(HERO_FIELDS.map(f => [f, i18nToForm(space.hero[f], locales)])),
      imageAssetId: space.hero.imageAssetId ?? ''
    } as FormValues['hero'],
    manifesto: Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nToForm(space.manifesto[f], locales)])) as FormValues['manifesto'],
    gallery: space.gallery,
    scheduleTexts: Object.fromEntries(SCHEDULE_TEXT_FIELDS.map(f => [f, i18nToForm(space.scheduleTexts[f], locales)])) as FormValues['scheduleTexts'],
    schedule: space.schedule.map(d => ({ day: d.day, shifts: d.shifts.map(s => ({ open: s.open, close: s.close })) })),
    address: Object.fromEntries(ADDRESS_FIELDS.map(f => [f, space.address[f] ?? ''])) as FormValues['address'],
    mapUrl: space.mapUrl ?? '',
    bookingContact: Object.fromEntries(BOOKING_FIELDS.map(f => [f, space.bookingContact[f] ?? ''])) as FormValues['bookingContact']
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
  // Las versiones publicadas antes de que el api guardara nombre y horarios no
  // los traen: sin referencia no se puede decir que hayan cambiado.
  if (snap.name !== undefined) blocks.unshift(['Nombre', space.name, snap.name]);
  if (snap.gallery !== undefined) blocks.push(['Galería', space.gallery, snap.gallery]);
  if (snap.schedule !== undefined) blocks.push(['Horarios', scheduleForCompare(space.schedule), scheduleForCompare(snap.schedule)]);
  if (snap.scheduleTexts !== undefined) blocks.push([SCHEDULE_TEXTS, space.scheduleTexts, snap.scheduleTexts]);
  if (snap.address !== undefined) blocks.push(['Dirección y contacto propios', [space.address, space.mapUrl, space.bookingContact], [snap.address, snap.mapUrl, snap.bookingContact]]);
  return blocks.filter(([, now, before]) => !sameContent(now, before)).map(([label]) => label);
}

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
  const { register, handleSubmit, reset, setError, setFocus, setValue, watch, control, formState: { errors, isDirty, isSubmitted } } = form;

  const patch = usePatchSpace(restaurant.slug, space.id);
  const publish = usePublishSpace(restaurant.slug, space.id);
  const discard = useDiscardSpace(restaurant.slug, space.id);

  useUnsavedChangesWarning(isDirty);

  const heroImageId = watch('hero.imageAssetId');
  const gallery = watch('gallery');
  const altErrorLocale = locales.find(code => errors.hero?.imageAlt?.[code]);

  const translations = useTranslationStatus({
    control,
    // La descripción de la foto solo cuenta si hay foto.
    fields: heroImageId ? [...TRANSLATABLE, IMAGE_ALT] : TRANSLATABLE,
    locales,
    localeNames,
    onGo: (fieldName, code) => {
      setLocale(code);
      // El campo de ese idioma está oculto hasta el siguiente render.
      setTimeout(() => setFocus(`${fieldName}.${code}` as Parameters<typeof setFocus>[0]), 0);
    }
  });

  const onSave = handleSubmit(async values => {
    // Una portada con foto no se guarda sin su descripción en todos los idiomas.
    const missingAlt = values.hero.imageAssetId ? locales.find(code => !values.hero.imageAlt[code]?.trim()) : undefined;
    if (missingAlt) {
      setLocale(missingAlt);
      setError(`hero.imageAlt.${missingAlt}`, { message: `Describe la foto en ${localeNames[missingAlt] ?? missingAlt.toUpperCase()}.` });
      setTimeout(() => setFocus(`hero.imageAlt.${missingAlt}`), 0);
      return;
    }
    // `hero` se envía entero: la foto anterior se quita aquí y solo vuelve si sigue elegida.
    const { imageAssetId: _previousImage, ...heroBase } = space.hero;
    try {
      const saved = await patch.mutateAsync({
        name: values.name,
        descriptor: values.descriptor,
        // El api sustituye `hero` y `manifesto` enteros: se parte del valor actual
        // para conservar lo que este formulario no edita.
        hero: {
          ...heroBase,
          ...Object.fromEntries(HERO_FIELDS.map(f => [f, i18nFromForm(space.hero[f], values.hero[f])])),
          ...(values.hero.imageAssetId ? { imageAssetId: values.hero.imageAssetId } : {})
        },
        manifesto: {
          ...space.manifesto,
          ...Object.fromEntries(MANIFESTO_FIELDS.map(f => [f, i18nFromForm(space.manifesto[f], values.manifesto[f])]))
        },
        gallery: values.gallery,
        scheduleTexts: {
          ...space.scheduleTexts,
          ...Object.fromEntries(SCHEDULE_TEXT_FIELDS.map(f => [f, i18nFromForm(space.scheduleTexts[f], values.scheduleTexts[f])]))
        },
        schedule: values.schedule,
        address: compact(values.address),
        mapUrl: values.mapUrl || null,
        bookingContact: compact(values.bookingContact),
        // Guardar nunca publica: deja el contenido como borrador hasta que se pulse Publicar.
        state: 'draft'
      });
      reset(toForm(saved, locales));
      showSuccessToast('Cambios guardados', 'Aún no están en la web: publica cuando quieras.');
    } catch {
      // El hook ya muestra el error; el formulario conserva lo escrito.
    }
  });

  const i18n = { locales, activeLocale: locale, localeNames, defaultLocale: restaurant.defaultLocale as string };
  const mediaScope = { restaurantSlug: restaurant.slug, locales, defaultLocale: restaurant.defaultLocale as string, localeNames };

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
              <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} />

              <div className="flex flex-col gap-6">
                <Section title={COVER} description="Lo primero que ve quien entra en la web." badge={<TranslationBadge count={translations.inSection(COVER)} />}>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <I18nField className="md:col-span-2" reference="side" name="hero.title" label="Título" recommendedMax={42} {...i18n} />
                    <I18nField className="md:col-span-2" reference="side" name="hero.subtitle" label="Subtítulo" {...i18n} />
                    <I18nField className="md:col-span-2" reference="side" name="hero.note" label="Texto breve" multiline recommendedMax={240} {...i18n} />
                    <I18nField name="hero.metaLeft" label="Dato a la izquierda" hint="Por ejemplo, el barrio." {...i18n} />
                    <I18nField name="hero.metaRight" label="Dato a la derecha" hint="Por ejemplo, el tipo de cocina." {...i18n} />
                    <I18nField name="hero.cta" label="Texto del botón" hint="Por ejemplo, «Reservar mesa»." {...i18n} />
                    <div className="md:col-span-2">
                      <ImageField
                        label="Foto de portada"
                        hint="Horizontal y de al menos 1600 px de ancho."
                        scope={mediaScope}
                        purpose="hero"
                        assetId={heroImageId || null}
                        onChange={asset => {
                          setValue('hero.imageAssetId', asset?.id ?? '', { shouldDirty: true });
                          // La descripción va con la foto: al cambiarla, entra la de la nueva.
                          if (asset) locales.forEach(code => setValue(`hero.imageAlt.${code}`, asset.altText?.[code] ?? '', { shouldDirty: true, shouldValidate: true }));
                        }}
                      />
                    </div>
                    {heroImageId && (
                      <I18nField
                        className="md:col-span-2"
                        reference="side"
                        name="hero.imageAlt"
                        label="Descripción de la foto"
                        hint="Qué se ve en la foto, para quien no puede verla."
                        errorFor={altErrorLocale}
                        error={altErrorLocale ? errors.hero?.imageAlt?.[altErrorLocale]?.message : undefined}
                        {...i18n}
                      />
                    )}
                  </div>
                </Section>

                <Section title={INTRO} badge={<TranslationBadge count={translations.inSection(INTRO)} />}>
                  <div className="flex flex-col gap-5">
                    <I18nField reference="side" name="manifesto.eyebrow" label="Antetítulo" hint="Una o dos palabras encima del texto." {...i18n} />
                    <I18nField reference="side" name="manifesto.text" label="Texto" multiline {...i18n} />
                  </div>
                </Section>

                <Section title={SCHEDULE_TEXTS} description="Lo que acompaña al horario en la web. Si los dejas vacíos, la web usa sus textos de siempre." badge={<TranslationBadge count={translations.inSection(SCHEDULE_TEXTS)} />}>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <I18nField className="md:col-span-2" reference="side" name="scheduleTexts.title" label="Título" hint="Por ejemplo, «Cuándo venir»." {...i18n} />
                    <I18nField className="md:col-span-2" reference="side" name="scheduleTexts.text" label="Texto" multiline rows={3} {...i18n} />
                    <I18nField name="scheduleTexts.open" label="Aviso de abierto" hint="Escribe {hora} donde va la hora de cierre: «Abierto hasta las {hora}»." {...i18n} />
                    <I18nField name="scheduleTexts.nextOpening" label="Aviso de próxima apertura" hint="Escribe {hora} donde va la hora de apertura: «Hoy abrimos a las {hora}»." {...i18n} />
                    <I18nField name="scheduleTexts.closed" label="Aviso de cerrado" hint="Por ejemplo, «Hoy cerramos»." {...i18n} />
                  </div>
                </Section>
              </div>
            </div>

            <Section title="Galería" description="Las fotos del espacio, en el orden en que se ven en la web.">
              <ImageListField
                label="Fotos de la galería"
                hint="Horizontales o verticales, de al menos 800 px de ancho."
                scope={mediaScope}
                purpose="dish"
                max={60}
                assetIds={gallery}
                onChange={ids => setValue('gallery', ids, { shouldDirty: true })}
              />
            </Section>

            <Section title="Horarios" description="Un día sin turnos se muestra en la web como cerrado.">
              <ScheduleEditor />
            </Section>

            <Section title="Dirección y contacto propios" description="Solo si este espacio tiene una dirección o un contacto distintos de los del restaurante. Lo que dejes vacío sale de la ficha del restaurante.">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="s-street" className="md:col-span-2" label="Calle y número" error={errors.address?.street?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.street')} />}
                </Field>
                <Field id="s-postal" label="Código postal" error={errors.address?.postalCode?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.postalCode')} />}
                </Field>
                <Field id="s-city" label="Ciudad" error={errors.address?.city?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.city')} />}
                </Field>
                <Field id="s-district" label="Barrio" error={errors.address?.district?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.district')} />}
                </Field>
                <Field id="s-province" label="Provincia" error={errors.address?.province?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.province')} />}
                </Field>
                <Field id="s-country" label="País" error={errors.address?.country?.message}>
                  {control => <TextInput {...control} autoComplete="off" {...register('address.country')} />}
                </Field>
                <Field id="s-map" className="md:col-span-2" label="Mapa de Google" error={errors.mapUrl?.message} hint="En Google Maps: Compartir → Insertar un mapa → Copiar HTML. Pégalo aquí tal cual.">
                  {control => <TextArea {...control} rows={3} autoComplete="off" spellCheck={false} {...register('mapUrl')} />}
                </Field>
                <Field id="s-phone" label="Teléfono de reservas" error={errors.bookingContact?.phone?.message}>
                  {control => <TextInput {...control} type="tel" inputMode="tel" autoComplete="off" {...register('bookingContact.phone')} />}
                </Field>
                <Field id="s-whatsapp" label="WhatsApp de reservas" error={errors.bookingContact?.whatsapp?.message} hint="Con prefijo de país, por ejemplo +34 600 000 000.">
                  {control => <TextInput {...control} type="tel" inputMode="tel" autoComplete="off" {...register('bookingContact.whatsapp')} />}
                </Field>
                <Field id="s-email" label="Email de reservas" error={errors.bookingContact?.email?.message}>
                  {control => <TextInput {...control} type="email" inputMode="email" autoComplete="off" {...register('bookingContact.email')} />}
                </Field>
              </div>
            </Section>
          </div>

          <aside aria-label="Publicación y otros espacios" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
            <PublishPanel
              subject="este espacio"
              isPublished={space.state === 'published'}
              hasPublishedVersion={!!space.publishedSnapshot}
              changes={changedBlocks(space)}
              blockers={translations.blockers}
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
