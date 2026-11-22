'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { I18nField } from '@/components/editor/I18nField';
import { ItemList } from '@/components/editor/ItemList';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { FormImageField } from '@/components/media/FormImageField';
import { ImageListField } from '@/components/media/ImageListField';
import { Section } from '@/components/shared/Section';
import { Field } from '@/components/ui/Field';
import { Select, TextInput } from '@/components/ui/inputs';
import { newItemId } from '@/lib/forms/rules';
import { ABOUT, FAQ, FEATURE_ICONS, GROUPS, HOME_BLOCKS, type FormValues } from './model';
import type { TabProps } from './types';

const SUBHEADING = 'm-0 mb-1 text-[14px] font-bold text-[color:var(--color-ink)]';
const SUBTEXT = 'm-0 mb-3.5 text-[13px] leading-[1.5] text-[color:var(--color-muted)]';

/** `show`: qué apartado pinta. Cada uno va en su panel, con su selector de idioma. */
export function ContentTab({ show, i18n, mediaScope, localeTabs, pendingIn }: TabProps & { show: 'about' | 'groups' | 'faq' | 'home' }) {
  const { register, control, setValue, formState: { errors } } = useFormContext<FormValues>();
  const aboutImages = useWatch({ control, name: 'about.imageAssetIds' });
  const emptyI18n = () => Object.fromEntries(i18n.locales.map(code => [code, '']));

  return (
    <div>
      {localeTabs}

      <div className="flex flex-col gap-6">
        {show === 'about' && (
        <Section title={ABOUT} description="La historia del restaurante, con sus fotos." badge={<TranslationBadge count={pendingIn(ABOUT)} />}>
          <div className="flex flex-col gap-5">
            <I18nField reference="side" name="about.eyebrow" label="Antetítulo" hint="Una o dos palabras encima del título." {...i18n} />
            <I18nField reference="side" name="about.title" label="Título" {...i18n} />
            <I18nField reference="side" name="about.body" label="Texto" multiline rows={8} hint="Deja una línea en blanco para separar párrafos." {...i18n} />
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
        <Section title={GROUPS} description="Lo que ofreces a grupos, celebraciones y empresas." badge={<TranslationBadge count={pendingIn(GROUPS)} />}>
          <div className="flex flex-col gap-5">
            <I18nField reference="side" name="groups.eyebrow" label="Antetítulo" hint="Una o dos palabras encima del título." {...i18n} />
            <I18nField reference="side" name="groups.title" label="Título" {...i18n} />
            <I18nField reference="side" name="groups.cta" label="Texto del botón" hint="Por ejemplo, «Pedir presupuesto»." {...i18n} />
            <FormImageField name="groups.imageAssetId" label="Foto" scope={mediaScope} purpose="dish" />

            <div>
              <h3 className={SUBHEADING}>Ventajas con icono</h3>
              <p className={SUBTEXT}>Cada una con un icono, un título corto y una frase.</p>
              <ItemList
                name="groups.features"
                itemLabel={i => `Ventaja ${i + 1}`}
                addLabel="Añadir ventaja"
                emptyText="Aún no hay ninguna ventaja."
                max={12}
                newItem={() => ({ id: newItemId(), icon: 'users', label: emptyI18n(), text: emptyI18n() })}
                focusField={i => `groups.features.${i}.icon`}
              >
                {i => (
                  <div className="flex flex-col gap-5">
                    <Field id={`groups-features-${i}-icon`} label="Icono">
                      {fieldControl => (
                        <Select {...fieldControl} className="md:max-w-[320px]" {...register(`groups.features.${i}.icon`)}>
                          {FEATURE_ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                        </Select>
                      )}
                    </Field>
                    <I18nField reference="side" name={`groups.features.${i}.label`} label="Título" hint="Dos o tres palabras, por ejemplo «Hasta 40 personas»." {...i18n} />
                    <I18nField reference="side" name={`groups.features.${i}.text`} label="Texto" multiline rows={2} {...i18n} />
                  </div>
                )}
              </ItemList>
            </div>

            <div>
              <h3 className={SUBHEADING}>Puntos destacados</h3>
              <p className={SUBTEXT}>Una lista sencilla de frases cortas.</p>
              <ItemList
                name="groups.highlights"
                itemLabel={i => `Punto destacado ${i + 1}`}
                addLabel="Añadir punto"
                emptyText="Aún no hay ningún punto destacado."
                max={12}
                newItem={() => ({ id: newItemId(), text: emptyI18n() })}
                focusField={i => `groups.highlights.${i}.text.${i18n.activeLocale}`}
              >
                {i => <I18nField reference="side" name={`groups.highlights.${i}.text`} label="Texto" {...i18n} />}
              </ItemList>
            </div>
          </div>
        </Section>
        )}

        {show === 'faq' && (
        <Section title={FAQ} description="Las dudas habituales de tus clientes. También ayudan a aparecer en Google." badge={<TranslationBadge count={pendingIn(FAQ)} />}>
          <div className="flex flex-col gap-5">
            <I18nField reference="side" name="faq.eyebrow" label="Antetítulo" hint="Por ejemplo, «Preguntas frecuentes»." {...i18n} />
            <I18nField reference="side" name="faq.title" label="Título" {...i18n} />
            <I18nField reference="side" name="faq.titleAccent" label="Parte destacada del título" hint="Las palabras del final del título que se resaltan. Puede quedar vacío." {...i18n} />
            <div>
              <h3 className={SUBHEADING}>Preguntas</h3>
              <ItemList
                name="faq.items"
                itemLabel={i => `Pregunta ${i + 1}`}
                addLabel="Añadir pregunta"
                emptyText="Aún no hay ninguna pregunta."
                max={40}
                newItem={() => ({ id: newItemId(), question: emptyI18n(), answer: emptyI18n() })}
                focusField={i => `faq.items.${i}.question.${i18n.activeLocale}`}
              >
                {i => (
                  <div className="flex flex-col gap-5">
                    <I18nField reference="side" name={`faq.items.${i}.question`} label="Pregunta" {...i18n} />
                    <I18nField reference="side" name={`faq.items.${i}.answer`} label="Respuesta" multiline rows={3} {...i18n} />
                  </div>
                )}
              </ItemList>
            </div>
          </div>
        </Section>
        )}

        {show === 'home' && (
          <Section title={HOME_BLOCKS} description="Las tarjetas de la portada que llevan a cada espacio o a una sección." badge={<TranslationBadge count={pendingIn(HOME_BLOCKS)} />}>
            <ItemList
              name="homeBlocks"
              itemLabel={i => `Bloque ${i + 1}`}
              addLabel="Añadir bloque"
              emptyText="Aún no hay ningún bloque."
              max={12}
              newItem={() => ({ id: newItemId(), title: emptyI18n(), text: emptyI18n(), imageAssetId: '', ctaText: emptyI18n(), ctaHref: '' })}
              focusField={i => `homeBlocks.${i}.title.${i18n.activeLocale}`}
            >
              {i => (
                <div className="flex flex-col gap-5">
                  <I18nField reference="side" name={`homeBlocks.${i}.title`} label="Título" {...i18n} />
                  <I18nField reference="side" name={`homeBlocks.${i}.text`} label="Texto" multiline rows={2} hint="Una o dos frases." {...i18n} />
                  <FormImageField name={`homeBlocks.${i}.imageAssetId`} label="Foto" scope={mediaScope} purpose="dish" />
                  <I18nField reference="side" name={`homeBlocks.${i}.ctaText`} label="Texto del botón" hint="Si lo dejas vacío, la tarjeta no lleva botón." {...i18n} />
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
