'use client';

import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { AddLanguagesDialog } from '@/components/restaurant/AddLanguagesDialog';
import { Pill } from '@/components/shared/Pill';
import { Table, Td } from '@/components/shared/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ROW_ICON_BUTTON } from '@/components/ui/Sortable';
import { showSuccessToast } from '@/lib/api';
import { useLanguages, usePatchRestaurant } from '@/lib/query/hooks';
import { Button } from '@/components/shared/Button';
import { Fold, Section } from '@/components/shared/Section';
import { I18nField } from '@/components/editor/I18nField';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { ContentTab } from '@/app/(app)/restaurants/[slug]/form/ContentTab';
import { DataTab } from '@/app/(app)/restaurants/[slug]/form/DataTab';
import { SearchTab } from '@/app/(app)/restaurants/[slug]/form/SearchTab';
import { UI_TEXT_BLOCKS, visibleUiTextFields } from '@/app/(app)/restaurants/[slug]/form/model';
import type { TabProps } from '@/app/(app)/restaurants/[slug]/form/types';
import { useEditor, useFlushAll, useRestaurantDraft } from './EditorContext';

export type RestaurantSectionKey = 'admin' | 'contact' | 'languages' | 'home' | 'about' | 'groups' | 'faq' | 'search';

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

const LANGUAGE_COLUMNS = [{ label: 'Idioma' }, { label: 'Código' }, { label: 'En la web' }, { label: 'Acciones', hidden: true }];

/** Los idiomas de la web en una tabla: el principal marcado y, en cada fila, sus acciones con icono. */
function Languages() {
  const { restaurant, isAdmin } = useEditor();
  const flushAll = useFlushAll();
  const patch = usePatchRestaurant(restaurant.slug);
  const { data: languages = [] } = useLanguages();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const active = restaurant.activeLocales as string[];
  const main = restaurant.defaultLocale as string;
  const nameOf = (code: string) => languages.find(l => l.code === code)?.name ?? code.toUpperCase();

  // Cambiar los idiomas monta de nuevo los formularios: antes se guarda lo pendiente.
  const apply = async (codes: string[], defaultCode: string, done: [string, string]) => {
    await flushAll();
    await patch.mutateAsync({ activeLocaleCodes: codes, defaultLocaleCode: defaultCode, state: 'draft' });
    showSuccessToast(done[0], done[1]);
  };

  return (
    <Section title="Idiomas" description="En qué idiomas se puede leer la web. El principal es el que se enseña primero.">
      <div className="mb-3 flex justify-end">
        <Button variant="primary" onClick={() => setAdding(true)}>Añadir idioma</Button>
      </div>
      <Table caption="Idiomas de la web" columns={LANGUAGE_COLUMNS}>
        {active.map(code => {
          const isMain = code === main;
          return (
            <tr key={code}>
              <Td><strong className="font-semibold text-[color:var(--color-ink)]">{nameOf(code)}</strong></Td>
              <Td className="uppercase text-[color:var(--color-muted)]">{code}</Td>
              <Td>{isMain ? <Pill variant="accent">Principal</Pill> : <span className="text-[13px] text-[color:var(--color-muted)]">Sí</span>}</Td>
              <Td className="w-[1%] whitespace-nowrap text-right">
                <div className="flex justify-end gap-1">
                  {!isMain && (
                    <button
                      type="button"
                      className={ROW_ICON_BUTTON}
                      aria-label={`Hacer principal: ${nameOf(code)}`}
                      title="Hacer principal"
                      disabled={patch.isPending}
                      onClick={() => void apply(active, code, ['Idioma principal cambiado', 'Sale en la web al publicar.']).catch(() => {})}
                    >
                      <Star aria-hidden className="h-[18px] w-[18px]" />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${ROW_ICON_BUTTON} hover:text-[color:var(--color-danger)] disabled:cursor-default disabled:opacity-35`}
                    aria-label={isMain ? `Quitar ${nameOf(code)} (antes elige otro principal)` : `Quitar ${nameOf(code)} de la web`}
                    title={isMain ? 'Es el principal: elige otro antes de quitarlo' : 'Quitar de la web'}
                    disabled={isMain || active.length < 2}
                    onClick={() => setRemoving(code)}
                  >
                    <Trash2 aria-hidden className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>

      {adding && (
        <AddLanguagesDialog
          restaurant={restaurant}
          isAdmin={isAdmin}
          onClose={() => setAdding(false)}
          onAdd={codes => apply([...active, ...codes], main, [codes.length > 1 ? 'Idiomas añadidos' : 'Idioma añadido', 'Traduce los textos y publica para que salgan en la web.'])}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={open => { if (!open) setRemoving(null); }}
        title={removing ? `¿Quitar ${nameOf(removing)} de la web?` : ''}
        confirmLabel="Sí, quitar"
        pendingLabel="Quitando…"
        pending={patch.isPending}
        onConfirm={() => {
          if (!removing) return;
          void apply(active.filter(c => c !== removing), main, ['Idioma quitado', 'Sus páginas dejan de existir en la web al publicar.'])
            .then(() => setRemoving(null), () => {});
        }}
      >
        <p className="m-0">Sus páginas dejarán de existir en la web cuando publiques. Los textos ya traducidos se guardan por si lo vuelves a añadir.</p>
      </ConfirmDialog>
    </Section>
  );
}
