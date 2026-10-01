/**
 * OpenAPI 3.1 spec del @hosteleria/api.
 *
 * Se sirve en /openapi.json y se renderiza como UI en /docs (Scalar).
 * Mantener sincronizado a mano cuando cambien las rutas — o migrar a
 * @hono/zod-openapi para generación automática desde los schemas Zod.
 */

const BASE_INFO = {
  title: '@hosteleria/api',
  version: '0.0.1',
  description: 'Backend HTTP del backoffice del grupo hosteleria. Autenticación por cookie de sesión (Lucia). Multi-idioma en jsonb, R2 para media.'
};

const SERVERS = [
  { url: 'http://localhost:8787', description: 'Local dev' },
  { url: 'https://api.hosteleria.cat', description: 'Producción' }
];

// ─── Schemas ───────────────────────────────────────────────────────
const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string', example: 'not_found' } },
    required: ['error']
  },

  I18nString: {
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { es: 'Cocina de mercado', ca: 'Cuina de mercat', en: 'Market cooking' }
  },

  PublishState: { type: 'string', enum: ['published', 'draft', 'warnings', 'new'] },
  SpaceType: { type: 'string', enum: ['restaurant', 'cafe', 'coctel', 'club', 'terraza', 'live_music', 'otro'] },
  UserRole: { type: 'string', enum: ['admin', 'editor'] },
  MediaUsage: { type: 'string', enum: ['hero', 'gallery', 'dish', 'unused'] },
  WeekDay: { type: 'string', enum: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] },

  SessionUser: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      role: { $ref: '#/components/schemas/UserRole' },
      avatarColor: { type: 'string' }
    },
    required: ['id', 'email', 'name', 'role', 'avatarColor']
  },

  Address: {
    type: 'object',
    properties: {
      street: { type: 'string' },
      postalCode: { type: 'string' },
      city: { type: 'string' },
      province: { type: 'string' },
      district: { type: 'string' },
      country: { type: 'string' }
    }
  },

  Contact: {
    type: 'object',
    properties: {
      phone: { type: 'string' },
      whatsapp: { type: 'string' },
      email: { type: 'string' },
      web: { type: 'string' }
    }
  },

  Socials: {
    type: 'object',
    properties: {
      instagram: { type: 'string' },
      facebook: { type: 'string' },
      tiktok: { type: 'string' }
    }
  },

  Restaurant: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      slug: { type: 'string', example: 'casabella' },
      name: { type: 'string' },
      domain: { type: 'string' },
      logoInitial: { type: 'string' },
      coverGradient: { type: 'string' },
      state: { $ref: '#/components/schemas/PublishState' },
      activeLocales: { type: 'array', items: { type: 'string' }, example: ['es', 'ca', 'en'] },
      defaultLocale: { type: 'string', example: 'es' },
      acceptsBookings: { type: 'boolean' },
      showSocials: { type: 'boolean' },
      address: { $ref: '#/components/schemas/Address' },
      contact: { $ref: '#/components/schemas/Contact' },
      socials: { $ref: '#/components/schemas/Socials' },
      seo: { type: 'object' },
      lastPublishedAt: { type: 'string', nullable: true, format: 'date-time' },
      completePercent: { type: 'integer', minimum: 0, maximum: 100 },
      spacesCount: { type: 'integer' },
      dishesCount: { type: 'integer' },
      winesCount: { type: 'integer' }
    },
    required: ['id', 'slug', 'name', 'domain', 'state', 'activeLocales', 'defaultLocale']
  },

  RestaurantCreate: {
    type: 'object',
    properties: {
      slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
      name: { type: 'string' },
      domain: { type: 'string' },
      logoInitial: { type: 'string', maxLength: 3 },
      defaultLocaleCode: { type: 'string' },
      activeLocaleCodes: { type: 'array', items: { type: 'string' }, minItems: 1 }
    },
    required: ['slug', 'name', 'domain', 'defaultLocaleCode', 'activeLocaleCodes']
  },

  ScheduleShift: {
    type: 'object',
    properties: {
      open: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '13:00' },
      close: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '16:00' }
    },
    required: ['open', 'close']
  },

  ScheduleDay: {
    type: 'object',
    properties: {
      day: { $ref: '#/components/schemas/WeekDay' },
      shifts: { type: 'array', items: { $ref: '#/components/schemas/ScheduleShift' } }
    },
    required: ['day', 'shifts']
  },

  Hero: {
    type: 'object',
    properties: {
      title: { $ref: '#/components/schemas/I18nString' },
      subtitle: { $ref: '#/components/schemas/I18nString' },
      metaLeft: { $ref: '#/components/schemas/I18nString' },
      metaRight: { $ref: '#/components/schemas/I18nString' },
      note: { $ref: '#/components/schemas/I18nString' },
      cta: { $ref: '#/components/schemas/I18nString' },
      imageAlt: { $ref: '#/components/schemas/I18nString' },
      imageAssetId: { type: 'string' }
    }
  },

  Space: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      restaurantId: { type: 'string' },
      slug: { type: 'string' },
      name: { type: 'string' },
      type: { $ref: '#/components/schemas/SpaceType' },
      isDefault: { type: 'boolean' },
      order: { type: 'integer' },
      state: { $ref: '#/components/schemas/PublishState' },
      coverGradient: { type: 'string' },
      descriptor: { type: 'string' },
      hero: { $ref: '#/components/schemas/Hero' },
      manifesto: {
        type: 'object',
        properties: {
          eyebrow: { $ref: '#/components/schemas/I18nString' },
          text: { $ref: '#/components/schemas/I18nString' }
        }
      },
      schedule: { type: 'array', items: { $ref: '#/components/schemas/ScheduleDay' } },
      galleryCount: { type: 'integer' },
      dishesCount: { type: 'integer' },
      winesCount: { type: 'integer' },
      completePercent: { type: 'integer' },
      lastEditedAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'restaurantId', 'slug', 'name', 'type']
  },

  Dish: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      spaceId: { type: 'string' },
      categoryId: { type: 'string' },
      restaurantSlug: { type: 'string' },
      restaurantName: { type: 'string' },
      categoryName: { type: 'string' },
      name: { $ref: '#/components/schemas/I18nString' },
      note: { $ref: '#/components/schemas/I18nString' },
      price: { type: 'number', nullable: true },
      order: { type: 'integer' },
      active: { type: 'boolean' },
      localesFilled: { type: 'array', items: { type: 'string' } },
      imageAssetId: { type: 'string', nullable: true },
      imageGradient: { type: 'string' }
    }
  },

  Wine: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      spaceId: { type: 'string' },
      categoryId: { type: 'string' },
      restaurantSlug: { type: 'string' },
      restaurantName: { type: 'string' },
      categoryName: { type: 'string' },
      name: { type: 'string', description: 'NO i18n en el schema original' },
      region: { type: 'string', nullable: true },
      note: { $ref: '#/components/schemas/I18nString' },
      priceGlass: { type: 'number', nullable: true },
      priceBottle: { type: 'number', nullable: true },
      order: { type: 'integer' },
      active: { type: 'boolean' },
      localesFilled: { type: 'array', items: { type: 'string' } },
      imageGradient: { type: 'string' }
    }
  },

  DishCategory: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      spaceId: { type: 'string' },
      name: { $ref: '#/components/schemas/I18nString' },
      order: { type: 'integer' }
    }
  },

  WineCategory: { allOf: [{ $ref: '#/components/schemas/DishCategory' }] },

  Language: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      code: { type: 'string', example: 'es' },
      name: { type: 'string', example: 'Español' },
      usedByCount: { type: 'integer' }
    },
    required: ['id', 'code', 'name']
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      initials: { type: 'string' },
      avatarColor: { type: 'string' },
      role: { $ref: '#/components/schemas/UserRole' },
      restaurants: {
        type: 'array', items: { type: 'string' },
        description: "Array de slugs; ['*'] si es admin"
      },
      lastAccessAt: { type: 'string', format: 'date-time', nullable: true }
    }
  },

  MediaAsset: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      r2Key: { type: 'string' },
      publicUrl: { type: 'string', format: 'uri' },
      mimeType: { type: 'string' },
      sizeKb: { type: 'integer' },
      width: { type: 'integer', nullable: true },
      height: { type: 'integer', nullable: true },
      usage: { $ref: '#/components/schemas/MediaUsage' },
      hasAltText: { type: 'boolean' },
      altText: { $ref: '#/components/schemas/I18nString' },
      restaurantSlug: { type: 'string', nullable: true },
      restaurantName: { type: 'string', nullable: true },
      uploadedBy: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  UploadUrlResponse: {
    type: 'object',
    properties: {
      mediaId: { type: 'string' },
      uploadUrl: { type: 'string', format: 'uri', description: 'PUT firmada a R2, expira en 5 min' },
      publicUrl: { type: 'string', format: 'uri' },
      r2Key: { type: 'string' },
      expiresIn: { type: 'integer', description: 'segundos' }
    }
  }
};

// ─── Helpers de respuesta ──────────────────────────────────────────
const ok = <T>(schema: T) => ({ description: 'OK', content: { 'application/json': { schema } } });
const errRef = (desc: string) => ({ description: desc, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const jsonBody = <T>(schema: T) => ({ required: true, content: { 'application/json': { schema } } });

const paths: Record<string, any> = {
  // ─── Health ─────────────────────────────────────────────────────
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Ping de salud + estado de la BD',
      security: [],
      responses: {
        200: ok({
          type: 'object',
          properties: {
            ok: { type: 'boolean' }, db: { type: 'string' },
            dbError: { type: 'string', nullable: true }, latencyMs: { type: 'integer' },
            version: { type: 'string' }
          }
        }),
        503: errRef('BD caída')
      }
    }
  },

  // ─── Auth ───────────────────────────────────────────────────────
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login con email + password. Setea cookie `hs_session`.',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        properties: { email: { type: 'string' }, password: { type: 'string' } },
        required: ['email', 'password']
      }),
      responses: {
        200: ok({
          type: 'object',
          properties: { user: { $ref: '#/components/schemas/SessionUser' } }
        }),
        401: errRef('invalid_credentials')
      }
    }
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'], summary: 'Invalida sesión y limpia cookie',
      responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 401: errRef('unauthorized') }
    }
  },
  '/auth/session': {
    get: {
      tags: ['Auth'], summary: 'Devuelve el usuario de la sesión actual o null',
      security: [],
      responses: {
        200: ok({
          type: 'object',
          properties: { user: { oneOf: [{ $ref: '#/components/schemas/SessionUser' }, { type: 'null' }] } }
        })
      }
    }
  },

  // ─── Restaurants ────────────────────────────────────────────────
  '/restaurants': {
    get: {
      tags: ['Restaurants'], summary: 'Lista restaurantes (filtrada por rol)',
      responses: {
        200: ok({ type: 'object', properties: { restaurants: { type: 'array', items: { $ref: '#/components/schemas/Restaurant' } } } }),
        401: errRef('unauthorized')
      }
    },
    post: {
      tags: ['Restaurants'], summary: 'Crea un restaurante (admin only)',
      requestBody: jsonBody({ $ref: '#/components/schemas/RestaurantCreate' }),
      responses: {
        201: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } } }),
        400: errRef('validación / unknown_locale'),
        403: errRef('admin_required'),
        409: errRef('slug_taken')
      }
    }
  },
  '/restaurants/{slug}': {
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'casabella' }],
    get: {
      tags: ['Restaurants'], summary: 'Detalle del restaurante',
      responses: {
        200: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } } }),
        403: errRef('restaurant_forbidden'), 404: errRef('not_found')
      }
    },
    patch: {
      tags: ['Restaurants'], summary: 'Actualiza campos del restaurante',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' }, domain: { type: 'string' }, state: { $ref: '#/components/schemas/PublishState' },
          address: { $ref: '#/components/schemas/Address' }, contact: { $ref: '#/components/schemas/Contact' },
          socials: { $ref: '#/components/schemas/Socials' },
          activeLocaleCodes: { type: 'array', items: { type: 'string' } },
          defaultLocaleCode: { type: 'string' }, acceptsBookings: { type: 'boolean' }, showSocials: { type: 'boolean' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } } }),
        403: errRef('restaurant_forbidden'), 404: errRef('not_found')
      }
    },
    delete: {
      tags: ['Restaurants'], summary: 'Elimina restaurante (admin only)',
      responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 403: errRef('admin_required'), 404: errRef('not_found') }
    }
  },

  // ─── Spaces ─────────────────────────────────────────────────────
  '/restaurants/{slug}/spaces': {
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Spaces'], summary: 'Lista espacios del restaurante',
      responses: { 200: ok({ type: 'object', properties: { spaces: { type: 'array', items: { $ref: '#/components/schemas/Space' } } } }) }
    },
    post: {
      tags: ['Spaces'], summary: 'Crea un espacio nuevo',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          slug: { type: 'string' }, name: { type: 'string' }, type: { $ref: '#/components/schemas/SpaceType' },
          descriptor: { type: 'string' }, isDefault: { type: 'boolean' }
        },
        required: ['slug', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } } }), 409: errRef('slug_taken') }
    }
  },
  '/restaurants/{slug}/spaces/{spaceId}': {
    parameters: [
      { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }
    ],
    get: {
      tags: ['Spaces'], summary: 'Detalle del espacio',
      responses: { 200: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } } }), 404: errRef('not_found') }
    },
    patch: {
      tags: ['Spaces'], summary: 'Actualiza hero, manifesto o schedule',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' }, type: { $ref: '#/components/schemas/SpaceType' },
          descriptor: { type: 'string' }, isDefault: { type: 'boolean' },
          hero: { $ref: '#/components/schemas/Hero' },
          manifesto: { type: 'object' },
          schedule: { type: 'array', items: { $ref: '#/components/schemas/ScheduleDay' } },
          state: { $ref: '#/components/schemas/PublishState' }
        }
      }),
      responses: { 200: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } } }), 400: errRef('must_have_default_space') }
    },
    delete: {
      tags: ['Spaces'], summary: 'Elimina espacio (no el último)',
      responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 400: errRef('cannot_delete_last_space') }
    }
  },

  // ─── Dishes ─────────────────────────────────────────────────────
  '/dishes': {
    get: {
      tags: ['Dishes'], summary: 'Lista platos con filtros',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } },
        { name: 'missingLocale', in: 'query', schema: { type: 'string' }, description: 'Filtra platos sin traducción en este locale' }
      ],
      responses: { 200: ok({ type: 'object', properties: { dishes: { type: 'array', items: { $ref: '#/components/schemas/Dish' } } } }) }
    },
    post: {
      tags: ['Dishes'], summary: 'Crea un plato',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          spaceId: { type: 'string' }, categoryId: { type: 'string' },
          name: { $ref: '#/components/schemas/I18nString' }, note: { $ref: '#/components/schemas/I18nString' },
          price: { type: 'number' }, order: { type: 'integer' }, active: { type: 'boolean' }
        },
        required: ['spaceId', 'categoryId', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } } }) }
    }
  },
  '/dishes/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    get: { tags: ['Dishes'], responses: { 200: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } } }) } },
    patch: { tags: ['Dishes'], summary: 'Actualiza plato', requestBody: jsonBody({ type: 'object' }), responses: { 200: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } } }) } },
    delete: { tags: ['Dishes'], responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }) } }
  },
  '/dishes/categories': {
    get: {
      tags: ['Dishes'], summary: 'Lista categorías (filtro opcional spaceId)',
      parameters: [{ name: 'spaceId', in: 'query', schema: { type: 'string' } }],
      responses: { 200: ok({ type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/DishCategory' } } } }) }
    },
    post: {
      tags: ['Dishes'], summary: 'Crea categoría',
      requestBody: jsonBody({
        type: 'object',
        properties: { spaceId: { type: 'string' }, name: { $ref: '#/components/schemas/I18nString' }, order: { type: 'integer' } },
        required: ['spaceId', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { category: { $ref: '#/components/schemas/DishCategory' } } }) }
    }
  },

  // ─── Wines ──────────────────────────────────────────────────────
  '/wines': {
    get: {
      tags: ['Wines'], summary: 'Lista vinos',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } }
      ],
      responses: { 200: ok({ type: 'object', properties: { wines: { type: 'array', items: { $ref: '#/components/schemas/Wine' } } } }) }
    },
    post: {
      tags: ['Wines'], summary: 'Crea vino',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          spaceId: { type: 'string' }, categoryId: { type: 'string' },
          name: { type: 'string' }, region: { type: 'string' }, note: { $ref: '#/components/schemas/I18nString' },
          priceGlass: { type: 'number' }, priceBottle: { type: 'number' }
        },
        required: ['spaceId', 'categoryId', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { wine: { $ref: '#/components/schemas/Wine' } } }) }
    }
  },
  '/wines/categories': {
    get: { tags: ['Wines'], summary: 'Lista categorías de vinos', responses: { 200: ok({ type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/WineCategory' } } } }) } },
    post: {
      tags: ['Wines'], summary: 'Crea categoría',
      requestBody: jsonBody({ type: 'object', properties: { spaceId: { type: 'string' }, name: { $ref: '#/components/schemas/I18nString' } }, required: ['spaceId', 'name'] }),
      responses: { 201: ok({ type: 'object', properties: { category: { $ref: '#/components/schemas/WineCategory' } } }) }
    }
  },

  // ─── Languages ──────────────────────────────────────────────────
  '/languages': {
    get: {
      tags: ['Languages'], summary: 'Lista idiomas con usedByCount',
      responses: { 200: ok({ type: 'object', properties: { languages: { type: 'array', items: { $ref: '#/components/schemas/Language' } } } }) }
    },
    post: {
      tags: ['Languages'], summary: 'Crea idioma (admin only)',
      requestBody: jsonBody({
        type: 'object',
        properties: { code: { type: 'string', pattern: '^[a-z]{2}(-[a-z]{2})?$' }, name: { type: 'string' } },
        required: ['code', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { language: { $ref: '#/components/schemas/Language' } } }), 409: errRef('code_taken') }
    }
  },
  '/languages/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: { tags: ['Languages'], requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' } } }), responses: { 200: ok({ type: 'object', properties: { language: { $ref: '#/components/schemas/Language' } } }) } },
    delete: { tags: ['Languages'], responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 400: errRef('language_in_use') } }
  },

  // ─── Users ──────────────────────────────────────────────────────
  '/users': {
    get: { tags: ['Users'], summary: 'Lista usuarios (admin only)', responses: { 200: ok({ type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }), 403: errRef('admin_required') } },
    post: {
      tags: ['Users'], summary: 'Crea usuario (admin only)',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 },
          name: { type: 'string' }, role: { $ref: '#/components/schemas/UserRole' },
          avatarColor: { type: 'string' }, restaurantSlugs: { type: 'array', items: { type: 'string' } }
        },
        required: ['email', 'password', 'name']
      }),
      responses: { 201: ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }), 409: errRef('email_taken') }
    }
  },
  '/users/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: { tags: ['Users'], summary: 'Edita usuario (rol, password, restaurantes)', requestBody: jsonBody({ type: 'object' }), responses: { 200: ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }) } },
    delete: { tags: ['Users'], responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 400: errRef('cannot_delete_self') } }
  },

  // ─── Media ──────────────────────────────────────────────────────
  '/media': {
    get: {
      tags: ['Media'], summary: 'Lista media con filtros',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'usage', in: 'query', schema: { $ref: '#/components/schemas/MediaUsage' } },
        { name: 'missingAlt', in: 'query', schema: { type: 'boolean' } }
      ],
      responses: { 200: ok({ type: 'object', properties: { media: { type: 'array', items: { $ref: '#/components/schemas/MediaAsset' } } } }) }
    }
  },
  '/media/upload-url': {
    post: {
      tags: ['Media'], summary: 'Genera signed PUT URL para R2 + reserva mediaId',
      description: 'Flujo: 1) POST aquí → recibes uploadUrl + mediaId. 2) PUT directo al uploadUrl con el binario. 3) POST /media/:id/confirm con dimensions.',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          restaurantSlug: { type: 'string' },
          filename: { type: 'string' },
          mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] },
          sizeKb: { type: 'integer', maximum: 10000 }
        },
        required: ['restaurantSlug', 'filename', 'mimeType', 'sizeKb']
      }),
      responses: { 200: ok({ $ref: '#/components/schemas/UploadUrlResponse' }), 403: errRef('restaurant_forbidden') }
    }
  },
  '/media/{id}/confirm': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    post: {
      tags: ['Media'], summary: 'Confirma upload — actualiza dimensions y alt',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          width: { type: 'integer' }, height: { type: 'integer' },
          altText: { $ref: '#/components/schemas/I18nString' }
        }
      }),
      responses: { 200: ok({ type: 'object', properties: { media: { $ref: '#/components/schemas/MediaAsset' } } }) }
    }
  },
  '/media/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: { tags: ['Media'], summary: 'Actualiza usage o alt', requestBody: jsonBody({ type: 'object' }), responses: { 200: ok({ type: 'object', properties: { media: { $ref: '#/components/schemas/MediaAsset' } } }) } },
    delete: { tags: ['Media'], summary: 'Elimina de BD + R2', responses: { 200: ok({ type: 'object', properties: { ok: { type: 'boolean' } } }), 400: errRef('media_in_use') } }
  }
};

export const openApiSpec = {
  openapi: '3.1.0',
  info: BASE_INFO,
  servers: SERVERS,
  tags: [
    { name: 'System', description: 'Health y metadatos' },
    { name: 'Auth', description: 'Sesión (cookie `hs_session`, Lucia + argon2)' },
    { name: 'Restaurants', description: 'Ficha de restaurante — datos compartidos por todos los espacios' },
    { name: 'Spaces', description: 'Espacios del restaurante — hero, horarios, cartas por sala' },
    { name: 'Dishes', description: 'Platos + categorías' },
    { name: 'Wines', description: 'Vinos + categorías (name NO es i18n)' },
    { name: 'Languages', description: 'Idiomas del sistema' },
    { name: 'Users', description: 'Cuentas del backoffice (admin only)' },
    { name: 'Media', description: 'Assets en Cloudflare R2 (upload directo con signed URLs)' }
  ],
  components: {
    schemas,
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'hs_session',
        description: 'Cookie HTTP-only seteada por POST /auth/login. Se envía automáticamente en el browser.'
      }
    }
  },
  security: [{ sessionCookie: [] }],
  paths
};
