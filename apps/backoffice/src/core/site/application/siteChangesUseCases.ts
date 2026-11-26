import { type RestaurantRepository, RestaurantNotFoundError, type DiscardChangesUseCase } from '@/core/restaurants';
import type { SpaceRepository, DiscardSpaceChangesUseCase } from '@/core/spaces';
import type { DishRepository, WineRepository } from '@/core/menu';
import type { LegalPageRepository } from '@/core/legal';
import { DomainError } from '@/core/shared';
import { computeSiteChanges, type SiteChanges } from '../domain/models/siteChanges';
import type { PublishedSiteRepository } from '../domain/repositories/publishedSiteRepository';
import type { SiteSourcesLoader } from './siteSources';

export class NotInPublishedSiteError extends DomainError {
  readonly code = 'NOT_IN_PUBLISHED_SITE';
  readonly status = 404;
  constructor() {
    super('No está en la web publicada: no hay nada que recuperar.');
    this.name = 'NotInPublishedSiteError';
  }
}

/** Qué ha cambiado desde el último «Publicar» en carta, vinos, legales y espacios. */
export class GetSiteChangesUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly copies: PublishedSiteRepository,
    private readonly sources: SiteSourcesLoader
  ) {}

  async execute(slug: string): Promise<SiteChanges> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    const [draft, stored] = await Promise.all([this.sources.load(r), this.copies.find(r.id)]);
    return computeSiteChanges(draft, stored?.copy ?? null);
  }
}

/** «Recuperar»: vuelve a crear un plato, bebida o vino borrado tal como está en la web (con su categoría si hace falta). */
export class RestorePublishedRowUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly copies: PublishedSiteRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository
  ) {}

  async execute(slug: string, kind: 'dish' | 'wine', id: string): Promise<void> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    const copy = (await this.copies.find(r.id))?.copy;
    if (kind === 'wine') {
      const wine = copy?.wines.find(w => w.id === id);
      if (!wine || !(await this.spaces.findById(wine.spaceId))) throw new NotInPublishedSiteError();
      const category = (await this.wines.listCategories(wine.spaceId)).some(c => c.id === wine.categoryId)
        ? [] : copy!.wineCategories.filter(c => c.id === wine.categoryId);
      return this.wines.restore(category, [wine]);
    }
    const dish = copy?.dishes.find(d => d.id === id);
    if (!dish || !(await this.spaces.findById(dish.spaceId))) throw new NotInPublishedSiteError();
    const category = (await this.dishes.listCategories(dish.spaceId)).some(c => c.id === dish.categoryId)
      ? [] : copy!.dishCategories.filter(c => c.id === dish.categoryId);
    return this.dishes.restore(category, [dish]);
  }
}

/**
 * Deja el backoffice como la web publicada: ficha y espacios desde su snapshot, y carta,
 * vinos, legales, orden y principal de los espacios desde la copia. Un espacio nuevo sin
 * publicar se queda; uno borrado no vuelve (se borró con su carta).
 */
export class DiscardSiteChangesUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly copies: PublishedSiteRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository,
    private readonly legalPages: LegalPageRepository,
    private readonly discardRestaurant: Pick<DiscardChangesUseCase, 'execute'>,
    private readonly discardSpace: Pick<DiscardSpaceChangesUseCase, 'execute'>
  ) {}

  async execute(slug: string, actorId: string): Promise<void> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    if (r.publishedSnapshot && r.state !== 'published') await this.discardRestaurant.execute(slug, actorId);
    const spaces = await this.spaces.listByRestaurantId(r.id);
    for (const s of spaces) {
      if (s.publishedSnapshot && s.state !== 'published') await this.discardSpace.execute(r.id, s.id, actorId);
    }

    const copy = (await this.copies.find(r.id))?.copy;
    if (!copy) return;
    const live = new Set(spaces.map(s => s.id));
    for (const space of copy.spaces.filter(s => live.has(s.id))) {
      const inSpace = <T extends { spaceId: string }>(rows: T[]) => rows.filter(row => row.spaceId === space.id);

      const keepDishes = new Set(inSpace(copy.dishes).map(d => d.id));
      const keepDishCategories = new Set(inSpace(copy.dishCategories).map(c => c.id));
      for (const d of await this.dishes.list({ restaurantSlug: slug })) {
        if (d.spaceId === space.id && !keepDishes.has(d.id)) await this.dishes.deleteById(d.id);
      }
      // Primero las categorías y platos publicados (un plato puede volver a una categoría que se borró).
      await this.dishes.restore(inSpace(copy.dishCategories), inSpace(copy.dishes));
      for (const c of await this.dishes.listCategories(space.id)) {
        if (!keepDishCategories.has(c.id)) await this.dishes.deleteCategory(c.id);
      }

      const keepWines = new Set(inSpace(copy.wines).map(w => w.id));
      const keepWineCategories = new Set(inSpace(copy.wineCategories).map(c => c.id));
      for (const w of await this.wines.list({ restaurantSlug: slug })) {
        if (w.spaceId === space.id && !keepWines.has(w.id)) await this.wines.deleteById(w.id);
      }
      await this.wines.restore(inSpace(copy.wineCategories), inSpace(copy.wines));
      for (const c of await this.wines.listCategories(space.id)) {
        if (!keepWineCategories.has(c.id)) await this.wines.deleteCategory(c.id);
      }

      // Orden y principal, como en la web.
      const now = spaces.find(s => s.id === space.id)!;
      if (now.order !== space.order || now.isDefault !== space.isDefault) {
        await this.spaces.update(space.id, { order: space.order, isDefault: space.isDefault }, actorId);
      }
    }

    const published = new Map(copy.legalPages.map(p => [p.type, p]));
    for (const p of await this.legalPages.listByRestaurantId(r.id)) {
      if (!published.has(p.type)) await this.legalPages.delete(r.id, p.type);
    }
    for (const p of copy.legalPages) {
      await this.legalPages.upsert(r.id, p.type, { title: p.title, content: p.content, lastUpdated: p.lastUpdated }, actorId);
    }
  }
}
