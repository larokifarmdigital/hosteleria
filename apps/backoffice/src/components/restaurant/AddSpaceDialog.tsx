'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import type { Space, SpaceType } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { useCreateSpace } from '@/lib/query/hooks';
import { freeSlug, SPACE_TYPES } from '@/lib/spaces';

interface Props {
  restaurantSlug: string;
  /** Los que ya existen: para no repetir dirección. */
  spaces: Space[];
  onClose: () => void;
}

/** Alta de un espacio: lo mínimo para crearlo; el resto se rellena en su propia página. */
export function AddSpaceDialog({ restaurantSlug, spaces, onClose }: Props) {
  const router = useRouter();
  const create = useCreateSpace(restaurantSlug);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ name: string; type: SpaceType; descriptor: string }>({
    defaultValues: { name: '', type: 'restaurant', descriptor: '' }
  });

  const onSubmit = handleSubmit(async values => {
    const name = values.name.trim();
    if (!name) { setError('name', { message: 'Escribe el nombre del espacio.' }, { shouldFocus: true }); return; }
    try {
      const space = await create.mutateAsync({
        name,
        slug: freeSlug(name, spaces.map(s => s.slug)),
        type: values.type,
        descriptor: values.descriptor.trim()
      });
      showSuccessToast('Espacio creado', 'Rellena su portada y su horario, y publícalo cuando esté listo.');
      router.push(`/restaurants/${restaurantSlug}?s=cover&e=${space.id}`);
    } catch {
      // El hook ya muestra el error; el diálogo sigue abierto con lo escrito.
    }
  });

  return (
    <Modal
      open
      onClose={() => { if (!create.isPending) onClose(); }}
      title="Nuevo espacio"
      description="Una sala, una terraza, una barra… con su propia portada, horario y carta. Nace sin publicar: no sale en la web hasta que lo publiques."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field id="sp-name" label="Nombre" hint="Como lo llamáis: «Terraza», «Sala privada», «Coctelería»…" error={errors.name?.message} required>
          {control => <TextInput autoComplete="off" maxLength={120} {...control} {...register('name')} />}
        </Field>
        <Field id="sp-type" label="Tipo">
          {control => (
            <Select {...control} {...register('type')}>
              {SPACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          )}
        </Field>
        {spaces.length === 1 && (
          <p className="m-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[color:var(--color-ink-soft)]">
            Hasta ahora este restaurante tenía un solo espacio. Si su web está hecha para uno solo, el nuevo no aparecerá en ella hasta que se adapte el diseño.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" disabled={create.isPending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>{create.isPending ? 'Creando…' : 'Crear espacio'}</Button>
        </div>
      </form>
    </Modal>
  );
}
