import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import type { RebuildHookCaller } from '../../domain/services/rebuildHookCaller.js';
import type {
  PublishState,
  Address,
  Contact,
  Socials,
  Seo,
  RestaurantSnapshot
} from '../../domain/models/restaurant.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';

export interface PatchRestaurantInput {
  name?: string;
  domain?: string;
  logoInitial?: string;
  coverGradient?: string;
  state?: PublishState;
  acceptsBookings?: boolean;
  showSocials?: boolean;
  timezone?: string;
  rebuildHookUrl?: string | null;
  address?: Address;
  contact?: Contact;
  socials?: Socials;
  seo?: Seo;
  defaultLocaleCode?: string;
  activeLocaleCodes?: string[];
}

export class PatchRestaurantUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly languages: LanguageRepository,
    private readonly rebuildHook: RebuildHookCaller
  ) {}

  async execute(slug: string, input: PatchRestaurantInput, actorId: string): Promise<{ id: string }> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);

    const wasPublished = r.state === 'published';
    const willBePublished = input.state === 'published';

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.domain !== undefined) patch.domain = input.domain;
    if (input.logoInitial !== undefined) patch.logoInitial = input.logoInitial;
    if (input.coverGradient !== undefined) patch.coverGradient = input.coverGradient;
    if (input.acceptsBookings !== undefined) patch.acceptsBookings = input.acceptsBookings;
    if (input.showSocials !== undefined) patch.showSocials = input.showSocials;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.rebuildHookUrl !== undefined) patch.rebuildHookUrl = input.rebuildHookUrl;
    if (input.address !== undefined) patch.address = input.address;
    if (input.contact !== undefined) patch.contact = input.contact;
    if (input.socials !== undefined) patch.socials = input.socials;
    if (input.seo !== undefined) patch.seo = input.seo;
    if (input.state !== undefined) patch.state = input.state;
    if (input.defaultLocaleCode !== undefined) patch.defaultLocaleCode = input.defaultLocaleCode;

    await this.restaurants.update(r.id, patch, actorId);

    // Snapshot al publicar: combina los campos actuales con los del body —
    // es lo que `discardChanges` restaurará si el editor se arrepiente.
    if (willBePublished) {
      const snapshot: RestaurantSnapshot = {
        name: input.name ?? r.name,
        domain: input.domain ?? r.domain,
        logoInitial: input.logoInitial ?? r.logoInitial,
        coverGradient: input.coverGradient ?? r.coverGradient,
        timezone: input.timezone ?? r.timezone,
        address: input.address ?? r.address,
        contact: input.contact ?? r.contact,
        socials: input.socials ?? r.socials,
        seo: input.seo ?? r.seo,
        acceptsBookings: input.acceptsBookings ?? r.acceptsBookings,
        showSocials: input.showSocials ?? r.showSocials
      };
      await this.restaurants.saveSnapshot(r.id, snapshot, new Date());
    }

    if (input.activeLocaleCodes) {
      const activeIds = await this.languages.resolveCodes(input.activeLocaleCodes);
      await this.restaurants.replaceLocales(r.id, activeIds);
    }

    // Rebuild cuando: pasó a published ahora, o ya estaba published y se
    // editó algún campo (los providers de deploy deduplican rebuilds).
    const shouldRebuild = (willBePublished && !wasPublished) || (wasPublished && input.state === undefined);
    if (shouldRebuild && r.rebuildHookUrl) {
      void this.rebuildHook.call(r.rebuildHookUrl, { restaurantSlug: r.slug });
    }

    return { id: r.id };
  }
}
