'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PendingTask, Restaurant } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Section } from '@/components/shared/Section';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSuccessToast } from '@/lib/api';
import { usePendingTasks, usePublishAll } from '@/lib/query/hooks';
import { describeTask } from '@/lib/tasks';
import { formatDate } from '@/lib/utils';

/** Lo que se está editando en esta pantalla. */
export type PublishTarget = { kind: 'restaurant' } | { kind: 'space'; spaceId: string };

interface Props {
  restaurant: Restaurant;
  localeNames: Record<string, string>;
  current: PublishTarget;
  /** Cámbialo al guardar o publicar en esta pantalla, para volver a preguntar qué falta. */
  stamp: number;
  /** Bloques de lo que se está editando que difieren de lo publicado. */
  changes: string[];
  /** Traducciones que faltan en lo que se está editando, con enlace al campo exacto. */
  blockers?: PublishBlocker[];
  /** Con cambios sin guardar no se publica: se publicaría algo distinto de lo que se ve. */
  formDirty: boolean;
  /** Vuelve a lo publicado solo en lo que se está editando. */
  onDiscard: () => Promise<unknown>;
  discarding: boolean;
}

export interface PublishBlocker {
  id: string;
  /** Sección y campo, p. ej. «Portada · Título». */
  label: string;
  /** Idiomas que faltan, ya en texto: «catalán e inglés». */
  missing: string;
  /** Lleva al campo, en el primer idioma que falta. */
  onGo: () => void;
}

type Unpublished = Extract<PendingTask, { type: 'unpublished' }>;

const keyOf = (t: Unpublished['target'] | PublishTarget) => (t.kind === 'space' ? t.spaceId : 'ficha');

/**
 * Un solo «Publicar» para toda la web del restaurante: la ficha y cada espacio
 * con cambios salen juntos. Se ve igual en la ficha y en cada espacio, así nadie
 * cree haber publicado algo que se quedó en otra pantalla.
 */
export function PublishPanel({ restaurant, localeNames, current, stamp, changes, blockers = [], formDirty, onDiscard, discarding }: Props) {
  const [dialog, setDialog] = useState<'publish' | 'discard' | null>(null);
  const close = () => setDialog(null);
  const { data: tasks } = usePendingTasks(restaurant.slug, stamp);
  const publish = usePublishAll(restaurant.slug);

  const unpublished = (tasks ?? []).filter((t): t is Unpublished => t.type === 'unpublished');
  const pendingKeys = new Set(unpublished.map(t => keyOf(t.target)));
  const currentKey = keyOf(current);
  const currentPending = unpublished.find(t => keyOf(t.target) === currentKey);
  const items = unpublished.map(t => ({
    key: keyOf(t.target),
    label: t.target.kind === 'space' ? `Espacio «${t.target.spaceName}»` : 'Datos del restaurante',
    never: t.neverPublished
  }));

  // Lo que se edita aquí ya trae sus avisos campo a campo; del resto, los avisos del servidor.
  const otherBlockers = (tasks ?? [])
    .filter(t => t.type === 'translations' && (t.target.kind === 'restaurant' || t.target.kind === 'space'))
    .filter(t => {
      const key = t.target.kind === 'space' ? t.target.spaceId : 'ficha';
      return pendingKeys.has(key) && key !== currentKey;
    })
    .map(t => describeTask(t, restaurant.slug, localeNames));
  const blockerCount = blockers.length + otherBlockers.length;
  const blocked = blockerCount > 0;
  const neverPublished = !restaurant.publishedSnapshot && !restaurant.lastPublishedAt;
  const here = current.kind === 'space' ? 'este espacio' : 'la ficha';

  const onPublish = () =>
    publish.mutateAsync().then(() => {
      close();
      showSuccessToast('Publicado', 'La web se actualizará en un par de minutos.');
    }, () => {});

  return (
    <Section title="Publicación">
      {!tasks ? (
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--color-muted)]">Comprobando qué falta por publicar…</p>
      ) : items.length === 0 ? (
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--color-ink)]">
          <strong className="font-semibold">La web está al día.</strong>{' '}
          {restaurant.lastPublishedAt && <>Última publicación: {formatDate(restaurant.lastPublishedAt)}.</>}
        </p>
      ) : (
        <>
          <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--color-ink)]">
            <strong className="font-semibold">
              {neverPublished ? 'La web todavía no se ha publicado.' : 'Hay cambios guardados que la web aún no enseña:'}
            </strong>
          </p>
          <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
            {items.map(item => (
              <li key={item.key} className="rounded-[10px] border border-[color:var(--color-border)] px-3 py-2.5">
                <p className="m-0 text-[13.5px] font-semibold leading-[1.4] text-[color:var(--color-ink)]">
                  {item.label}
                  {item.key === currentKey && <span className="font-normal text-[color:var(--color-muted)]"> · lo que estás editando</span>}
                </p>
                <p className="m-0 text-[12.5px] leading-[1.45] text-[color:var(--color-ink-soft)]">
                  {item.never ? 'Nunca se ha publicado.' : 'Tiene cambios guardados.'}
                </p>
                {item.key === currentKey && !item.never && changes.length > 0 && <ChangeList changes={changes} />}
              </li>
            ))}
          </ul>

          {blocked && (
            <div className="mt-4 rounded-[10px] bg-[color:var(--color-warn-soft)] px-3.5 py-3">
              <p id="publicar-traducciones" className="m-0 text-[13px] font-semibold leading-[1.45] text-[color:var(--color-warn-fg)]">
                {otherBlockers.length > 0
                  ? 'Para publicar, falta traducir:'
                  : blockers.length === 1 ? 'Para publicar, falta traducir 1 texto:' : `Para publicar, faltan por traducir ${blockers.length} textos:`}
              </p>
              <ul className="m-0 mt-1.5 flex list-none flex-col p-0">
                {blockers.map(b => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={b.onGo}
                      className="min-h-11 w-full cursor-pointer rounded-md border-0 bg-transparent px-0 py-1.5 text-left text-[13.5px] leading-[1.4] text-[color:var(--color-ink)] sm:min-h-9"
                    >
                      <span className="font-semibold underline decoration-[color:var(--color-warn)] underline-offset-2">{b.label}</span>
                      <span className="block text-[12.5px] text-[color:var(--color-warn-fg)]">Falta en {b.missing}</span>
                    </button>
                  </li>
                ))}
                {otherBlockers.map(b => (
                  <li key={b.id}>
                    <Link
                      href={b.href}
                      className="block min-h-11 rounded-md py-1.5 text-[13.5px] leading-[1.4] text-[color:var(--color-ink)] sm:min-h-9"
                    >
                      <span className="font-semibold underline decoration-[color:var(--color-warn)] underline-offset-2">{b.text}</span>
                      {b.detail && <span className="block text-[12.5px] text-[color:var(--color-warn-fg)]">{b.detail}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="justify-center"
              disabled={formDirty || publish.isPending || blocked}
              aria-describedby={[formDirty && 'publicar-aviso', blocked && 'publicar-traducciones'].filter(Boolean).join(' ') || undefined}
              onClick={() => setDialog('publish')}
            >
              {items.length > 1 ? 'Publicar todo' : 'Publicar'}
            </Button>
            {currentPending && !currentPending.neverPublished && (
              <Button variant="secondary" className="justify-center" disabled={formDirty || discarding} onClick={() => setDialog('discard')}>
                Descartar los cambios de {here}
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

      <p className="m-0 mt-4 border-t border-[color:var(--color-border)] pt-3 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">
        La carta y las páginas legales no hace falta publicarlas: salen en la web un par de minutos después de guardarlas.
      </p>

      <ConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={open => !open && close()}
        title="¿Publicar en la web?"
        confirmLabel={items.length > 1 ? 'Publicar todo' : 'Publicar'}
        pendingLabel="Publicando…"
        pending={publish.isPending}
        onConfirm={onPublish}
      >
        <p className="m-0">Pasará a verse en la web todo lo guardado en:</p>
        <ul className="m-0 mt-1.5 list-disc pl-5 leading-[1.6]">
          {items.map(item => <li key={item.key}>{item.label}</li>)}
        </ul>
        <p className="m-0 mt-2">La actualización puede tardar un par de minutos.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'discard'}
        onOpenChange={open => !open && close()}
        title={`¿Descartar los cambios de ${here}?`}
        confirmLabel="Sí, descartar cambios"
        pendingLabel="Descartando…"
        pending={discarding}
        onConfirm={() => onDiscard().then(close, () => {})}
      >
        <p className="m-0">Vuelve a lo que se ve ahora en la web. Se perderán los cambios guardados sin publicar de {here}; lo demás no se toca. No se puede deshacer.</p>
        {changes.length > 0 && <ChangeList changes={changes} />}
      </ConfirmDialog>
    </Section>
  );
}

function ChangeList({ changes }: { changes: string[] }) {
  return (
    <div className="mt-2">
      <p className="m-0 text-[12.5px] font-semibold text-[color:var(--color-ink)]">Qué cambia:</p>
      <ul className="m-0 mt-0.5 list-disc pl-5 text-[12.5px] leading-[1.6] text-[color:var(--color-ink-soft)]">
        {changes.map(c => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
