'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { Checkbox, FormSelect, TextInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useCreateRestaurant, useLanguages } from '@/lib/query/hooks';
import { slugify } from '@/lib/spaces';

interface FormValues {
  name: string;
  domain: string;
  defaultLocale: string;
  locales: Record<string, boolean>;
}

interface Props {
  /** Identificadores ya usados, para avisar antes de enviar. */
  takenSlugs: string[];
  onClose: () => void;
}

const hostOf = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

/** Alta de un restaurante: lo mínimo para crearlo; el resto se rellena en su ficha. */
export function AddRestaurantDialog({ takenSlugs, onClose }: Props) {
  const router = useRouter();
  const { data: languages = [] } = useLanguages();
  const create = useCreateRestaurant();
  const { register, handleSubmit, setError, watch, control: formControl, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', domain: '', defaultLocale: 'es', locales: { es: true } }
  });
  const locales = watch('locales');
  const active = languages.map(l => l.code as string).filter(code => locales?.[code]);

  const onSubmit = handleSubmit(async values => {
    const name = values.name.trim();
    const slug = slugify(name);
    const domain = hostOf(values.domain);
    if (!name) { setError('name', { message: 'Escribe el nombre del restaurante.' }, { shouldFocus: true }); return; }
    if (slug.length < 2) { setError('name', { message: 'El nombre necesita al menos dos letras o números.' }, { shouldFocus: true }); return; }
    if (takenSlugs.includes(slug)) { setError('name', { message: `Ya hay un restaurante con ese nombre («${slug}»). Usa otro para distinguirlos.` }, { shouldFocus: true }); return; }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
      setError('domain', { message: 'Escribe la dirección de la web, por ejemplo «www.mirestaurante.com».' }, { shouldFocus: true });
      return;
    }
    if (active.length === 0) { setError('defaultLocale', { message: 'Marca al menos un idioma.' }); return; }
    const defaultLocaleCode = active.includes(values.defaultLocale) ? values.defaultLocale : active[0];
    try {
      const restaurant = await create.mutateAsync({ slug, name, domain, defaultLocaleCode, activeLocaleCodes: active });
      showSuccessToast('Restaurante creado', 'Añade su primer espacio y rellena la ficha.');
      router.push(`/restaurants/${restaurant.slug}`);
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto con lo escrito.
    }
  });

  return (
    <Modal
      open
      onClose={() => { if (!create.isPending) onClose(); }}
      title="Nuevo restaurante"
      description="Crea la ficha vacía. Su web hay que montarla aparte: aquí solo se prepara el contenido."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field id="nr-name" label="Nombre" error={errors.name?.message} required>
          {control => <TextInput autoComplete="off" maxLength={120} {...control} {...register('name')} />}
        </Field>
        <Field id="nr-domain" label="Dirección de la web" hint="Sin «https://», por ejemplo «www.mirestaurante.com». Se puede cambiar después." error={errors.domain?.message} required>
          {control => <TextInput autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="url" {...control} {...register('domain')} />}
        </Field>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 p-0 text-[13px] font-semibold text-[color:var(--color-ink)]">Idiomas de la web</legend>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {languages.map(l => <Checkbox key={l.id} id={`nr-l-${l.code}`} label={l.name} {...register(`locales.${l.code}`)} />)}
          </div>
        </fieldset>
        <Field id="nr-default" label="Idioma principal" hint="El que se enseña primero a quien entra." error={errors.defaultLocale?.message}>
          {control => (
            <FormSelect {...control} control={formControl} name='defaultLocale'>
              {(active.length > 0 ? languages.filter(l => active.includes(l.code as string)) : languages).map(l => <option key={l.id} value={l.code}>{l.name}</option>)}
            </FormSelect>
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" disabled={create.isPending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>{create.isPending ? 'Creando…' : 'Crear restaurante'}</Button>
        </div>
      </form>
    </Modal>
  );
}
