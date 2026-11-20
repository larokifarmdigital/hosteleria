'use client';

import { useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/inputs';
import { DAY_LABEL, closesNextDay, type ScheduleValues } from '@/lib/forms/schedule';

type Shift = ScheduleValues[number]['shifts'][number];
interface FormShape { schedule: ScheduleValues }

/** Edita `schedule` del formulario que lo contiene: siete días fijos, cada uno con sus turnos. */
export function ScheduleEditor() {
  const { control, setValue, getValues } = useFormContext<FormShape>();
  const { fields } = useFieldArray({ control, name: 'schedule' });
  const [announcement, setAnnouncement] = useState('');

  const copyToAll = (from: number) => {
    const source = getValues(`schedule.${from}.shifts`);
    fields.forEach((_, i) => {
      if (i !== from) setValue(`schedule.${i}.shifts`, source.map(s => ({ ...s })), { shouldDirty: true, shouldValidate: true });
    });
    setAnnouncement(`Horario del ${DAY_LABEL[fields[from].day].toLowerCase()} copiado a todos los días.`);
  };

  return (
    <div>
      <div className="flex flex-col divide-y divide-[color:var(--color-border)]">
        {fields.map((field, i) => (
          <DayRow key={field.id} index={i} day={field.day} onCopyToAll={() => copyToAll(i)} />
        ))}
      </div>
      <p role="status" className="sr-only">{announcement}</p>
    </div>
  );
}

function DayRow({ index, day, onCopyToAll }: { index: number; day: ScheduleValues[number]['day']; onCopyToAll: () => void }) {
  const { control, register, formState: { errors } } = useFormContext<FormShape>();
  const name = `schedule.${index}.shifts` as const;
  const { fields, append, remove } = useFieldArray({ control, name });
  const shifts = (useWatch({ control, name }) ?? []) as Shift[];
  const addRef = useRef<HTMLButtonElement>(null);
  const label = DAY_LABEL[day];

  return (
    <div role="group" aria-labelledby={`h-${day}-titulo`} className="py-4 first:pt-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`h-${day}-titulo`} className="m-0 text-[14.5px] font-bold text-[color:var(--color-ink)]">{label}</h3>
        {fields.length === 0 && <span className="text-[14px] text-[color:var(--color-muted)]">Cerrado</span>}
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field, i) => {
          const shiftErrors = errors.schedule?.[index]?.shifts?.[i];
          const id = `h-${day}-${i}`;
          const overnight = closesNextDay(shifts[i]?.open ?? '', shifts[i]?.close ?? '');
          return (
            <div key={field.id}>
              <div className="flex items-start gap-3">
                <Field id={`${id}-abre`} label="Abre" labelSuffix={`${label}, turno ${i + 1}`} error={shiftErrors?.open?.message} className="min-w-[104px] max-w-[140px] flex-1">
                  {c => <TextInput type="time" {...c} {...register(`${name}.${i}.open`)} />}
                </Field>
                <Field id={`${id}-cierra`} label="Cierra" labelSuffix={`${label}, turno ${i + 1}`} error={shiftErrors?.close?.message} className="min-w-[104px] max-w-[140px] flex-1">
                  {c => <TextInput type="time" {...c} {...register(`${name}.${i}.close`)} />}
                </Field>
                <button
                  type="button"
                  aria-label={`Quitar el turno ${i + 1} del ${label.toLowerCase()}`}
                  onClick={() => { remove(i); addRef.current?.focus(); }}
                  className="mt-[27px] grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-danger)] hover:text-[color:var(--color-danger)]"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
              {overnight && (
                <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--color-muted)]">Cierra de madrugada, ya en el día siguiente.</p>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2.5">
          <Button
            ref={addRef}
            size="sm"
            aria-label={fields.length === 0 ? `Añadir horario al ${label.toLowerCase()}` : `Añadir otro turno al ${label.toLowerCase()}`}
            onClick={() => append({ open: '', close: '' }, { focusName: `${name}.${fields.length}.open` })}
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
            {fields.length === 0 ? 'Añadir horario' : 'Añadir otro turno'}
          </Button>
          {fields.length > 0 && (
            <Button size="sm" variant="ghost" aria-label={`Copiar el horario del ${label.toLowerCase()} a todos los días`} onClick={onCopyToAll}>
              Copiar a todos los días
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
