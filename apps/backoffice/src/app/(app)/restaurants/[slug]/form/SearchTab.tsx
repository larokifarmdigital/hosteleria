'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { I18nField } from '@/components/editor/I18nField';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { FormImageField } from '@/components/media/FormImageField';
import { ImageField } from '@/components/media/ImageField';
import { Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/inputs';
import { AI, BRAND_ICON, EXTRA_SERVICES, GOOGLE, PAYMENT_METHODS, type FormValues } from './model';
import type { TabProps } from './types';

const LEGEND = 'mb-1 p-0 text-[13.5px] font-semibold text-[color:var(--color-ink)]';

export function SearchTab({ i18n, mediaScope, localeTabs, pendingIn, isAdmin }: TabProps & { isAdmin: boolean }) {
  const { register, formState: { errors } } = useFormContext<FormValues>();

  return (
    <div>
      {localeTabs}

      <div className="flex flex-col gap-6">
        <Section title={GOOGLE} description="Título y descripción que se ven en los resultados de búsqueda." badge={<TranslationBadge count={pendingIn(GOOGLE)} />}>
          <div className="flex flex-col gap-5">
            <I18nField name="seo.title" label="Título" recommendedMax={60} {...i18n} />
            <I18nField name="seo.description" label="Descripción" multiline recommendedMax={160} hint="Una o dos frases que inviten a entrar." {...i18n} />
            <FormImageField name="seo.imageAssetId" label="Foto al compartir el enlace" hint="La que se ve al enviar la web por WhatsApp o redes. Horizontal y de al menos 1600 px de ancho." scope={mediaScope} purpose="hero" />
          </div>
        </Section>

        <Section title={BRAND_ICON} description="Una sola imagen cuadrada, en PNG y de al menos 512 × 512 px. Sale en la pestaña del navegador, en el móvil si alguien guarda la web y en Google.">
          <BrandIconField mediaScope={mediaScope} />
        </Section>

        <Section title="Datos del negocio" description="Google los enseña junto al restaurante en el buscador y en el mapa.">
          <div className="flex flex-col gap-6">
            <Field id="r-price" className="md:max-w-[320px]" label="Precio medio por persona (€)" error={errors.business?.averagePrice?.message} hint="Solo el importe, por ejemplo 35.">
              {control => <TextInput {...control} inputMode="decimal" autoComplete="off" {...register('business.averagePrice')} />}
            </Field>

            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={LEGEND}>Formas de pago</legend>
              <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                {PAYMENT_METHODS.map(option => (
                  <Checkbox key={option.value} id={`r-pay-${option.value}`} label={option.label} value={option.value} {...register('business.paymentMethods')} />
                ))}
              </div>
            </fieldset>

            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={LEGEND}>Servicios</legend>
              <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                {EXTRA_SERVICES.map(option => (
                  <Checkbox key={option.value} id={`r-service-${option.value}`} label={option.label} value={option.value} {...register('business.extraServices')} />
                ))}
              </div>
            </fieldset>
          </div>
        </Section>

        <Section title={AI} description="Lo que leen ChatGPT, Gemini y otros asistentes cuando alguien les pregunta por el restaurante." badge={<TranslationBadge count={pendingIn(AI)} />}>
          <I18nField name="aiSummary" label="Resumen" multiline rows={6} hint="Qué cocina hacéis, dónde estáis, para quién es y qué os distingue. Con frases completas." {...i18n} />
        </Section>

      </div>
    </div>
  );
}

const BRAND_FIELDS = ['branding.faviconAssetId', 'branding.appIconAssetId', 'branding.logoAssetId'] as const;

/** Una imagen para los tres usos (pestaña, móvil y logo para Google): se guarda en los tres. */
function BrandIconField({ mediaScope }: Pick<TabProps, 'mediaScope'>) {
  const { control, setValue } = useFormContext<FormValues>();
  const ids = useWatch({ control, name: BRAND_FIELDS });
  return (
    <ImageField
      label="Icono"
      hint="Con color de fondo, no transparente: en el móvil se ve sobre fondos de cualquier color. Mejor un símbolo sencillo o la inicial que el logo con letra pequeña."
      scope={mediaScope}
      purpose="logo"
      assetId={ids.find(Boolean) || null}
      showDescription
      onChange={asset => BRAND_FIELDS.forEach(name => setValue(name, asset?.id ?? '', { shouldDirty: true }))}
    />
  );
}
