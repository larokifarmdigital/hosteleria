'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Restaurant } from '@hosteleria/api-client';
import { I18nField } from '@/components/editor/I18nField';
import { PublishPanel } from '@/components/editor/PublishPanel';
import { SaveBar } from '@/components/editor/SaveBar';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { LangList } from '@/components/restaurant/LangList';
import { Section } from '@/components/shared/Section';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/inputs';
import { showSuccessToast } from '@/lib/api';
import { countErrors } from '@/lib/forms/errors';
import { compact, i18nFromForm, i18nToForm, sameContent } from '@/lib/forms/i18n';
import { i18nValues, optionalEmail, optionalText, optionalUrl, requiredText } from '@/lib/forms/rules';
import type { TranslatableField } from '@/lib/forms/translations';
import { useTranslationStatus } from '@/lib/forms/useTranslationStatus';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { useDiscardRestaurant, usePatchRestaurant, usePublishRestaurant } from '@/lib/query/hooks';

const schema = z.object({
  name: requiredText(120),
  address: z.object({
    street: optionalText(200),
    postalCode: optionalText(20),
    city: optionalText(120),
    district: optionalText(120),
    province: optionalText(120),
    country: optionalText(120)
  }),
  contact: z.object({
    phone: optionalText(40),
    whatsapp: optionalText(40),
    email: optionalEmail,
    web: optionalUrl
  }),
  socials: z.object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl
  }),
  seo: z.object({ title: i18nValues, description: i18nValues }),
  acceptsBookings: z.boolean(),
  showSocials: z.boolean()
});

type FormValues = z.infer<typeof schema>;

const GOOGLE = 'Cómo aparece en Google';
const TRANSLATABLE: TranslatableField[] = [
  { name: 'seo.title', label: 'Título', section: GOOGLE },
  { name: 'seo.description', label: 'Descripción', section: GOOGLE }
];

function toForm(r: Restaurant): FormValues {
  return {
    name: r.name,
    address: {
      street: r.address.street ?? '',
      postalCode: r.address.postalCode ?? '',
      city: r.address.city ?? '',
      district: r.address.district ?? '',
      province: r.address.province ?? '',
      country: r.address.country ?? ''
    },
    contact: {
      phone: r.contact.phone ?? '',
      whatsapp: r.contact.whatsapp ?? '',
      email: r.contact.email ?? '',
      web: r.contact.web ?? ''
    },
    socials: {
      instagram: r.socials.instagram ?? '',
      facebook: r.socials.facebook ?? '',
      tiktok: r.socials.tiktok ?? ''
    },
    seo: {
      title: i18nToForm(r.seo.title, r.activeLocales),
      description: i18nToForm(r.seo.description, r.activeLocales)
    },
    acceptsBookings: r.acceptsBookings,
    showSocials: r.showSocials
  };
}

/** Bloques que difieren de lo último publicado, con el nombre que ve el editor. */
function changedBlocks(r: Restaurant): string[] {
  const snap = r.publishedSnapshot;
  if (!snap) return [];
  const blocks: [string, unknown, unknown][] = [
    ['Nombre', r.name, snap.name],
    ['Dirección', r.address, snap.address],
    ['Contacto', r.contact, snap.contact],
    ['Redes sociales', r.socials, snap.socials],
    [GOOGLE, r.seo, snap.seo],
    ['Reservas online', r.acceptsBookings, snap.acceptsBookings],
    ['Mostrar redes en la web', r.showSocials, snap.showSocials]
  ];
  return blocks.filter(([, now, before]) => !sameContent(now, before)).map(([label]) => label);
}

interface Props {
  restaurant: Restaurant;
  localeNames: Record<string, string>;
}

export function RestaurantForm({ restaurant, localeNames }: Props) {
  const [locale, setLocale] = useState(restaurant.defaultLocale as string);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(restaurant) });
  const { register, handleSubmit, reset, setFocus, control, formState: { errors, isDirty, isSubmitted } } = form;

  const patch = usePatchRestaurant(restaurant.slug);
  const publish = usePublishRestaurant(restaurant.slug);
  const discard = useDiscardRestaurant(restaurant.slug);

  useUnsavedChangesWarning(isDirty);

  const translations = useTranslationStatus({
    control,
    fields: TRANSLATABLE,
    locales: restaurant.activeLocales,
    localeNames,
    onGo: (fieldName, code) => {
      setLocale(code);
      // El campo de ese idioma está oculto hasta el siguiente render.
      setTimeout(() => setFocus(`${fieldName}.${code}` as Parameters<typeof setFocus>[0]), 0);
    }
  });

  const onSave = handleSubmit(async values => {
    try {
      const saved = await patch.mutateAsync({
        name: values.name,
        address: compact(values.address),
        contact: compact(values.contact),
        socials: compact(values.socials),
        seo: {
          title: i18nFromForm(restaurant.seo.title, values.seo.title),
          description: i18nFromForm(restaurant.seo.description, values.seo.description)
        },
        acceptsBookings: values.acceptsBookings,
        showSocials: values.showSocials,
        // Guardar nunca publica: deja el contenido como borrador hasta que se pulse Publicar.
        state: 'draft'
      });
      reset(toForm(saved));
      showSuccessToast('Cambios guardados', 'Aún no están en la web: publica cuando quieras.');
    } catch {
      // El hook ya muestra el error; el formulario conserva lo escrito.
    }
  });

  const text = (id: string, label: string, name: Parameters<typeof register>[0], error?: string, opts?: { hint?: string; type?: string; autoComplete?: string; inputMode?: 'tel' | 'email' | 'url'; required?: boolean }) => (
    <Field id={id} label={label} hint={opts?.hint} error={error} required={opts?.required}>
      {control => (
        <TextInput {...control} type={opts?.type} inputMode={opts?.inputMode} autoComplete={opts?.autoComplete ?? 'off'} {...register(name)} />
      )}
    </Field>
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave} noValidate className={isDirty ? 'pb-24' : undefined}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Section title="Datos básicos">
              {text('r-name', 'Nombre del restaurante', 'name', errors.name?.message, { required: true })}
            </Section>

            <Section title="Dirección">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">{text('r-street', 'Calle y número', 'address.street', errors.address?.street?.message)}</div>
                {text('r-postal', 'Código postal', 'address.postalCode', errors.address?.postalCode?.message)}
                {text('r-city', 'Ciudad', 'address.city', errors.address?.city?.message)}
                {text('r-district', 'Barrio', 'address.district', errors.address?.district?.message, { hint: 'Ayuda a que te encuentren quienes buscan en tu zona.' })}
                {text('r-province', 'Provincia', 'address.province', errors.address?.province?.message)}
                {text('r-country', 'País', 'address.country', errors.address?.country?.message)}
              </div>
            </Section>

            <Section title="Contacto">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {text('r-phone', 'Teléfono', 'contact.phone', errors.contact?.phone?.message, { type: 'tel', inputMode: 'tel' })}
                {text('r-whatsapp', 'WhatsApp', 'contact.whatsapp', errors.contact?.whatsapp?.message, { type: 'tel', inputMode: 'tel', hint: 'Con prefijo de país, por ejemplo +34 600 000 000.' })}
                {text('r-email', 'Email', 'contact.email', errors.contact?.email?.message, { type: 'email', inputMode: 'email' })}
                {text('r-web', 'Página web', 'contact.web', errors.contact?.web?.message, { type: 'url', inputMode: 'url' })}
              </div>
            </Section>

            <Section title="Redes sociales" description="Pega el enlace completo de cada perfil.">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {text('r-instagram', 'Instagram', 'socials.instagram', errors.socials?.instagram?.message, { type: 'url', inputMode: 'url' })}
                {text('r-facebook', 'Facebook', 'socials.facebook', errors.socials?.facebook?.message, { type: 'url', inputMode: 'url' })}
                {text('r-tiktok', 'TikTok', 'socials.tiktok', errors.socials?.tiktok?.message, { type: 'url', inputMode: 'url' })}
              </div>
              <Checkbox id="r-show-socials" className="mt-4" label="Mostrar las redes en la web" {...register('showSocials')} />
            </Section>

            <Section title={GOOGLE} description="Título y descripción que se ven en los resultados de búsqueda." badge={<TranslationBadge count={translations.inSection(GOOGLE)} />}>
              <LocaleTabs locales={restaurant.activeLocales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} />
              <div className="flex flex-col gap-5">
                <I18nField reference="side" defaultLocale={restaurant.defaultLocale} name="seo.title" label="Título" locales={restaurant.activeLocales} activeLocale={locale} localeNames={localeNames} recommendedMax={60} />
                <I18nField reference="side" defaultLocale={restaurant.defaultLocale} name="seo.description" label="Descripción" locales={restaurant.activeLocales} activeLocale={locale} localeNames={localeNames} multiline recommendedMax={160} hint="Una o dos frases que inviten a entrar." />
              </div>
            </Section>

            <Section title="Reservas">
              <Checkbox
                id="r-bookings"
                label="Aceptar reservas desde la web"
                hint="Si lo desactivas, la web no mostrará el formulario de reserva."
                {...register('acceptsBookings')}
              />
            </Section>
          </div>

          <aside aria-label="Publicación e idiomas" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
            <PublishPanel
              subject="los datos del restaurante"
              isPublished={restaurant.state === 'published'}
              hasPublishedVersion={!!restaurant.publishedSnapshot || !!restaurant.lastPublishedAt}
              lastPublishedAt={restaurant.lastPublishedAt}
              changes={changedBlocks(restaurant)}
              blockers={translations.blockers}
              formDirty={isDirty}
              publishing={publish.isPending}
              discarding={discard.isPending}
              onPublish={() => publish.mutateAsync().then(() => showSuccessToast('Publicado', 'La web se actualizará en un par de minutos.'))}
              onDiscard={() => discard.mutateAsync().then(r => { reset(toForm(r)); showSuccessToast('Has vuelto a lo publicado'); })}
            />

            <Section title="Idiomas de la web">
              <LangList restaurant={restaurant} />
            </Section>
          </aside>
        </div>

        <SaveBar dirty={isDirty} saving={patch.isPending} errorCount={isSubmitted ? countErrors(errors) : 0} onDiscard={() => reset()} />
      </form>
    </FormProvider>
  );
}
