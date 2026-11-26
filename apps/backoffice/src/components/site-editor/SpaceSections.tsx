'use client';

import { FormProvider, useWatch } from 'react-hook-form';
import { I18nField } from '@/components/editor/I18nField';
import { ScheduleEditor } from '@/components/editor/ScheduleEditor';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { ImageField } from '@/components/media/ImageField';
import { ImageListField } from '@/components/media/ImageListField';
import { Fold, Section } from '@/components/shared/Section';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { useEditor, useSpaceDraft } from './EditorContext';
import { COVER, INTRO, SCHEDULE_TEXTS } from './spaceForm';

export type SpaceSectionKey = 'cover' | 'photos' | 'hours' | 'details';

/** Lo que se edita de un espacio en cada sección del editor. */
export function SpaceSection({ show }: { show: SpaceSectionKey }) {
  const draft = useSpaceDraft();
  const { restaurant, locales, localeNames, defaultLocale, locale, setLocale } = useEditor();
  if (!draft) return null;
  const { form, translations } = draft;
  const { register, formState: { errors } } = form;

  const i18n = { locales, activeLocale: locale, localeNames, defaultLocale };
  const mediaScope = { restaurantSlug: restaurant.slug, locales, defaultLocale, localeNames };
  const localeTabs = <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} first={defaultLocale} />;

  return (
    <FormProvider {...form}>
      {show === 'cover' && (
        <div>
          {localeTabs}
          <div className="flex flex-col gap-8">
            <CoverFields i18n={i18n} mediaScope={mediaScope} />
            <Section title={INTRO} description="Un párrafo que presenta el sitio, justo después de la portada.">
              <div className="flex flex-col gap-5">
                <I18nField name="manifesto.eyebrow" label="Texto pequeño sobre el título" hint="Una o dos palabras, por ejemplo «Nuestra casa»." {...i18n} />
                <I18nField name="manifesto.text" label="Texto" multiline {...i18n} />
              </div>
            </Section>
          </div>
        </div>
      )}

      {show === 'photos' && (
        <GalleryField mediaScope={mediaScope} />
      )}

      {show === 'hours' && (
        <div className="flex flex-col gap-8">
          <ScheduleEditor />
          <Fold
            title="Textos que acompañan al horario"
            summary="Opcional. Si los dejas vacíos, la web usa sus textos de siempre."
            badge={<TranslationBadge count={translations.inSection(SCHEDULE_TEXTS)} />}
          >
            {localeTabs}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <I18nField name="scheduleTexts.open" label="Aviso de abierto" hint="Escribe {hora} donde va la hora de cierre: «Abierto hasta las {hora}»." {...i18n} />
              <I18nField name="scheduleTexts.nextOpening" label="Aviso de próxima apertura" hint="Escribe {hora} donde va la hora de apertura: «Hoy abrimos a las {hora}»." {...i18n} />
              <I18nField name="scheduleTexts.closed" label="Aviso de cerrado" hint="Por ejemplo, «Hoy cerramos»." {...i18n} />
            </div>
          </Fold>
        </div>
      )}

      {show === 'details' && (
        <Section title={`Nombre de «${form.getValues('name')}»`} description="Cómo se llama este espacio en el menú y en la web.">
          <Field id="s-name" className="md:max-w-[420px]" label="Nombre" error={errors.name?.message} required>
            {c => <TextInput {...c} autoComplete="off" {...register('name')} />}
          </Field>
        </Section>
      )}
    </FormProvider>
  );
}

type I18nProps = { locales: string[]; activeLocale: string; localeNames: Record<string, string>; defaultLocale: string };
type MediaScope = { restaurantSlug: string; locales: string[]; defaultLocale: string; localeNames: Record<string, string> };

function CoverFields({ i18n, mediaScope }: { i18n: I18nProps; mediaScope: MediaScope }) {
  const draft = useSpaceDraft()!;
  const { setValue, control, formState: { errors } } = draft.form;
  const heroImageId = useWatch({ control, name: 'hero.imageAssetId' });
  const altErrorLocale = i18n.locales.find(code => errors.hero?.imageAlt?.[code]);

  return (
      <Section title={COVER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <I18nField className="md:col-span-2" name="hero.title" label="Título" recommendedMax={42} {...i18n} />
          <I18nField className="md:col-span-2" name="hero.subtitle" label="Subtítulo" {...i18n} />
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
                if (asset) i18n.locales.forEach(code => setValue(`hero.imageAlt.${code}`, asset.altText?.[code] ?? '', { shouldDirty: true, shouldValidate: true }));
              }}
            />
          </div>
          {heroImageId && (
            <I18nField
              className="md:col-span-2"
             
              name="hero.imageAlt"
              label="Descripción de la foto"
              hint="Qué se ve en la foto, para quien no puede verla."
              errorFor={altErrorLocale}
              error={altErrorLocale ? errors.hero?.imageAlt?.[altErrorLocale]?.message : undefined}
              {...i18n}
            />
          )}
          <I18nField name="hero.cta" label="Texto del botón" hint="Por ejemplo, «Reservar mesa»." {...i18n} />
          <div className="hidden md:block" />
          <I18nField className="md:col-span-2" name="hero.note" label="Texto breve" multiline recommendedMax={240} {...i18n} />
          <I18nField name="hero.metaLeft" label="Dato a la izquierda" hint="Por ejemplo, el barrio." {...i18n} />
          <I18nField name="hero.metaRight" label="Dato a la derecha" hint="Por ejemplo, el tipo de cocina." {...i18n} />
        </div>
      </Section>
  );
}

function GalleryField({ mediaScope }: { mediaScope: MediaScope }) {
  const draft = useSpaceDraft()!;
  const { setValue, control } = draft.form;
  const gallery = useWatch({ control, name: 'gallery' });
  return (
    <ImageListField
      label="Fotos de la galería"
      hint="Horizontales o verticales, de al menos 800 px de ancho."
      scope={mediaScope}
      purpose="dish"
      max={60}
      assetIds={gallery}
      onChange={ids => setValue('gallery', ids, { shouldDirty: true })}
    />
  );
}
