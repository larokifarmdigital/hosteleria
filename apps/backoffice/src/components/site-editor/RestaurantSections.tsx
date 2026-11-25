'use client';

import { useState } from 'react';
import type { PendingTask } from '@hosteleria/api-client';
import { LangList } from '@/components/restaurant/LangList';
import { LanguagesDialog } from '@/components/restaurant/LanguagesDialog';
import { Button } from '@/components/shared/Button';
import { Fold, Section } from '@/components/shared/Section';
import { I18nField } from '@/components/editor/I18nField';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { SiteStatusCard } from '@/components/site/SiteStatusCard';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { PendingTaskList } from '@/components/tasks/PendingTaskList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSuccessToast } from '@/lib/api';
import { useDiscardRestaurant, useDiscardSpace, usePendingTasks } from '@/lib/query/hooks';
import { ContentTab } from '@/app/(app)/restaurants/[slug]/form/ContentTab';
import { DataTab } from '@/app/(app)/restaurants/[slug]/form/DataTab';
import { SearchTab } from '@/app/(app)/restaurants/[slug]/form/SearchTab';
import { UI_TEXT_BLOCKS, toForm as restaurantToForm, visibleUiTextFields } from '@/app/(app)/restaurants/[slug]/form/model';
import type { TabProps } from '@/app/(app)/restaurants/[slug]/form/types';
import { useEditor, useFlushAll, useRestaurantDraft, useSpaceDraft } from './EditorContext';
import { toForm as spaceToForm } from './spaceForm';

export type RestaurantSectionKey = 'admin' | 'overview' | 'contact' | 'languages' | 'home' | 'about' | 'groups' | 'faq' | 'search';

/** Lo que se edita de la ficha en cada sección. El formulario es el del borrador de la ficha. */
export function RestaurantSection({ show }: { show: RestaurantSectionKey }) {
  const { restaurant, locales, localeNames, defaultLocale, locale, setLocale, isAdmin } = useEditor();
  const { translations } = useRestaurantDraft();

  const tabProps: TabProps = {
    restaurant,
    i18n: { locales, activeLocale: locale, localeNames, defaultLocale },
    mediaScope: { restaurantSlug: restaurant.slug, locales, defaultLocale, localeNames },
    localeTabs: <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} first={defaultLocale} />,
    pendingIn: translations.inSection
  };

  switch (show) {
    case 'overview': return <Overview />;
    case 'contact': return <DataTab show="data" mediaScope={tabProps.mediaScope} isAdmin={isAdmin} />;
    case 'admin': return <DataTab show="admin" mediaScope={tabProps.mediaScope} isAdmin={isAdmin} />;
    case 'languages': return <Languages />;
    case 'search': return <SearchTab {...tabProps} isAdmin={isAdmin} />;
    default: return <ContentTab show={show} {...tabProps} />;
  }
}

/**
 * Títulos y frases de la plantilla que redacta el restaurante (carta, galería,
 * reserva, pie), plegados dentro de la sección donde se ven.
 */
export function UiTextsFold({ title, summary }: { title: string; summary: string }) {
  const { restaurant, locales, localeNames, defaultLocale, locale, setLocale } = useEditor();
  const { translations } = useRestaurantDraft();
  const block = UI_TEXT_BLOCKS.find(b => b.title === title);
  if (!block) return null;
  const fields = visibleUiTextFields(block.fields, restaurant);
  const i18n = { locales, activeLocale: locale, localeNames, defaultLocale };
  return (
    <Fold title={title} summary={summary} badge={<TranslationBadge count={translations.inSection(title)} />}>
      <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} first={defaultLocale} />
      <div className="flex flex-col gap-5">
        {fields.map(f => (
          <I18nField key={`${f.group}.${f.key}`} name={`uiTexts.${f.group}.${f.key}`} label={f.label} hint={f.hint} multiline={f.multiline} rows={2} {...i18n} />
        ))}
      </div>
    </Fold>
  );
}

function Languages() {
  const { restaurant, isAdmin } = useEditor();
  const flushAll = useFlushAll();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Idiomas de la web" description="El principal es el que se enseña primero a quien entra.">
      <LangList restaurant={restaurant} />
      <div className="mt-5">
        <Button
          disabled={busy}
          onClick={async () => {
            // Cambiar los idiomas monta de nuevo los formularios: antes se guarda lo pendiente.
            setBusy(true);
            try { await flushAll(); setOpen(true); } finally { setBusy(false); }
          }}
        >
          Cambiar idiomas
        </Button>
      </div>
      {open && <LanguagesDialog restaurant={restaurant} isAdmin={isAdmin} onClose={() => setOpen(false)} />}
    </Section>
  );
}

type Unpublished = Extract<PendingTask, { type: 'unpublished' }>;

function Overview() {
  const { restaurant, localeNames } = useEditor();
  const { data: tasks, isPending } = usePendingTasks(restaurant.slug);
  // Lo que está sin publicar ya lo dice la barra de arriba; aquí, lo que falta completar.
  const todo = tasks?.filter(task => task.type !== 'unpublished');
  const withChanges = (tasks ?? []).filter((t): t is Unpublished => t.type === 'unpublished' && !t.neverPublished);

  return (
    <div className="flex flex-col gap-6">
      <Section title="Lo que falta" description="Cada aviso lleva al sitio donde se arregla.">
        {isPending ? (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-muted)]">Comprobando el contenido…</p>
        ) : todo && todo.length > 0 ? (
          <PendingTaskList slug={restaurant.slug} tasks={todo} localeNames={localeNames} />
        ) : (
          <p role="status" className="m-0 text-[13.5px] text-[color:var(--color-ink-soft)]">Nada: no falta traducir ni completar nada.</p>
        )}
      </Section>

      <SiteStatusCard restaurant={restaurant} />

      {withChanges.length > 0 && (
        <Section title="Deshacer cambios sin publicar" description="Vuelve a lo que se ve ahora en la web. No se puede deshacer.">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {withChanges.map(task => (
              <li key={task.target.kind === 'space' ? task.target.spaceId : 'ficha'}>
                {task.target.kind === 'space'
                  ? <DiscardSpace spaceId={task.target.spaceId} name={task.target.spaceName} />
                  : <DiscardRestaurant />}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function DiscardRow({ label, pending, onConfirm }: { label: string; pending: boolean; onConfirm: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[color:var(--color-border)] px-4 py-2.5">
      <span className="text-[14px] font-semibold">{label}</span>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Descartar los cambios de ${label}`}>Descartar cambios</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Descartar los cambios de ${label}?`}
        confirmLabel="Sí, descartar"
        pendingLabel="Descartando…"
        pending={pending}
        onConfirm={() => onConfirm().then(() => setOpen(false), () => {})}
      >
        <p className="m-0">Vuelve a lo que se ve ahora en la web. Lo demás no se toca.</p>
      </ConfirmDialog>
    </div>
  );
}

function DiscardRestaurant() {
  const { restaurant } = useEditor();
  const { form } = useRestaurantDraft();
  const discard = useDiscardRestaurant(restaurant.slug);
  return (
    <DiscardRow
      label="los datos del restaurante"
      pending={discard.isPending}
      onConfirm={() => discard.mutateAsync().then(r => { form.reset(restaurantToForm(r)); showSuccessToast('Has vuelto a lo publicado'); })}
    />
  );
}

function DiscardSpace({ spaceId, name }: { spaceId: string; name: string }) {
  const { restaurant, locales, space } = useEditor();
  const draft = useSpaceDraft();
  const discard = useDiscardSpace(restaurant.slug, spaceId);
  return (
    <DiscardRow
      label={`«${name}»`}
      pending={discard.isPending}
      onConfirm={() => discard.mutateAsync().then(s => {
        // Si es el espacio que está abierto, el formulario vuelve también a lo publicado.
        if (draft && space?.id === spaceId) draft.form.reset(spaceToForm(s, locales));
        showSuccessToast('Has vuelto a lo publicado');
      })}
    />
  );
}
