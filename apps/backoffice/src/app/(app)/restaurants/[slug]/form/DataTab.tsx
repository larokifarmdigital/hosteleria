'use client';

import { useFormContext } from 'react-hook-form';
import { Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { SwitchRow, TextArea, TextInput } from '@/components/ui/inputs';
import type { FormValues } from './model';
import type { TabProps } from './types';

type InputOptions = { hint?: string; type?: string; autoComplete?: string; inputMode?: 'tel' | 'email' | 'url' | 'numeric'; required?: boolean };

/** `show`: los datos y el contacto, o la dirección de la web (solo administradores). */
export function DataTab({ show, mediaScope, isAdmin }: Pick<TabProps, 'mediaScope'> & { show: 'data' | 'admin'; isAdmin: boolean }) {
  const { register, formState: { errors } } = useFormContext<FormValues>();

  const text = (id: string, label: string, name: Parameters<typeof register>[0], error?: string, opts?: InputOptions) => (
    <Field id={id} label={label} hint={opts?.hint} error={error} required={opts?.required}>
      {control => (
        <TextInput {...control} type={opts?.type} inputMode={opts?.inputMode} autoComplete={opts?.autoComplete ?? 'off'} {...register(name)} />
      )}
    </Field>
  );

  // De la dirección dependen los enlaces que ve Google y la comprobación de la web: solo administradores.
  if (show === 'admin') {
    if (!isAdmin) return null;
    return (
      <section aria-labelledby="r-admin-titulo" className="rounded-[12px] border border-dashed border-[color:var(--color-control)] p-4 sm:p-5">
        <h3 id="r-admin-titulo" className="m-0 mb-4 text-[13px] font-semibold text-[color:var(--color-muted)]">Solo administradores</h3>
        {text('r-domain', 'Dirección de la web', 'domain', errors.domain?.message, { inputMode: 'url', required: true, hint: 'Sin «https://»: por ejemplo «www.mirestaurante.com». Es la que se le da a Google como oficial.' })}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Section title="Datos básicos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {text('r-name', 'Nombre del restaurante', 'name', errors.name?.message, { required: true })}
          {text('r-founded', 'Año de apertura', 'foundedYear', errors.foundedYear?.message, { inputMode: 'numeric', hint: 'Si quieres contarlo en la web.' })}
        </div>
      </Section>

      <Section title="Teléfono y correo" description="Con lo que te pueden llamar, escribir o reservar.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {text('r-phone', 'Teléfono', 'contact.phone', errors.contact?.phone?.message, { type: 'tel', inputMode: 'tel' })}
          {text('r-whatsapp', 'WhatsApp', 'contact.whatsapp', errors.contact?.whatsapp?.message, { type: 'tel', inputMode: 'tel', hint: 'Con prefijo de país, por ejemplo +34 600 000 000.' })}
          {text('r-email', 'Email', 'contact.email', errors.contact?.email?.message, { type: 'email', inputMode: 'email' })}
          {text('r-web', 'Otra página web', 'contact.web', errors.contact?.web?.message, { type: 'url', inputMode: 'url', hint: 'Solo si tienes otra aparte de esta.' })}
        </div>
        <SwitchRow
          id="r-bookings"
          className="mt-5"
          label="Aceptar reservas desde la web"
          hint="Si lo desactivas, la web no enseña el formulario de reserva."
          {...register('acceptsBookings')}
        />
      </Section>

      <Section title="Dirección">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">{text('r-street', 'Calle y número', 'address.street', errors.address?.street?.message)}</div>
          <div className="sm:col-span-2">{text('r-postal', 'Código postal', 'address.postalCode', errors.address?.postalCode?.message)}</div>
          <div className="sm:col-span-3">{text('r-city', 'Ciudad', 'address.city', errors.address?.city?.message)}</div>
          <div className="sm:col-span-3">{text('r-district', 'Barrio', 'address.district', errors.address?.district?.message, { hint: 'Ayuda a que te encuentren quienes buscan en tu zona.' })}</div>
          <div className="sm:col-span-3">{text('r-province', 'Provincia', 'address.province', errors.address?.province?.message)}</div>
          <div className="sm:col-span-3">{text('r-country', 'País', 'address.country', errors.address?.country?.message)}</div>
          <Field id="r-map" className="sm:col-span-6" label="Mapa de Google" error={errors.mapUrl?.message} hint="En Google Maps: Compartir → Insertar un mapa → Copiar HTML. Pégalo aquí tal cual.">
            {control => <TextArea {...control} rows={3} autoComplete="off" spellCheck={false} {...register('mapUrl')} />}
          </Field>
        </div>
      </Section>

      <Section title="Redes sociales" description="Pega el enlace completo de cada perfil.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {text('r-instagram', 'Instagram', 'socials.instagram', errors.socials?.instagram?.message, { type: 'url', inputMode: 'url' })}
          {text('r-facebook', 'Facebook', 'socials.facebook', errors.socials?.facebook?.message, { type: 'url', inputMode: 'url' })}
          {text('r-tiktok', 'TikTok', 'socials.tiktok', errors.socials?.tiktok?.message, { type: 'url', inputMode: 'url' })}
        </div>
        <SwitchRow id="r-show-socials" className="mt-5" label="Mostrar las redes en la web" {...register('showSocials')} />
      </Section>

    </div>
  );
}
