'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import type { ImagePurpose } from '@/lib/media/imageChecks';
import { ImageField } from './ImageField';
import type { MediaScope } from './types';

interface Props {
  /** Campo del formulario con el id de la foto; vacío = sin foto. */
  name: string;
  label: string;
  hint?: string;
  scope: MediaScope;
  purpose: Exclude<ImagePurpose, 'any'>;
}

/** `ImageField` enlazado a un campo del formulario que guarda el id de la foto. */
export function FormImageField({ name, label, hint, scope, purpose }: Props) {
  const { control, setValue } = useFormContext();
  const assetId = useWatch({ control, name }) as string | undefined;
  return (
    <ImageField
      label={label}
      hint={hint}
      scope={scope}
      purpose={purpose}
      assetId={assetId || null}
      showDescription
      onChange={asset => setValue(name, asset?.id ?? '', { shouldDirty: true })}
    />
  );
}
