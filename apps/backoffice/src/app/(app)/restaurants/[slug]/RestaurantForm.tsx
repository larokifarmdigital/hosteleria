'use client';

import { useState } from 'react';
import { FormProvider, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { Restaurant } from '@hosteleria/api-client';
import { PublishPanel } from '@/components/editor/PublishPanel';
import { SaveBar } from '@/components/editor/SaveBar';
import { LangList } from '@/components/restaurant/LangList';
import { Section } from '@/components/shared/Section';
import { SiteStatusCard } from '@/components/site/SiteStatusCard';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { PendingElsewhere } from '@/components/tasks/PendingElsewhere';
import { TabList, TabPanel } from '@/components/ui/Tabs';
import { showSuccessToast } from '@/lib/api';
import { countErrors, firstErrorPath } from '@/lib/forms/errors';
import { useTranslationStatus } from '@/lib/forms/useTranslationStatus';
import { useUnsavedChangesWarning } from '@/lib/forms/useUnsavedChangesWarning';
import { useDiscardRestaurant, usePatchRestaurant, usePublishRestaurant, useSession } from '@/lib/query/hooks';
import { ContentTab } from './form/ContentTab';
import { DataTab } from './form/DataTab';
import { SearchTab } from './form/SearchTab';
import { TextsTab } from './form/TextsTab';
import { changedBlocks, schema, TABS, tabOfField, toForm, toPatch, translatableFields, type FormValues, type TabId } from './form/model';

interface Props {
  restaurant: Restaurant;
  localeNames: Record<string, string>;
}

const TABS_ID = 'ficha';

export function RestaurantForm({ restaurant, localeNames }: Props) {
  const locales = restaurant.activeLocales as string[];
  const defaultLocale = restaurant.defaultLocale as string;
  const [locale, setLocale] = useState(defaultLocale);
  // La pestaña va en la URL (`?tab=content`): se conserva al recargar y se puede enlazar.
  const requestedTab = useSearchParams().get('tab');
  const [tab, setTabState] = useState<TabId>(TABS.find(t => t.id === requestedTab)?.id ?? 'data');
  const setTab = (id: TabId) => {
    setTabState(id);
    const url = new URL(window.location.href);
    if (id === 'data') url.searchParams.delete('tab');
    else url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  };
  // El foco en el primer error lo pone `onInvalid`: el campo puede estar en otra pestaña.
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(restaurant), shouldFocusError: false });
  const { handleSubmit, reset, setFocus, control, formState: { errors, isDirty, isSubmitted } } = form;
  const { data: user } = useSession();

  const patch = usePatchRestaurant(restaurant.slug);
  const publish = usePublishRestaurant(restaurant.slug);
  const discard = useDiscardRestaurant(restaurant.slug);

  useUnsavedChangesWarning(isDirty);

  /** Enseña la pestaña (y el idioma) del campo y le da el foco: hasta el siguiente render está oculto. */
  const goToField = (path: string, code?: string) => {
    setTab(tabOfField(path));
    if (code) setLocale(code);
    setTimeout(() => setFocus(path as Parameters<typeof setFocus>[0]), 0);
  };

  const values = useWatch({ control });
  const translations = useTranslationStatus({
    control,
    fields: translatableFields(values as Partial<FormValues>, restaurant),
    locales,
    localeNames,
    onGo: (fieldName, code) => goToField(`${fieldName}.${code}`, code)
  });

  const onSave = handleSubmit(
    async formValues => {
      try {
        const saved = await patch.mutateAsync(toPatch(formValues, restaurant));
        reset(toForm(saved));
        showSuccessToast('Cambios guardados', 'Aún no están en la web: publica cuando quieras.');
      } catch {
        // El hook ya muestra el error; el formulario conserva lo escrito.
      }
    },
    invalid => {
      const path = firstErrorPath(invalid);
      if (path) goToField(path);
    }
  );

  const tabs = TABS.map(t => ({
    ...t,
    pending: translations.gaps.filter(gap => tabOfField(gap.field.name) === t.id).length,
    errors: isSubmitted
      ? Object.entries(errors).reduce((n, [key, node]) => (tabOfField(key) === t.id ? n + countErrors({ [key]: node } as FieldErrors) : n), 0)
      : 0
  }));

  const tabProps = {
    restaurant,
    i18n: { locales, activeLocale: locale, localeNames, defaultLocale },
    mediaScope: { restaurantSlug: restaurant.slug, locales, defaultLocale, localeNames },
    localeTabs: <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} missing={translations.byLocale} />,
    pendingIn: translations.inSection
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave} noValidate className={isDirty ? 'pb-24' : undefined}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <TabList idPrefix={TABS_ID} label="Apartados de la ficha" tabs={tabs} value={tab} onChange={id => setTab(id as TabId)} />
            <TabPanel idPrefix={TABS_ID} id="data" active={tab === 'data'}><DataTab mediaScope={tabProps.mediaScope} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="content" active={tab === 'content'}><ContentTab {...tabProps} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="texts" active={tab === 'texts'}><TextsTab {...tabProps} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="search" active={tab === 'search'}><SearchTab {...tabProps} isAdmin={user?.role === 'admin'} /></TabPanel>
          </div>

          <aside aria-label="Publicación, idiomas y páginas legales" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
            <PublishPanel
              subject="los datos del restaurante"
              isPublished={restaurant.state === 'published'}
              hasPublishedVersion={!!restaurant.publishedSnapshot || !!restaurant.lastPublishedAt}
              lastPublishedAt={restaurant.lastPublishedAt}
              changes={changedBlocks(restaurant)}
              blockers={translations.blockers}
              formDirty={isDirty}
              publishing={publish.isPending}
              discarding={discard.isPending}
              onPublish={() => publish.mutateAsync().then(() => showSuccessToast('Publicado', 'La web se actualizará en un par de minutos.'))}
              onDiscard={() => discard.mutateAsync().then(r => { reset(toForm(r)); showSuccessToast('Has vuelto a lo publicado'); })}
            />

            <SiteStatusCard restaurant={restaurant} />

            <PendingElsewhere restaurant={restaurant} localeNames={localeNames} />

            <Section title="Idiomas de la web">
              <LangList restaurant={restaurant} />
            </Section>

            <Section title="Páginas legales">
              <Link
                href={`/restaurants/${restaurant.slug}/legal`}
                className="flex min-h-11 items-center justify-between gap-2.5 rounded-lg border border-[color:var(--color-border)] bg-white px-3 text-[13.5px] font-semibold text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-copper-300)]"
              >
                Aviso legal, privacidad y cookies
                <ChevronRight aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)]" />
              </Link>
            </Section>
          </aside>
        </div>

        <SaveBar dirty={isDirty} saving={patch.isPending} errorCount={isSubmitted ? countErrors(errors) : 0} onDiscard={() => reset()} />
      </form>
    </FormProvider>
  );
}
