'use client';

import { useFormContext } from 'react-hook-form';
import { FormImageField } from '@/components/media/FormImageField';
import { Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextArea, TextInput } from '@/components/ui/inputs';
import type { FormValues } from './model';
import type { TabProps } from './types';

type InputOptions = { hint?: string; type?: string; autoComplete?: string; inputMode?: 'tel' | 'email' | 'url' | 'numeric'; required?: boolean };

export function DataTab({ mediaScope, isAdmin }: Pick<TabProps, 'mediaScope'> & { isAdmin: boolean }) {
  const { register, formState: { errors } } = useFormContext<FormValues>();

  const text = (id: string, label: string, name: Parameters<typeof register>[0], error?: string, opts?: InputOptions) => (
    <Field id={id} label={label} hint={opts?.hint} error={error} required={opts?.required}>
      {control => (
        <TextInput {...control} type={opts?.type} inputMode={opts?.inputMode} autoComplete={opts?.autoComplete ?? 'off'} {...register(name)} />
      )}
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title="Datos básicos">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {text('r-name', 'Nombre del restaurante', 'name', errors.name?.message, { required: true })}
          {text('r-founded', 'Año de apertura', 'foundedYear', errors.foundedYear?.message, { inputMode: 'numeric', hint: 'El año en que abrió el restaurante, si quieres contarlo.' })}
          {/* De la dirección dependen los enlaces que ve Google y la comprobación de la web: solo administradores. */}
          {isAdmin && (
            <div className="md:col-span-2">
              {text('r-domain', 'Dirección de la web', 'domain', errors.domain?.message, { inputMode: 'url', required: true, hint: 'Donde se ve la web, sin «https://»: por ejemplo «www.mirestaurante.com». Es la dirección que se le da a Google como oficial.' })}
            </div>
          )}
        </div>
      </Section>

      <Section title="Logo e iconos" description="Mejor en PNG, cuadrados y de al menos 500 px de lado.">
        <div className="flex flex-col gap-6">
          <FormImageField name="branding.logoAssetId" label="Logo" hint="Se usa en Google y al compartir la web. Con fondo transparente." scope={mediaScope} purpose="logo" />
          <FormImageField name="branding.faviconAssetId" label="Icono de la pestaña del navegador" hint="Se ve muy pequeño: usa un símbolo sencillo, como la inicial o el logo sin texto." scope={mediaScope} purpose="logo" />
          <FormImageField name="branding.appIconAssetId" label="Icono para el móvil" hint="Aparece si alguien guarda la web en la pantalla de inicio. Con color de fondo, nunca transparente." scope={mediaScope} purpose="logo" />
        </div>
      </Section>

      <Section title="Dirección">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">{text('r-street', 'Calle y número', 'address.street', errors.address?.street?.message)}</div>
          {text('r-postal', 'Código postal', 'address.postalCode', errors.address?.postalCode?.message)}
          {text('r-city', 'Ciudad', 'address.city', errors.address?.city?.message)}
          {text('r-district', 'Barrio', 'address.district', errors.address?.district?.message, { hint: 'Ayuda a que te encuentren quienes buscan en tu zona.' })}
          {text('r-province', 'Provincia', 'address.province', errors.address?.province?.message)}
          {text('r-country', 'País', 'address.country', errors.address?.country?.message)}
          <Field id="r-map" className="md:col-span-2" label="Mapa de Google" error={errors.mapUrl?.message} hint="En Google Maps: Compartir → Insertar un mapa → Copiar HTML. Pégalo aquí tal cual.">
            {control => <TextArea {...control} rows={3} autoComplete="off" spellCheck={false} {...register('mapUrl')} />}
          </Field>
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

      <Section title="Reservas">
        <Checkbox
          id="r-bookings"
          label="Aceptar reservas desde la web"
          hint="Si lo desactivas, la web no mostrará el formulario de reserva."
          {...register('acceptsBookings')}
        />
      </Section>
    </div>
  );
}
