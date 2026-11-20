'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { Section } from '@/components/shared/Section';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/lib/utils';

interface Props {
  /** Cómo llamar a lo que se publica: «los datos del restaurante», «este espacio». */
  subject: string;
  isPublished: boolean;
  hasPublishedVersion: boolean;
  lastPublishedAt?: string | null;
  /** Nombres de los bloques que difieren de lo publicado. */
  changes: string[];
  /** Con cambios sin guardar no se publica: se publicaría algo distinto de lo que se ve. */
  formDirty: boolean;
  publishing: boolean;
  discarding: boolean;
  onPublish: () => Promise<unknown>;
  onDiscard: () => Promise<unknown>;
}

export function PublishPanel({
  subject, isPublished, hasPublishedVersion, lastPublishedAt, changes, formDirty, publishing, discarding, onPublish, onDiscard
}: Props) {
  const [dialog, setDialog] = useState<'publish' | 'discard' | null>(null);
  const close = () => setDialog(null);

  return (
    <Section title="Publicación">
      {isPublished ? (
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--color-ink)]">
          <strong className="font-semibold">La web está al día.</strong>{' '}
          {lastPublishedAt && <>Última publicación: {formatDate(lastPublishedAt)}.</>}
        </p>
      ) : (
        <>
          <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--color-ink)]">
            <strong className="font-semibold">
              {hasPublishedVersion ? 'Hay cambios guardados que aún no están en la web.' : 'Todavía no se ha publicado.'}
            </strong>
          </p>
          {hasPublishedVersion && changes.length > 0 && <ChangeList changes={changes} />}

          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="justify-center"
              disabled={formDirty || publishing}
              aria-describedby={formDirty ? 'publicar-aviso' : undefined}
              onClick={() => setDialog('publish')}
            >
              {hasPublishedVersion ? 'Publicar cambios' : 'Publicar'}
            </Button>
            {hasPublishedVersion && (
              <Button variant="secondary" className="justify-center" disabled={formDirty || discarding} onClick={() => setDialog('discard')}>
                Volver a lo publicado
              </Button>
            )}
          </div>
          {formDirty && (
            <p id="publicar-aviso" className="m-0 mt-2.5 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
              Guarda primero los cambios para poder publicar.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={open => !open && close()}
        title={`¿Publicar ${subject}?`}
        confirmLabel="Publicar"
        pendingLabel="Publicando…"
        pending={publishing}
        onConfirm={() => onPublish().then(close, () => {})}
      >
        <p className="m-0">Lo que has guardado pasará a verse en la web. La actualización puede tardar un par de minutos.</p>
        {hasPublishedVersion && changes.length > 0 && <ChangeList changes={changes} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'discard'}
        onOpenChange={open => !open && close()}
        title="¿Volver a lo publicado?"
        confirmLabel="Sí, descartar cambios"
        pendingLabel="Descartando…"
        pending={discarding}
        onConfirm={() => onDiscard().then(close, () => {})}
      >
        <p className="m-0">Se perderán los cambios guardados que no estén publicados. No se puede deshacer.</p>
        {changes.length > 0 && <ChangeList changes={changes} />}
      </ConfirmDialog>
    </Section>
  );
}

function ChangeList({ changes }: { changes: string[] }) {
  return (
    <div className="mt-3">
      <p className="m-0 text-[13px] font-semibold text-[color:var(--color-ink)]">Qué cambia:</p>
      <ul className="m-0 mt-1 list-disc pl-5 text-[13.5px] leading-[1.6] text-[color:var(--color-ink-soft)]">
        {changes.map(c => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
