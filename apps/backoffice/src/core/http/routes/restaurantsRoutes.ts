import { HTTPException } from 'hono/http-exception';
import { Hono } from 'hono';
import { validate } from '../validate';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireRestaurant } from '../middleware/authMiddleware';
import { requestSiteRebuild } from '../middleware/rebuildSite';
import { cacheHeaders } from '../middleware/cache';
import { restaurantToDto } from '../dto/restaurantDto';
import {
  RestaurantNotFoundError,
  restaurantMediaUses,
  GROUP_FEATURE_ICONS,
  PAYMENT_METHODS,
  EXTRA_SERVICES,
  UI_TEXT_KEYS,
  type RestaurantContent,
  type PatchRestaurantInput
} from '@/core/restaurants';
import { assertMediaInRestaurant } from '../accessControl';
import { addressSchema, i18nSchema, assetIdSchema } from '../schemas';
import type { AppBindings } from '../types';

export function createRestaurantsRoutes() {
  const app = new Hono<AppBindings>();

  app.get('/', requireAuth, cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const user = c.get('user')!;
    const list = await c.get('container').restaurants.list.execute(user);
    return c.json({ restaurants: list.map(r => restaurantToDto(r, user)) });
  });

  app.get('/:slug', requireAuth, requireRestaurant('slug'), cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => {
    const r = await c.get('container').restaurants.get.execute(c.req.param('slug'));
    return c.json({ restaurant: restaurantToDto(r, c.get('user')!) });
  });

  // Lo que le falta al contenido: traducciones, horarios, descripciones de fotos y publicación.
  app.get('/:slug/pending', requireAuth, requireRestaurant('slug'), async (c) => {
    const tasks = await c.get('container').restaurants.pendingTasks.execute(c.req.param('slug'));
    return c.json({ tasks });
  });

  // ¿Enseña la web lo último publicado?
  app.get('/:slug/site-status', requireAuth, requireRestaurant('slug'), async (c) => {
    return c.json({ site: await c.get('container').public.siteStatus.execute(c.req.param('slug')) });
  });

  // Pide regenerar la web a mano, por si un build falló o se quedó a medias.
  app.post('/:slug/rebuild', requireAuth, requireRestaurant('slug'), async (c) => {
    const slug = c.req.param('slug');
    await requestSiteRebuild(c, { restaurantSlug: slug });
    return c.json({ site: await c.get('container').public.siteStatus.execute(slug) });
  });

  app.post('/', requireAdmin, validate('json', createSchema), async (c) => {
    const r = await c.get('container').restaurants.create.execute(c.req.valid('json'));
    return c.json({ restaurant: restaurantToDto(r, c.get('user')!) }, 201);
  });

  app.patch('/:slug', requireAuth, requireRestaurant('slug'), validate('json', patchSchema), async (c) => {
    const user = c.get('user')!;
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    // El hook es una URL a la que el api llama por su cuenta: solo la fija un administrador.
    if (body.rebuildHookUrl !== undefined && user.role !== 'admin') throw new HTTPException(403, { message: 'ADMIN_REQUIRED' });
    const current = await c.get('container').restaurants.get.execute(slug);
    // De la dirección dependen la URL canónica de la web y a dónde llama el api al comprobarla.
    // El formulario la reenvía sin cambios en cada guardado: solo se rechaza si cambia.
    if (body.domain !== undefined && body.domain !== current.domain && user.role !== 'admin') {
      throw new HTTPException(403, { message: 'ADMIN_REQUIRED' });
    }
    if (body.state === 'published') c.set('rebuild', { restaurantSlug: slug });
    const mediaIds = [...new Set(restaurantMediaUses(body as Partial<RestaurantContent>).map(u => u.assetId))];
    for (const id of mediaIds) await assertMediaInRestaurant(c, id, current.id);
    await c.get('container').restaurants.patch.execute(slug, body as PatchRestaurantInput, user.id);
    const r = await c.get('container').restaurants.get.execute(slug);
    return c.json({ restaurant: restaurantToDto(r, user) });
  });

  app.post('/:slug/discard', requireAuth, requireRestaurant('slug'), async (c) => {
    const user = c.get('user')!;
    const slug = c.req.param('slug');
    await c.get('container').restaurants.discard.execute(slug, user.id);
    const r = await c.get('container').restaurants.get.execute(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    return c.json({ restaurant: restaurantToDto(r, user) });
  });

  app.delete('/:slug', requireAdmin, async (c) => {
    await c.get('container').restaurants.delete.execute(c.req.param('slug'));
    return c.json({ ok: true });
  });

  return app;
}

const contactSchema = z.object({
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  web: z.string().url().optional().or(z.literal(''))
}).partial();

const socialsSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal(''))
}).partial();

const createSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'slug: minúsculas, dígitos y guiones'),
  name: z.string().min(1).max(120),
  domain: z.string().min(1).max(255),
  logoInitial: z.string().max(3).default(''),
  defaultLocaleCode: z.string().min(2).max(5),
  activeLocaleCodes: z.array(z.string().min(2).max(5)).min(1)
});

/** Identificador de un elemento de lista; lo pone el cliente para poder reordenar. */
const itemIdSchema = z.string().min(1).max(40);

function uiTextGroupSchema<G extends keyof typeof UI_TEXT_KEYS>(group: G) {
  const shape = Object.fromEntries(UI_TEXT_KEYS[group].map(key => [key, i18nSchema.optional()]));
  return z.object(shape).strict();
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z.string().min(1).max(255).optional(),
  logoInitial: z.string().max(3).optional(),
  coverGradient: z.string().optional(),
  state: z.enum(['published', 'draft', 'warnings', 'new']).optional(),
  acceptsBookings: z.boolean().optional(),
  showSocials: z.boolean().optional(),
  address: addressSchema.optional(),
  contact: contactSchema.optional(),
  socials: socialsSchema.optional(),
  defaultLocaleCode: z.string().min(2).max(5).optional(),
  activeLocaleCodes: z.array(z.string().min(2).max(5)).min(1).optional(),
  timezone: z.string().min(1).max(64).optional(),
  rebuildHookUrl: z.string().url().nullable().optional(),
  seo: z.object({
    title: i18nSchema.optional(),
    description: i18nSchema.optional(),
    imageAssetId: assetIdSchema.optional()
  }).optional(),
  foundedYear: z.number().int().min(1500).max(2100).nullable().optional(),
  branding: z.object({
    logoAssetId: assetIdSchema.optional(),
    faviconAssetId: assetIdSchema.optional(),
    appIconAssetId: assetIdSchema.optional()
  }).optional(),
  homeBlocks: z.array(z.object({
    id: itemIdSchema,
    title: i18nSchema.optional(),
    text: i18nSchema.optional(),
    imageAssetId: assetIdSchema.optional(),
    ctaText: i18nSchema.optional(),
    ctaHref: z.string().max(500).optional()
  })).max(12).optional(),
  about: z.object({
    eyebrow: i18nSchema.optional(),
    title: i18nSchema.optional(),
    body: i18nSchema.optional(),
    imageAssetIds: z.array(assetIdSchema).max(12).optional()
  }).optional(),
  groups: z.object({
    eyebrow: i18nSchema.optional(),
    title: i18nSchema.optional(),
    cta: i18nSchema.optional(),
    imageAssetId: assetIdSchema.optional(),
    highlights: z.array(z.object({ id: itemIdSchema, text: i18nSchema.optional() })).max(12).optional(),
    features: z.array(z.object({
      id: itemIdSchema,
      icon: z.enum(GROUP_FEATURE_ICONS),
      label: i18nSchema.optional(),
      text: i18nSchema.optional()
    })).max(12).optional()
  }).optional(),
  mapUrl: z.string().max(2000).nullable().optional(),
  showReviews: z.boolean().optional(),
  uiTexts: z.object({
    nav: uiTextGroupSchema('nav').optional(),
    sections: uiTextGroupSchema('sections').optional(),
    form: uiTextGroupSchema('form').optional(),
    footer: uiTextGroupSchema('footer').optional()
  }).optional(),
  faq: z.object({
    eyebrow: i18nSchema.optional(),
    title: i18nSchema.optional(),
    titleAccent: i18nSchema.optional(),
    items: z.array(z.object({
      id: itemIdSchema,
      question: i18nSchema.optional(),
      answer: i18nSchema.optional()
    })).max(40).optional()
  }).optional(),
  aiSummary: i18nSchema.optional(),
  analyticsToken: z.string().max(200).nullable().optional(),
  business: z.object({
    averagePrice: z.number().min(0).max(10000).optional(),
    paymentMethods: z.array(z.enum(PAYMENT_METHODS)).optional(),
    extraServices: z.array(z.enum(EXTRA_SERVICES)).optional()
  }).optional()
}).partial();
