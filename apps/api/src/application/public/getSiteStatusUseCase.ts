import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { SiteProbe } from '../../domain/services/siteProbe.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';
import { resolveSiteState, siteUrlOf, siteVersion, type SiteStatus } from '../../domain/models/siteStatus.js';
import type { GetPublishedSiteUseCase } from './getPublishedSiteUseCase.js';

/** ¿Enseña la web lo último publicado? Compara lo publicado con lo que la landing dice haber construido. */
export class GetSiteStatusUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly publishedSite: GetPublishedSiteUseCase,
    private readonly probe: SiteProbe
  ) {}

  async execute(slug: string): Promise<SiteStatus> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);

    const siteUrl = siteUrlOf(r.domain);
    const base = {
      siteUrl,
      builtAt: null,
      lastRebuildAt: r.lastRebuildAt?.toISOString() ?? null,
      lastRebuildOk: r.lastRebuildOk,
      canRebuild: !!r.rebuildHookUrl && !!r.publishedSnapshot
    };
    if (!r.publishedSnapshot) return { ...base, state: 'unpublished' };
    if (!siteUrl) return { ...base, state: 'unknown' };

    const [site, build] = await Promise.all([this.publishedSite.execute(slug), this.probe.read(siteUrl)]);
    return {
      ...base,
      builtAt: build?.builtAt ?? null,
      state: resolveSiteState({
        currentVersion: siteVersion(site), build, lastRebuildAt: r.lastRebuildAt, lastRebuildOk: r.lastRebuildOk, now: new Date()
      })
    };
  }
}
