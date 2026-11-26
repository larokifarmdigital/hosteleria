'use client';

import { useState } from 'react';
import { LangList } from '@/components/restaurant/LangList';
import { LanguagesDialog } from '@/components/restaurant/LanguagesDialog';
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
