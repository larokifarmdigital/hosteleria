import {
  type RestaurantRepository,
  type PatchRestaurantUseCase,
  RestaurantNotFoundError,
  restaurantTranslatableTexts
} from '@/core/restaurants';
import { type SpaceRepository, type PatchSpaceUseCase, spaceTranslatableTexts } from '@/core/spaces';
import { i18nMissingLocales, TranslationsIncompleteError, type I18nValue } from '@/core/shared';

export interface PublishSiteResult {
  /** `true` si la ficha tenía algo que publicar y se publicó. */
  restaurant: boolean;
  spaces: { id: string; name: string }[];
  /** Textos que se han publicado sin traducir del todo: en esos idiomas sale el idioma principal. */
  untranslated: string[];
}

/**
 * Publica de una vez todo lo que el restaurante tiene sin publicar: la ficha y
 * cada espacio con cambios. El editor no tiene que saber qué vive dónde.
 *
 * Traducciones: la primera vez la web tiene que salir completa en todos sus idiomas,
 * y se comprueba todo antes de publicar nada. Después, lo que falte traducir no frena
 * un cambio de precio o de horario: se publica y se devuelve la lista para avisar
 * (las webs enseñan el idioma principal donde falta). Los espacios van antes que la
 * ficha: si la ficha nunca se publicó, la web no enseña nada hasta el final.
 */
export class PublishSiteUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly patchRestaurant: Pick<PatchRestaurantUseCase, 'execute'>,
    private readonly patchSpace: Pick<PatchSpaceUseCase, 'execute'>
  ) {}

  async execute(slug: string, actorId: string): Promise<PublishSiteResult> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);

    const restaurantPending = r.state !== 'published' || !r.publishedSnapshot;
    const spaces = (await this.spaces.listByRestaurantId(r.id))
      .filter(s => s.state !== 'published' || !s.publishedSnapshot);

    const missing = [
      ...(restaurantPending ? incomplete(restaurantTranslatableTexts(r), r.activeLocaleCodes) : []),
      ...spaces.flatMap(s => incomplete(spaceTranslatableTexts(s), r.activeLocaleCodes).map(label => `${s.name} · ${label}`))
    ];
    const firstTime = !r.publishedSnapshot;
    if (missing.length > 0 && firstTime) throw new TranslationsIncompleteError(missing);
    const opts = { allowIncompleteTranslations: !firstTime };

    for (const s of spaces) await this.patchSpace.execute(r.id, s.id, { state: 'published' }, actorId, opts);
    if (restaurantPending) await this.patchRestaurant.execute(slug, { state: 'published' }, actorId, opts);

    return { restaurant: restaurantPending, spaces: spaces.map(s => ({ id: s.id, name: s.name })), untranslated: missing };
  }
}

function incomplete(texts: Record<string, I18nValue | null | undefined>, locales: string[]): string[] {
  return Object.entries(texts).filter(([, value]) => i18nMissingLocales(value, locales).length > 0).map(([label]) => label);
}
