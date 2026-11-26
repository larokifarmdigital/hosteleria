'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import type { PendingTask, SiteChanges } from '@hosteleria/api-client';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/ui/Modal';
import { showSuccessToast } from '@/lib/api';
import { api } from '@/lib/api/browser';
import { useDiscardAll, usePendingTasks, usePublishAll, useSiteChanges, useSiteStatus } from '@/lib/query/hooks';
import { toForm as restaurantToForm } from '@/app/(app)/restaurants/[slug]/form/model';
import { toForm as spaceToForm } from './spaceForm';
import { describeTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { SectionHeadingLevel } from '@/components/shared/Section';
import { useEditor, useFlushAll, useGoToField, useRestaurantDraft, useSpaceDraft } from './EditorContext';
import { StatusContent } from './StatusContent';
import type { SaveStatus } from './useAutosave';

type Unpublished = Extract<PendingTask, { type: 'unpublished' }>;

/** Los dos estados que importan, en palabras de quien edita: ¿está guardado? ¿está en la web? */
/** Lo que sale al publicar además de la ficha y los espacios: carta, legales y espacios. */
function otherChanges(changes: SiteChanges, spaceNames: Map<string, string>): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const id of changes.menuSpaceIds) {
    out.push({ key: `menu:${id}`, label: spaceNames.size > 1 ? `La carta de «${spaceNames.get(id) ?? 'un espacio'}»` : 'La carta' });
  }
  if (changes.legal.length > 0) out.push({ key: 'legal', label: 'Los textos legales' });
  if (changes.spaces.order || changes.spaces.isDefault) out.push({ key: 'spaces', label: 'El orden de los espacios' });
  for (const s of changes.spaces.removed) out.push({ key: `removed:${s.id}`, label: `Quitar el espacio «${s.name}»` });
  return out;
}

export function useEditorStatus() {
  const { restaurant, spaces } = useEditor();
  const spaceNames = new Map(spaces.map(s => [s.id, s.name]));
  const restaurantDraft = useRestaurantDraft();
  const spaceDraft = useSpaceDraft();
  const { data: tasks } = usePendingTasks(restaurant.slug);
  // Carta, legales y espacios no tienen borrador propio: lo que cambió desde el último «Publicar».
  const { data: changes } = useSiteChanges(restaurant.slug);

  const drafts: { which: 'restaurant' | 'space'; status: SaveStatus }[] = [
    { which: 'restaurant', status: restaurantDraft.status },
    ...(spaceDraft ? [{ which: 'space' as const, status: spaceDraft.status }] : [])
  ];
  const saving = drafts.some(d => d.status.state === 'saving');
  const failed = drafts.find(d => d.status.state === 'error');
  const invalid = drafts.find(d => d.status.state === 'invalid');
  const saved = drafts.some(d => d.status.state === 'saved');

  const unpublished = (tasks ?? []).filter((t): t is Unpublished => t.type === 'unpublished');
  const neverPublished = !restaurant.publishedSnapshot && !restaurant.lastPublishedAt;
  const other = changes ? otherChanges(changes, spaceNames) : [];
  const web: 'loading' | 'up_to_date' | 'changes' | 'never' =
    // Los cambios de carta y legales llegan aparte: no retrasan el botón.
    !tasks ? 'loading' : neverPublished ? 'never' : unpublished.length > 0 || other.length > 0 ? 'changes' : 'up_to_date';

  return { saving, failed, invalid, saved, unpublished, otherChanges: other, tasks: tasks ?? [], web };
}

/** Cabecera del editor: nombre del restaurante, los dos estados y una sola acción. */
export function EditorTopBar() {
  const { restaurant } = useEditor();
  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 [@media(max-height:500px)]:static border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:top-14 lg:-mx-8 lg:-mt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3">
        <div
          aria-hidden
          className="hidden h-10 w-10 flex-shrink-0 place-items-center rounded-[12px] text-[15px] font-bold text-white sm:grid"
          style={{ background: 'var(--gradient-copper)' }}
        >
          {restaurant.logoInitial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-[17px] font-bold leading-[1.25] tracking-[-0.015em] sm:text-[19px]">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            <SaveIndicator />
            <span className="hidden sm:inline-flex"><WebIndicator /></span>
          </div>
        </div>
        <div className="hidden sm:block">
          <MainAction />
        </div>
      </div>
    </div>
  );
}

/** En móvil: estado de la web y la acción, siempre a mano abajo. */
export function EditorMobileBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 [@media(max-height:500px)]:static [@media(max-height:500px)]:-mx-4 [@media(max-height:500px)]:mt-6 border-t border-[color:var(--color-border)] bg-white px-4 py-2.5 shadow-[0_-4px_16px_rgb(0_0_0/0.06)] sm:hidden">
      <WebIndicator />
      <MainAction />
    </div>
  );
}

function SaveIndicator() {
  const { saving, failed, invalid, saved } = useEditorStatus();
  const restaurantDraft = useRestaurantDraft();
  const spaceDraft = useSpaceDraft();
  const goToField = useGoToField();
  const base = 'inline-flex min-h-7 items-center gap-1.5 text-[13px] font-medium';

  let content: React.ReactNode;
  if (saving) {
    content = <span className={cn(base, 'text-[color:var(--color-muted)]')}><Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />Guardando…</span>;
  } else if (failed) {
    content = (
      <span className={cn(base, 'text-[color:var(--color-danger)]')}>
        <AlertCircle aria-hidden className="h-3.5 w-3.5" />
        No se ha podido guardar.
        <button
          type="button"
          className="min-h-7 cursor-pointer border-0 bg-transparent p-0 font-semibold text-[color:var(--color-danger)] underline underline-offset-2"
          onClick={() => void (failed.which === 'restaurant' ? restaurantDraft.flush() : spaceDraft?.flush())}
        >
          Reintentar
        </button>
      </span>
    );
  } else if (invalid && invalid.status.state === 'invalid') {
    const status = invalid.status;
    content = (
      <span className={cn(base, 'text-[color:var(--color-danger)]')}>
        <AlertCircle aria-hidden className="h-3.5 w-3.5" />
        Sin guardar: {status.message ?? 'hay un campo por corregir'}.
        {status.path && (
          <button
            type="button"
            className="min-h-7 cursor-pointer border-0 bg-transparent p-0 font-semibold text-[color:var(--color-danger)] underline underline-offset-2"
            onClick={() => goToField(invalid.which, status.path!)}
          >
            Ir al campo
          </button>
        )}
      </span>
    );
  } else {
    content = <span className={cn(base, 'text-[color:var(--color-ok-fg)]')}><Check aria-hidden className="h-3.5 w-3.5" />{saved ? 'Cambios guardados' : 'Todo guardado'}</span>;
  }
  return <span role="status" aria-live="polite">{content}</span>;
}

/** Estado de la web; al pulsarlo, el detalle: cómo está la web, lo que falta y deshacer lo no publicado. */
function WebIndicator() {
  const { restaurant } = useEditor();
  const { web, tasks } = useEditorStatus();
  const { data: site } = useSiteStatus(restaurant.slug);
  const [open, setOpen] = useState(false);
  const dot = (color: string) => <span aria-hidden className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} />;
  const base = 'inline-flex min-h-7 items-center gap-1.5 text-[13px] font-medium text-[color:var(--color-ink-soft)]';
  if (web === 'loading') return <span className={base}>Comprobando la web…</span>;

  const todo = tasks.filter(t => t.type !== 'unpublished').length;
  const label =
    web === 'never' ? <>{dot('var(--color-muted)')}La web aún no se ha publicado</>
      : web === 'changes' ? <>{dot('var(--color-warn)')}Hay cambios sin publicar</>
        : site?.state === 'updating' ? <>{dot('var(--color-warn)')}La web se está actualizando</>
          : <>{dot('var(--color-ok)')}La web está al día</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(base, 'cursor-pointer rounded-[6px] border-0 bg-transparent px-0 hover:text-[color:var(--color-ink)]')}
      >
        {label}
        {todo > 0 && <span className="text-[color:var(--color-muted)]">· {todo === 1 ? 'falta 1 cosa' : `faltan ${todo} cosas`}</span>}
        <ChevronRight aria-hidden className="h-3.5 w-3.5 text-[color:var(--color-muted)]" />
        <span className="sr-only">(ver el detalle)</span>
      </button>
      {open && (
        <Modal open size="lg" onClose={() => setOpen(false)} title="Estado de tu web">
          {/* Un aviso lleva a otra sección: el diálogo se cierra al seguirlo. */}
          <div onClickCapture={e => { if ((e.target as HTMLElement).closest('a[href^="/"]')) setOpen(false); }}>
            <SectionHeadingLevel value={3}>
              <StatusContent />
            </SectionHeadingLevel>
          </div>
        </Modal>
      )}
    </>
  );
}

function MainAction() {
  const { restaurant } = useEditor();
  const { web, saving } = useEditorStatus();
  const [open, setOpen] = useState(false);
  const flushAll = useFlushAll();
  const [preparing, setPreparing] = useState(false);

  // Mientras se comprueba, nada: un botón que cambia al momento confunde.
  if (web === 'loading') return null;
  if (web === 'up_to_date') {
    return (
      <a
        href={`https://${restaurant.domain}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[color:var(--color-border-strong)] bg-white px-4 text-[14px] font-semibold text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] sm:min-h-9"
      >
        Ver mi web
        <ExternalLink aria-hidden className="h-4 w-4" />
        <span className="sr-only">(se abre en otra pestaña)</span>
      </a>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        disabled={preparing || saving}
        onClick={async () => {
          // Primero se guarda lo que esté a medias: se publica lo que se ve.
          setPreparing(true);
          try { await flushAll(); setOpen(true); } finally { setPreparing(false); }
        }}
      >
        {preparing ? 'Guardando…' : web === 'never' ? 'Publicar la web' : 'Publicar cambios'}
      </Button>
      {open && <PublishDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  const { restaurant, localeNames, space } = useEditor();
  const { failed, invalid, unpublished, otherChanges, tasks, web } = useEditorStatus();
  const publish = usePublishAll(restaurant.slug);
  const discardAll = useDiscardAll(restaurant.slug);
  const restaurantDraft = useRestaurantDraft();
  const spaceDraft = useSpaceDraft();
  const { locales } = useEditor();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const firstTime = web === 'never';
  // Lo que falta traducir. La primera vez frena (la web tiene que nacer completa);
  // después solo avisa: en esos textos la web enseña el idioma principal.
  const pendingKeys = new Set(unpublished.map(t => (t.target.kind === 'space' ? t.target.spaceId : 'ficha')));
  const untranslated = tasks
    .filter(t => t.type === 'translations')
    .filter(t => !firstTime || ((t.target.kind === 'restaurant' || t.target.kind === 'space') && pendingKeys.has(t.target.kind === 'space' ? t.target.spaceId : 'ficha')))
    .map(t => describeTask(t, restaurant.slug, localeNames));
  const blocked = firstTime && untranslated.length > 0;
  const notSaved = !!failed || !!invalid;
  const items = [
    ...unpublished.map(t => ({
      key: t.target.kind === 'space' ? t.target.spaceId : 'ficha',
      label: t.target.kind === 'space' ? `El espacio «${t.target.spaceName}»` : 'Los datos y textos del restaurante',
      never: t.neverPublished
    })),
    ...otherChanges.map(c => ({ ...c, never: false }))
  ];

  const onDiscard = () => discardAll.mutateAsync().then(async r => {
    // Los formularios abiertos vuelven también a lo publicado.
    restaurantDraft.form.reset(restaurantToForm(r));
    if (spaceDraft && space) spaceDraft.form.reset(spaceToForm(await api.spaces.get(restaurant.slug, space.id), locales));
    onClose();
    showSuccessToast('Has vuelto a lo publicado');
  }, () => {});

  const taskList = (list: typeof untranslated) => (
    <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
      {list.map(b => (
        <li key={b.id}>
          <Link href={b.href} onClick={onClose} className="block rounded-[10px] border border-[color:var(--color-border)] px-3.5 py-2.5 hover:border-[color:var(--color-accent)]">
            <span className="block text-[14px] font-semibold text-[color:var(--color-ink)] underline underline-offset-2">{b.text}</span>
            {b.detail && <span className="mt-0.5 block text-[13px] text-[color:var(--color-muted)]">{b.detail}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (confirmDiscard) {
    return (
      <Modal open onClose={onClose} title="¿Descartar todos los cambios?">
        <p className="m-0 text-[14px] leading-[1.55]">Todo vuelve a como se ve ahora en tu web: {items.map(i => i.label.toLowerCase()).join(', ')}.</p>
        <p className="m-0 mt-2 text-[14px] leading-[1.55]">No se puede deshacer. Un espacio que hayas borrado no vuelve.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={() => setConfirmDiscard(false)}>Volver</Button>
          <Button variant="primary" disabled={discardAll.isPending} onClick={onDiscard}>{discardAll.isPending ? 'Descartando…' : 'Sí, descartar todo'}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={blocked || notSaved ? 'Aún no se puede publicar' : '¿Publicar en la web?'}>
      {notSaved ? (
        <p className="m-0 text-[14px] leading-[1.55]">Hay un cambio que no se ha podido guardar. Corrígelo arriba (en rojo) y vuelve a intentarlo.</p>
      ) : blocked ? (
        <>
          <p className="m-0 text-[14px] leading-[1.55]">La primera vez, la web tiene que estar en todos sus idiomas. Falta traducir:</p>
          {taskList(untranslated)}
        </>
      ) : (
        <>
          <p className="m-0 text-[14px] leading-[1.55]">Pasará a verse en la web todo lo que has cambiado en:</p>
          <ul className="m-0 mt-2 list-disc pl-5 text-[14px] leading-[1.7]">
            {items.map(item => <li key={item.key}>{item.label}{item.never ? ' (primera vez)' : ''}</li>)}
          </ul>
          {untranslated.length > 0 && (
            <div className="mt-4 rounded-[10px] bg-[color:var(--color-warn-soft)] px-3.5 py-3">
              <p className="m-0 text-[14px] font-semibold text-[color:var(--color-warn-fg)]">Falta traducir algunos textos</p>
              <p className="m-0 mt-1 text-[13.5px] leading-[1.5] text-[color:var(--color-ink-soft)]">Puedes publicar igualmente: en esos idiomas, la web enseñará el texto en el idioma principal.</p>
              {taskList(untranslated)}
            </div>
          )}
          <p className="m-0 mt-3 text-[13.5px] leading-[1.5] text-[color:var(--color-muted)]">La web tarda un par de minutos en actualizarse.</p>
        </>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        {!firstTime && !notSaved && items.length > 0 && (
          <Button variant="ghost" className="mr-auto text-[color:var(--color-danger)]" onClick={() => setConfirmDiscard(true)}>Descartar todos los cambios</Button>
        )}
        <Button onClick={onClose}>{blocked || notSaved ? 'Cerrar' : 'Cancelar'}</Button>
        {!notSaved && !blocked && (
          <Button
            variant="primary"
            disabled={publish.isPending}
            onClick={() => publish.mutateAsync().then(() => {
              onClose();
              showSuccessToast('Publicado', 'La web se actualizará en un par de minutos.');
            }, () => {})}
          >
            {publish.isPending ? 'Publicando…' : untranslated.length > 0 ? 'Publicar igualmente' : 'Publicar'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
