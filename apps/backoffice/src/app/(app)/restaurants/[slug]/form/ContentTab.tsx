'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { I18nField } from '@/components/editor/I18nField';
import { ItemList } from '@/components/editor/ItemList';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { FormImageField } from '@/components/media/FormImageField';
import { ImageListField } from '@/components/media/ImageListField';
import { Fold, Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/inputs';
import { newItemId } from '@/lib/forms/rules';
import { ABOUT, FAQ, FEATURE_ICONS, GROUPS, HOME_BLOCKS, type FormValues } from './model';
import type { TabProps } from './types';

type I18n = Record<string, string> | undefined;
/** Texto de un campo traducible en el idioma principal o, si falta, en el primero que lo tenga. */
const textOf = (value: unknown, locale: string) => { const v = value as I18n; return v?.[locale]?.trim() || Object.values(v ?? {}).find(t => t?.trim()) || ''; };

/** `show`: qué apartado pinta. Cada uno va en su panel, con su selector de idioma. */
export function ContentTab({ show, i18n, mediaScope, localeTabs, pendingIn }: TabProps & { show: 'about' | 'groups' | 'faq' | 'home' }) {
  const { register, control, setValue, formState: { errors } } = useFormContext<FormValues>();
  const aboutImages = useWatch({ control, name: 'about.imageAssetIds' });
  const emptyI18n = () => Object.fromEntries(i18n.locales.map(code => [code, '']));

  const sectionTitles = useWatch({ control, name: ['faq.title', 'faq.eyebrow'] });
  const eyebrowLabel = 'Texto pequeño sobre el título';

  return (
    <div>
      {localeTabs}

      <div className="flex flex-col gap-8">
        {show === 'about' && (
          <Section title={ABOUT}>
            <div className="flex flex-col gap-5">
              <I18nField name="about.eyebrow" label={eyebrowLabel} hint="Una o dos palabras, por ejemplo «Nuestra historia»." {...i18n} />
              <I18nField name="about.title" label="Título" {...i18n} />
              <I18nField name="about.body" label="Texto" multiline rows={8} hint="Deja una línea en blanco para separar párrafos." {...i18n} />
              <ImageListField
                label="Fotos"
                hint="Hasta 3 fotos. La primera es la principal."
                scope={mediaScope}
                purpose="dish"
                max={3}
                assetIds={aboutImages ?? []}
                onChange={ids => setValue('about.imageAssetIds', ids, { shouldDirty: true })}
              />
            </div>
          </Section>
        )}

        {show === 'groups' && (
          <>
            <Section title={GROUPS}>
              <div className="flex flex-col gap-5">
                <I18nField name="groups.eyebrow" label={eyebrowLabel} hint="Una o dos palabras encima del título." {...i18n} />
                <I18nField name="groups.title" label="Título" {...i18n} />
                <I18nField name="groups.cta" label="Texto del botón" hint="Por ejemplo, «Pedir presupuesto»." {...i18n} />
                <FormImageField name="groups.imageAssetId" label="Foto" scope={mediaScope} purpose="dish" />
              </div>
            </Section>

            <Section title="Ventajas con icono" description="Cada una con un icono, un título corto y una frase.">
              <ItemList
                name="groups.features"
                itemLabel={i => `Ventaja ${i + 1}`}
                noun={{ singular: 'ventaja', feminine: true }}
                summary={(item, locale) => ({ title: textOf(item.label, locale), detail: textOf(item.text, locale) })}
                addLabel="Añadir ventaja"
                emptyText="Por ejemplo, «Hasta 40 personas» o «Menú cerrado»."
                max={12}
                newItem={() => ({ id: newItemId(), icon: 'users', label: emptyI18n(), text: emptyI18n() })}
                focusField={i => `groups.features.${i}.label.${i18n.activeLocale}`}
              >
                {i => (
                  <div className="flex flex-col gap-5">
                    <I18nField name={`groups.features.${i}.label`} label="Título" hint="Dos o tres palabras, por ejemplo «Hasta 40 personas»." {...i18n} />
                    <I18nField name={`groups.features.${i}.text`} label="Texto" multiline rows={2} {...i18n} />
                    <Field id={`groups-features-${i}-icon`} label="Icono">
                      {fieldControl => (
                        <Select {...fieldControl} {...register(`groups.features.${i}.icon`)}>
                          {FEATURE_ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                        </Select>
                      )}
                    </Field>
                  </div>
                )}
              </ItemList>
            </Section>

            <Section title="Puntos destacados" description="Una lista sencilla de frases cortas.">
              <ItemList
                name="groups.highlights"
                itemLabel={i => `Punto destacado ${i + 1}`}
                noun={{ singular: 'punto destacado' }}
                summary={(item, locale) => ({ title: textOf(item.text, locale) })}
                addLabel="Añadir punto"
                emptyText="Por ejemplo, «Sala privada» o «Proyector y pantalla»."
                max={12}
                newItem={() => ({ id: newItemId(), text: emptyI18n() })}
                focusField={i => `groups.highlights.${i}.text.${i18n.activeLocale}`}
              >
                {i => <I18nField name={`groups.highlights.${i}.text`} label="Texto" {...i18n} />}
              </ItemList>
            </Section>
          </>
        )}

        {show === 'faq' && (
          <>
            <Section title="Preguntas" description="Salen en tu web en este orden.">
              <ItemList
                name="faq.items"
                itemLabel={i => `Pregunta ${i + 1}`}
                noun={{ singular: 'pregunta', feminine: true }}
                summary={(item, locale) => ({ title: textOf(item.question, locale), detail: textOf(item.answer, locale) })}
                addLabel="Añadir pregunta"
                emptyText="Por ejemplo, «¿Tenéis opciones sin gluten?»."
                max={40}
                newItem={() => ({ id: newItemId(), question: emptyI18n(), answer: emptyI18n() })}
                focusField={i => `faq.items.${i}.question.${i18n.activeLocale}`}
              >
                {i => (
                  <div className="flex flex-col gap-5">
                    <I18nField name={`faq.items.${i}.question`} label="Pregunta" {...i18n} />
                    <I18nField name={`faq.items.${i}.answer`} label="Respuesta" multiline rows={4} {...i18n} />
                  </div>
                )}
              </ItemList>
            </Section>
            <Fold
              title="Título de la sección"
              summary={[textOf(sectionTitles[1], i18n.defaultLocale ?? i18n.activeLocale), textOf(sectionTitles[0], i18n.defaultLocale ?? i18n.activeLocale)].filter(Boolean).join(' · ') || 'Sin título: la web usa el suyo.'}
              badge={<TranslationBadge count={pendingIn(FAQ)} />}
            >
              <div className="flex flex-col gap-5">
                <I18nField name="faq.eyebrow" label={eyebrowLabel} hint="Por ejemplo, «Preguntas frecuentes»." {...i18n} />
                <I18nField name="faq.title" label="Título" {...i18n} />
                <I18nField name="faq.titleAccent" label="Parte destacada del título" hint="Las palabras del final del título que se resaltan. Puede quedar vacío." {...i18n} />
              </div>
            </Fold>
          </>
        )}

        {show === 'home' && (
          <Section title={HOME_BLOCKS}>
            <ItemList
              name="homeBlocks"
              itemLabel={i => `Bloque ${i + 1}`}
              noun={{ singular: 'bloque' }}
              summary={(item, locale) => ({ title: textOf(item.title, locale), detail: textOf(item.text, locale) })}
              addLabel="Añadir bloque"
              emptyText="Las tarjetas de la portada que llevan a cada espacio o a una sección."
              max={12}
              newItem={() => ({ id: newItemId(), title: emptyI18n(), text: emptyI18n(), imageAssetId: '', ctaText: emptyI18n(), ctaHref: '' })}
              focusField={i => `homeBlocks.${i}.title.${i18n.activeLocale}`}
            >
              {i => (
                <div className="flex flex-col gap-5">
                  <I18nField name={`homeBlocks.${i}.title`} label="Título" {...i18n} />
                  <I18nField name={`homeBlocks.${i}.text`} label="Texto" multiline rows={2} hint="Una o dos frases." {...i18n} />
                  <FormImageField name={`homeBlocks.${i}.imageAssetId`} label="Foto" scope={mediaScope} purpose="dish" />
                  <I18nField name={`homeBlocks.${i}.ctaText`} label="Texto del botón" hint="Si lo dejas vacío, la tarjeta no lleva botón." {...i18n} />
                  <Field id={`homeBlocks-${i}-ctaHref`} label="Enlace del botón" error={errors.homeBlocks?.[i]?.ctaHref?.message} hint="Una dirección completa (https://…) o una sección de la web, como /terraza o #reservar.">
                    {fieldControl => <TextInput {...fieldControl} autoComplete="off" {...register(`homeBlocks.${i}.ctaHref`)} />}
                  </Field>
                </div>
              )}
            </ItemList>
          </Section>
        )}
      </div>
    </div>
  );
}
