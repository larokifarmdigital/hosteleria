'use client';

import { useFormContext } from 'react-hook-form';
import { I18nField } from '@/components/editor/I18nField';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { FormImageField } from '@/components/media/FormImageField';
import { Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/inputs';
import { AI, EXTRA_SERVICES, GOOGLE, PAYMENT_METHODS, type FormValues } from './model';
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
            <I18nField reference="side" name="seo.title" label="Título" recommendedMax={60} {...i18n} />
            <I18nField reference="side" name="seo.description" label="Descripción" multiline recommendedMax={160} hint="Una o dos frases que inviten a entrar." {...i18n} />
            <FormImageField name="seo.imageAssetId" label="Foto al compartir el enlace" hint="La que se ve al enviar la web por WhatsApp o redes. Horizontal y de al menos 1600 px de ancho." scope={mediaScope} purpose="hero" />
          </div>
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
          <I18nField reference="side" name="aiSummary" label="Resumen" multiline rows={6} hint="Qué cocina hacéis, dónde estáis, para quién es y qué os distingue. Con frases completas." {...i18n} />
        </Section>

        {isAdmin && (
          <Section title="Analítica" description="Solo lo ven los administradores.">
            <Field id="r-analytics" label="Token de Cloudflare Web Analytics" error={errors.analyticsToken?.message} hint="Sin él, la web no cuenta las visitas.">
              {control => <TextInput {...control} autoComplete="off" spellCheck={false} {...register('analyticsToken')} />}
            </Field>
          </Section>
        )}
      </div>
    </div>
  );
}
