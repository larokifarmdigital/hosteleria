'use client';

import { I18nField } from '@/components/editor/I18nField';
import { TranslationBadge } from '@/components/editor/TranslationBadge';
import { Callout } from '@/components/shared/Callout';
import { Section } from '@/components/shared/Section';
import { UI_TEXT_GROUPS, visibleUiTextFields } from './model';
import type { TabProps } from './types';

export function TextsTab({ restaurant, i18n, localeTabs, pendingIn }: TabProps) {
  return (
    <div>
      <Callout className="mb-6" title="Son los textos fijos de la web">
        No hace falta rellenarlos todos: donde dejes uno vacío, la web usa su texto de siempre o no muestra nada.
      </Callout>

      {localeTabs}

      <div className="flex flex-col gap-6">
        {UI_TEXT_GROUPS.map(({ group, title, description, fields }) => (
          <Section key={group} title={title} description={description} badge={<TranslationBadge count={pendingIn(title)} />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {visibleUiTextFields(group, fields, restaurant).map(field => (
                <I18nField
                  key={field.key}
                  className={field.multiline ? 'md:col-span-2' : undefined}
                  name={`uiTexts.${group}.${field.key}`}
                  label={field.label}
                  hint={field.hint}
                  multiline={field.multiline}
                  rows={2}
                  {...i18n}
                />
              ))}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
