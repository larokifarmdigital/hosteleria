'use client';

import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { Restaurant, Space } from '@hosteleria/api-client';
import { PublishPanel } from '@/components/editor/PublishPanel';
import { SaveBar } from '@/components/editor/SaveBar';
import { LangList } from '@/components/restaurant/LangList';
import { LanguagesDialog } from '@/components/restaurant/LanguagesDialog';
import { Button, LinkButton } from '@/components/shared/Button';
import { Section } from '@/components/shared/Section';
import { SiteStatusCard } from '@/components/site/SiteStatusCard';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { OverviewPanel } from '@/components/restaurant/OverviewPanel';
import { SpacesSection } from '@/components/restaurant/SpacesSection';
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
import { changedBlocks, schema, TAB_ALIAS, TAB_GROUPS, TABS, tabOfField, toForm, toPatch, translatableFields, type FormValues, type TabId } from './form/model';

interface Props {
  restaurant: Restaurant;
  spaces: Space[];
  localeNames: Record<string, string>;
}

const TABS_ID = 'ficha';

export function RestaurantForm({ restaurant, spaces, localeNames }: Props) {
  const locales = restaurant.activeLocales as string[];
  const defaultLocale = restaurant.defaultLocale as string;
  const [locale, setLocale] = useState(defaultLocale);
  // La pestaña va en la URL (`?tab=content`): se conserva al recargar y se puede enlazar.
  const requestedTab = useSearchParams().get('tab');
  const tabFromUrl = (value: string | null): TabId => TAB_ALIAS[value ?? ''] ?? TABS.find(t => t.id === value)?.id ?? 'overview';
  const [tab, setTabState] = useState<TabId>(tabFromUrl(requestedTab));
  // Un enlace a otro apartado de esta misma página (los avisos de «Pendiente») solo cambia la dirección.
  useEffect(() => { setTabState(tabFromUrl(requestedTab)); }, [requestedTab]);
  const setTab = (id: TabId) => {
    setTabState(id);
    window.scrollTo({ top: 0 });
    const url = new URL(window.location.href);
    if (id === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  };
  // El foco en el primer error lo pone `onInvalid`: el campo puede estar en otra pestaña.
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(restaurant), shouldFocusError: false });
  const { handleSubmit, reset, setFocus, control, formState: { errors, isDirty, isSubmitted } } = form;
  const { data: user } = useSession();
  const [editingLanguages, setEditingLanguages] = useState(false);

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

  // Los bloques destacados solo tienen sentido con varios espacios; si ya hay, se enseñan para poder editarlos.
  const showHomeBlocks = spaces.length > 1 || restaurant.homeBlocks.length > 0;
  const tabs = TABS.filter(t => t.id !== 'home' || showHomeBlocks).map(t => ({
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

  const isAdmin = user?.role === 'admin';
  const sideLink =
    'flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-[14px] font-semibold text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]';

  return (
    <FormProvider {...form}>
      <form onSubmit={onSave} noValidate className={isDirty ? 'pb-24' : undefined}>
        {/* Menú de apartados | apartado abierto | publicación. En pantallas estrechas, uno debajo de otro. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[212px_minmax(0,1fr)] xl:grid-cols-[212px_minmax(0,1fr)_300px]">
          <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <TabList idPrefix={TABS_ID} label="Apartados de la ficha" tabs={tabs} value={tab} onChange={id => setTab(id as TabId)} groups={TAB_GROUPS} />
            <nav aria-label="Más de este restaurante" className="mt-5 hidden border-t border-[color:var(--color-border)] pt-4 lg:block">
              <p aria-hidden className="m-0 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">Carta, fotos y legal</p>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                <li><Link href={`/dishes?r=${restaurant.slug}`} className={sideLink}>Carta<ChevronRight aria-hidden className="h-4 w-4" /></Link></li>
                <li><Link href={`/media?r=${restaurant.slug}`} className={sideLink}>Imágenes<ChevronRight aria-hidden className="h-4 w-4" /></Link></li>
                <li><Link href={`/restaurants/${restaurant.slug}/legal`} className={sideLink}>Páginas legales<ChevronRight aria-hidden className="h-4 w-4" /></Link></li>
              </ul>
            </nav>
          </div>

          <div className="min-w-0">
            <TabPanel idPrefix={TABS_ID} id="overview" active={tab === 'overview'}>
              <OverviewPanel restaurant={restaurant} localeNames={localeNames} onGo={setTab} />
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="spaces" active={tab === 'spaces'}>
              <SpacesSection restaurant={restaurant} spaces={spaces} />
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="data" active={tab === 'data'}><DataTab show="data" mediaScope={tabProps.mediaScope} isAdmin={isAdmin} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="brand" active={tab === 'brand'}><DataTab show="brand" mediaScope={tabProps.mediaScope} isAdmin={isAdmin} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="languages" active={tab === 'languages'}>
              <Section title="Idiomas de la web" description="Los idiomas en los que se puede leer la web. El principal es el que se enseña primero a quien entra.">
                <LangList restaurant={restaurant} />
                <div className="mt-5">
                  {/* Cambiar los idiomas recarga el formulario: con cambios sin guardar se perderían. */}
                  <Button disabled={isDirty} aria-describedby={isDirty ? 'idiomas-aviso' : undefined} onClick={() => setEditingLanguages(true)}>Cambiar idiomas</Button>
                  {isDirty && <p id="idiomas-aviso" className="m-0 mt-2 text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">Guarda o descarta antes los cambios de la ficha.</p>}
                </div>
              </Section>
            </TabPanel>
            {(['about', 'groups', 'faq', 'home'] as const).map(id => (
              <TabPanel key={id} idPrefix={TABS_ID} id={id} active={tab === id}>
                {(id !== 'home' || showHomeBlocks) && <ContentTab show={id} {...tabProps} />}
              </TabPanel>
            ))}
            <TabPanel idPrefix={TABS_ID} id="texts" active={tab === 'texts'}><TextsTab {...tabProps} /></TabPanel>
            <TabPanel idPrefix={TABS_ID} id="search" active={tab === 'search'}><SearchTab {...tabProps} isAdmin={isAdmin} /></TabPanel>

            {/* En móvil el menú lateral no cabe: los enlaces van al final. */}
            <nav aria-label="Carta, fotos y páginas legales" className="mt-6 lg:hidden">
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                <li><LinkButton href={`/dishes?r=${restaurant.slug}`}>Carta</LinkButton></li>
                <li><LinkButton href={`/media?r=${restaurant.slug}`}>Imágenes</LinkButton></li>
                <li><LinkButton href={`/restaurants/${restaurant.slug}/legal`}>Páginas legales</LinkButton></li>
              </ul>
            </nav>
          </div>

          <aside aria-label="Publicación y estado de la web" className="flex flex-col gap-5 self-start lg:col-start-2 xl:sticky xl:top-20 xl:col-start-3">
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
          </aside>
        </div>

        <SaveBar dirty={isDirty} saving={patch.isPending} errorCount={isSubmitted ? countErrors(errors) : 0} onDiscard={() => reset()} />
      </form>
      {editingLanguages && <LanguagesDialog restaurant={restaurant} isAdmin={isAdmin} onClose={() => setEditingLanguages(false)} />}
    </FormProvider>
  );
}
