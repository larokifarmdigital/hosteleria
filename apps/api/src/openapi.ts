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

// El primero es el que Scalar elige por default en /docs cuando pulsás "Try it".
// Dejamos prod primero para que la UI funcione en producción.
const SERVERS = [
  { url: 'https://hostelery-api.larokifarmdigital.workers.dev', description: 'Producción (Cloudflare Workers)' },
  { url: 'https://api.hosteleria.cat', description: 'Producción con dominio custom (si lo configurás)' },
  { url: 'http://localhost:8787', description: 'Local dev (wrangler dev)' }
];

// ─── Schemas ───────────────────────────────────────────────────────
const schemas = {
  Error: {
    type: 'object',
    description: [
      'Body de cualquier respuesta de error. `error` es un código estable (no una frase traducible).',
      'Códigos conocidos agrupados por status:',
      '• 400 — `unknown_locale:<code>`, `weak_password:<reason>`, `no_snapshot`, `language_in_use`,',
      '`cannot_delete_last_space`, `cannot_delete_self`, `must_have_default_space`,',
      '`category_has_dishes`, `category_has_wines`, `media_in_use:dishes=<N>,spaces=<N>`,',
      '`upload_not_found_in_r2`, `upload_size_mismatch`, `invalid_or_expired_token`, `missing_slug`.',
      '• 401 — `invalid_credentials`, `unauthorized`.',
      '• 403 — `admin_required`, `restaurant_forbidden`, `space_forbidden`.',
      '• 404 — `<entity>_not_found:<idOrSlug>`, `not_found`.',
      '• 409 — `slug_taken:<slug>`, `email_taken:<email>`, `language_code_taken:<code>`, `space_slug_taken:<slug>`.',
      '• 429 — `rate_limited`.',
      '• 500 — `internal_error`.'
    ].join(' '),
    properties: { error: { type: 'string', example: 'restaurant_not_found:casabella' } },
    required: ['error']
  },

  SessionInfo: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userAgent: { type: 'string', nullable: true },
      deviceHint: { type: 'string', example: 'macOS · Chrome' },
      createdAt: { type: 'string', format: 'date-time' },
      expiresAt: { type: 'string', format: 'date-time' },
      current: { type: 'boolean' }
    },
    required: ['id', 'deviceHint', 'createdAt', 'expiresAt', 'current']
  },

  MediaReferences: {
    type: 'object',
    properties: {
      dishes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      spaces: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }
    },
    required: ['dishes', 'spaces']
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

// Respuestas de error reutilizables (todos usan el schema `Error`).
const err400 = errRef('400 Bad Request — validación o invariante de negocio (ver schema Error)');
const err401 = errRef('401 Unauthorized — `invalid_credentials` o cookie ausente/expirada (`unauthorized`)');
const err403Admin = errRef('403 Forbidden — `admin_required`');
const err403Rest = errRef('403 Forbidden — `restaurant_forbidden`');
const err403Space = errRef('403 Forbidden — `space_forbidden`');
const err404 = errRef('404 Not Found — `<entity>_not_found:<id>` o `not_found`');
const err409 = errRef('409 Conflict — ver schema Error (slug/email/code taken)');
const err429 = errRef('429 Too Many Requests — `rate_limited`');
const err500 = errRef('500 Internal Server Error — `internal_error`');

const paths: Record<string, any> = {
  // ─── System ─────────────────────────────────────────────────────
  '/': {
    get: {
      tags: ['System'], summary: 'Metadatos del servicio', security: [],
      responses: {
        200: ok({ type: 'object', properties: {
          name: { type: 'string' }, version: { type: 'string' },
          docs: { type: 'string' }, openapi: { type: 'string' }
        }})
      }
    }
  },
  '/health': {
    get: {
      tags: ['System'], summary: 'Ping de salud + estado de la BD', security: [],
      responses: {
        200: ok({ type: 'object', properties: {
          ok: { type: 'boolean' }, db: { type: 'string' },
          dbError: { type: 'string', nullable: true }, latencyMs: { type: 'integer' },
          version: { type: 'string' }
        }}),
        503: errRef('503 Service Unavailable — BD inaccesible')
      }
    }
  },

  // ─── Auth ───────────────────────────────────────────────────────
  '/auth/login': {
    post: {
      tags: ['Auth'], security: [],
      summary: 'Login con email + password; setea cookie `hs_session`',
      description: 'Rate limit: 5 req/hora por `IP:email`. Timing-constant: tarda lo mismo exista o no el user.',
      requestBody: jsonBody({
        type: 'object',
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 1 } },
        required: ['email', 'password']
      }),
      responses: {
        200: ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/SessionUser' } }, required: ['user'] }),
        400: errRef('400 Bad Request — body inválido'),
        401: errRef('401 Unauthorized — `invalid_credentials`'),
        429: err429, 500: err500
      }
    }
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'], summary: 'Invalida la sesión actual y limpia la cookie',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        401: err401, 500: err500
      }
    }
  },
  '/auth/session': {
    get: {
      tags: ['Auth'], security: [],
      summary: 'Devuelve el user de la sesión actual o `null`',
      description: 'No requiere auth; si no hay cookie válida devuelve `{ user: null }`.',
      responses: {
        200: ok({
          type: 'object',
          properties: { user: { oneOf: [{ $ref: '#/components/schemas/SessionUser' }, { type: 'null' }] } },
          required: ['user']
        })
      }
    }
  },
  '/auth/sessions': {
    get: {
      tags: ['Auth'], summary: 'Lista sesiones activas del user actual',
      description: 'Para la UI de "cerrar sesión en otro dispositivo".',
      responses: {
        200: ok({
          type: 'object',
          properties: { sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionInfo' } } },
          required: ['sessions']
        }),
        401: err401, 500: err500
      }
    },
    delete: {
      tags: ['Auth'], summary: 'Cierra TODAS las sesiones del user excepto la actual',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' }, closed: { type: 'integer' } }, required: ['ok', 'closed'] }),
        401: err401, 500: err500
      }
    }
  },
  '/auth/sessions/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    delete: {
      tags: ['Auth'], summary: 'Cierra UNA sesión del user actual (debe ser suya)',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        401: err401,
        404: errRef('404 Not Found — `session_not_found:<id>` (no existe o no pertenece al user)'),
        500: err500
      }
    }
  },
  '/auth/forgot': {
    post: {
      tags: ['Auth'], security: [],
      summary: 'Envía email de reset de password (idempotente)',
      description: 'Rate limit: 3 req/hora por `IP:email`. Siempre responde 200 — no revela si el email está en BD. Si existe, invalida tokens previos y manda uno nuevo con TTL 1h.',
      requestBody: jsonBody({
        type: 'object',
        properties: { email: { type: 'string', format: 'email' } },
        required: ['email']
      }),
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — body inválido'),
        429: err429, 500: err500
      }
    }
  },
  '/auth/reset': {
    post: {
      tags: ['Auth'], security: [],
      summary: 'Consume token de reset y setea nuevo password',
      description: 'Invalida TODAS las sesiones activas del user al terminar.',
      requestBody: jsonBody({
        type: 'object',
        properties: { token: { type: 'string', minLength: 16 }, newPassword: { type: 'string', minLength: 8, maxLength: 200 } },
        required: ['token', 'newPassword']
      }),
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `invalid_or_expired_token` o `weak_password:<reason>`'),
        500: err500
      }
    }
  },
  '/auth/set-password': {
    post: {
      tags: ['Auth'], security: [],
      summary: 'Consume token de welcome y setea primera password',
      description: 'Mismo payload que `/auth/reset` pero el token es de tipo `password_setup` (TTL 48h desde el email de bienvenida).',
      requestBody: jsonBody({
        type: 'object',
        properties: { token: { type: 'string', minLength: 16 }, newPassword: { type: 'string', minLength: 8, maxLength: 200 } },
        required: ['token', 'newPassword']
      }),
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `invalid_or_expired_token` o `weak_password:<reason>`'),
        500: err500
      }
    }
  },

  // ─── Restaurants ────────────────────────────────────────────────
  '/restaurants': {
    get: {
      tags: ['Restaurants'], summary: 'Lista restaurantes accesibles por el user',
      description: 'Admin ve todos; editor solo los asignados en `user_restaurants`. Caché `max-age=30, swr=120`.',
      responses: {
        200: ok({ type: 'object', properties: { restaurants: { type: 'array', items: { $ref: '#/components/schemas/Restaurant' } } }, required: ['restaurants'] }),
        304: { description: '304 Not Modified — ETag coincide con `If-None-Match`' },
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Restaurants'], summary: 'Crea un restaurante (admin only)',
      requestBody: jsonBody({ $ref: '#/components/schemas/RestaurantCreate' }),
      responses: {
        201: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } }, required: ['restaurant'] }),
        400: errRef('400 Bad Request — validación o `unknown_locale:<code>`'),
        401: err401, 403: err403Admin,
        409: errRef('409 Conflict — `slug_taken:<slug>`'),
        500: err500
      }
    }
  },
  '/restaurants/{slug}': {
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'casabella' }],
    get: {
      tags: ['Restaurants'], summary: 'Detalle del restaurante',
      responses: {
        200: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } }, required: ['restaurant'] }),
        304: { description: '304 Not Modified' },
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `restaurant_not_found:<slug>`'),
        500: err500
      }
    },
    patch: {
      tags: ['Restaurants'], summary: 'Actualiza campos del restaurante',
      description: 'Si `state=published` crea snapshot. Si ya estaba publicado y se tocó algún campo, dispara el rebuild hook fire-and-forget.',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' }, domain: { type: 'string' },
          logoInitial: { type: 'string' }, coverGradient: { type: 'string' },
          state: { $ref: '#/components/schemas/PublishState' },
          address: { $ref: '#/components/schemas/Address' },
          contact: { $ref: '#/components/schemas/Contact' },
          socials: { $ref: '#/components/schemas/Socials' },
          seo: { type: 'object' },
          activeLocaleCodes: { type: 'array', items: { type: 'string' } },
          defaultLocaleCode: { type: 'string' },
          acceptsBookings: { type: 'boolean' }, showSocials: { type: 'boolean' },
          timezone: { type: 'string' }, rebuildHookUrl: { type: 'string', nullable: true }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } }, required: ['restaurant'] }),
        400: errRef('400 Bad Request — `unknown_locale:<code>`'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `restaurant_not_found:<slug>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Restaurants'], summary: 'Elimina restaurante (admin only, hard delete)',
      description: 'Las FKs encadenan a spaces, dishes y wines.',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        401: err401, 403: err403Admin,
        404: errRef('404 Not Found — `restaurant_not_found:<slug>`'),
        500: err500
      }
    }
  },
  '/restaurants/{slug}/discard': {
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
    post: {
      tags: ['Restaurants'], summary: 'Revierte los campos al último snapshot publicado',
      responses: {
        200: ok({ type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } }, required: ['restaurant'] }),
        400: errRef('400 Bad Request — `no_snapshot` (nunca se publicó)'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `restaurant_not_found:<slug>`'),
        500: err500
      }
    }
  },

  // ─── Spaces ─────────────────────────────────────────────────────
  '/restaurants/{slug}/spaces': {
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Spaces'], summary: 'Lista espacios del restaurante',
      responses: {
        200: ok({ type: 'object', properties: { spaces: { type: 'array', items: { $ref: '#/components/schemas/Space' } } }, required: ['spaces'] }),
        401: err401, 403: err403Rest, 500: err500
      }
    },
    post: {
      tags: ['Spaces'], summary: 'Crea un espacio nuevo',
      description: 'Si es el primer space del restaurant, se fuerza `isDefault=true`.',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' }, name: { type: 'string' },
          type: { $ref: '#/components/schemas/SpaceType' },
          descriptor: { type: 'string' }, isDefault: { type: 'boolean' }
        },
        required: ['slug', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } }, required: ['space'] }),
        400: errRef('400 Bad Request — body inválido'),
        401: err401, 403: err403Rest,
        409: errRef('409 Conflict — `space_slug_taken:<slug>` (dentro del restaurant)'),
        500: err500
      }
    }
  },
  '/restaurants/{slug}/spaces/{spaceId}': {
    parameters: [
      { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }
    ],
    get: {
      tags: ['Spaces'], summary: 'Detalle del espacio',
      responses: {
        200: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } }, required: ['space'] }),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `space_not_found:<id>`'),
        500: err500
      }
    },
    patch: {
      tags: ['Spaces'], summary: 'Actualiza hero, manifesto, schedule, estado o default',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' }, type: { $ref: '#/components/schemas/SpaceType' },
          descriptor: { type: 'string' }, isDefault: { type: 'boolean' },
          order: { type: 'integer', minimum: 0 }, coverGradient: { type: 'string' },
          hero: { $ref: '#/components/schemas/Hero' },
          manifesto: { type: 'object' },
          schedule: { type: 'array', items: { $ref: '#/components/schemas/ScheduleDay' } },
          state: { $ref: '#/components/schemas/PublishState' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } }, required: ['space'] }),
        400: errRef('400 Bad Request — `must_have_default_space` (ningún otro con isDefault=true)'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `space_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Spaces'], summary: 'Elimina el espacio (no el único)',
      description: 'Si el borrado era el default, se promueve otro automáticamente.',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `cannot_delete_last_space` (debe quedar ≥ 1)'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `space_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/restaurants/{slug}/spaces/{spaceId}/discard': {
    parameters: [
      { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }
    ],
    post: {
      tags: ['Spaces'], summary: 'Revierte el space al último snapshot publicado',
      responses: {
        200: ok({ type: 'object', properties: { space: { $ref: '#/components/schemas/Space' } }, required: ['space'] }),
        400: errRef('400 Bad Request — `no_snapshot`'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `space_not_found:<id>`'),
        500: err500
      }
    }
  },

  // ─── Dishes ─────────────────────────────────────────────────────
  '/dishes': {
    get: {
      tags: ['Dishes'], summary: 'Lista platos con filtros',
      description: 'Admin ve todos; editor solo platos de spaces de sus restaurantes.',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } },
        { name: 'missingLocale', in: 'query', schema: { type: 'string' }, description: 'Devuelve solo platos sin traducción en ese locale.' }
      ],
      responses: {
        200: ok({ type: 'object', properties: { dishes: { type: 'array', items: { $ref: '#/components/schemas/Dish' } } }, required: ['dishes'] }),
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Dishes'], summary: 'Crea un plato',
      description: 'La categoría debe pertenecer al mismo space (coherencia referencial).',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          spaceId: { type: 'string' }, categoryId: { type: 'string' },
          name: { $ref: '#/components/schemas/I18nString' },
          note: { $ref: '#/components/schemas/I18nString' },
          price: { type: 'number', minimum: 0 },
          order: { type: 'integer', minimum: 0 }, active: { type: 'boolean' },
          imageAssetId: { type: 'string' }, imageGradient: { type: 'string' }
        },
        required: ['spaceId', 'categoryId', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } }, required: ['dish'] }),
        400: errRef('400 Bad Request — body inválido'),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_category_not_found:<id>` (o no pertenece al space)'),
        500: err500
      }
    }
  },
  '/dishes/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Dishes'], summary: 'Detalle del plato',
      responses: {
        200: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } }, required: ['dish'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_not_found:<id>`'),
        500: err500
      }
    },
    patch: {
      tags: ['Dishes'], summary: 'Actualiza plato',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          categoryId: { type: 'string' },
          name: { $ref: '#/components/schemas/I18nString' },
          note: { $ref: '#/components/schemas/I18nString' },
          price: { type: 'number', nullable: true },
          order: { type: 'integer' }, active: { type: 'boolean' },
          imageAssetId: { type: 'string', nullable: true }, imageGradient: { type: 'string' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { dish: { $ref: '#/components/schemas/Dish' } }, required: ['dish'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_not_found:<id>` o `dish_category_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Dishes'], summary: 'Elimina plato',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/dishes/categories': {
    get: {
      tags: ['Dishes'], summary: 'Lista categorías de platos',
      parameters: [{ name: 'spaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: ok({ type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/DishCategory' } } }, required: ['categories'] }),
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Dishes'], summary: 'Crea categoría de platos',
      requestBody: jsonBody({
        type: 'object',
        properties: { spaceId: { type: 'string' }, name: { $ref: '#/components/schemas/I18nString' }, order: { type: 'integer', minimum: 0 } },
        required: ['spaceId', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { category: { $ref: '#/components/schemas/DishCategory' } }, required: ['category'] }),
        401: err401, 403: err403Space, 500: err500
      }
    }
  },
  '/dishes/categories/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: {
      tags: ['Dishes'], summary: 'Actualiza categoría de platos',
      requestBody: jsonBody({
        type: 'object',
        properties: { name: { $ref: '#/components/schemas/I18nString' }, order: { type: 'integer', minimum: 0 } }
      }),
      responses: {
        200: ok({ type: 'object', properties: { category: { $ref: '#/components/schemas/DishCategory' } }, required: ['category'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_category_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Dishes'], summary: 'Elimina categoría de platos (restrict si tiene platos)',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `category_has_dishes`'),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `dish_category_not_found:<id>`'),
        500: err500
      }
    }
  },

  // ─── Wines ──────────────────────────────────────────────────────
  '/wines': {
    get: {
      tags: ['Wines'], summary: 'Lista vinos con filtros',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: ok({ type: 'object', properties: { wines: { type: 'array', items: { $ref: '#/components/schemas/Wine' } } }, required: ['wines'] }),
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Wines'], summary: 'Crea un vino',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          spaceId: { type: 'string' }, categoryId: { type: 'string' },
          name: { type: 'string', description: 'NO es i18n: nombre propio del vino.' },
          region: { type: 'string' },
          note: { $ref: '#/components/schemas/I18nString' },
          priceGlass: { type: 'number', minimum: 0 }, priceBottle: { type: 'number', minimum: 0 },
          order: { type: 'integer', minimum: 0 }, active: { type: 'boolean' },
          imageGradient: { type: 'string' }
        },
        required: ['spaceId', 'categoryId', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { wine: { $ref: '#/components/schemas/Wine' } }, required: ['wine'] }),
        400: err400, 401: err401, 403: err403Space,
        404: errRef('404 Not Found — `wine_category_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/wines/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Wines'], summary: 'Detalle del vino',
      responses: {
        200: ok({ type: 'object', properties: { wine: { $ref: '#/components/schemas/Wine' } }, required: ['wine'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `wine_not_found:<id>`'),
        500: err500
      }
    },
    patch: {
      tags: ['Wines'], summary: 'Actualiza vino',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          categoryId: { type: 'string' }, name: { type: 'string' },
          region: { type: 'string', nullable: true },
          note: { $ref: '#/components/schemas/I18nString' },
          priceGlass: { type: 'number', nullable: true },
          priceBottle: { type: 'number', nullable: true },
          order: { type: 'integer' }, active: { type: 'boolean' },
          imageGradient: { type: 'string' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { wine: { $ref: '#/components/schemas/Wine' } }, required: ['wine'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `wine_not_found:<id>` o `wine_category_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Wines'], summary: 'Elimina vino',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `wine_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/wines/categories': {
    get: {
      tags: ['Wines'], summary: 'Lista categorías de vinos',
      parameters: [{ name: 'spaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: ok({ type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/WineCategory' } } }, required: ['categories'] }),
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Wines'], summary: 'Crea categoría de vinos',
      requestBody: jsonBody({
        type: 'object',
        properties: { spaceId: { type: 'string' }, name: { $ref: '#/components/schemas/I18nString' }, order: { type: 'integer', minimum: 0 } },
        required: ['spaceId', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { category: { $ref: '#/components/schemas/WineCategory' } }, required: ['category'] }),
        401: err401, 403: err403Space, 500: err500
      }
    }
  },
  '/wines/categories/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    delete: {
      tags: ['Wines'], summary: 'Elimina categoría de vinos (restrict si tiene vinos)',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `category_has_wines`'),
        401: err401, 403: err403Space,
        404: errRef('404 Not Found — `wine_category_not_found:<id>`'),
        500: err500
      }
    }
  },

  // ─── Languages ──────────────────────────────────────────────────
  '/languages': {
    get: {
      tags: ['Languages'], summary: 'Lista idiomas disponibles + `usedByCount`',
      description: 'Caché `max-age=60, swr=300`. Autenticado.',
      responses: {
        200: ok({ type: 'object', properties: { languages: { type: 'array', items: { $ref: '#/components/schemas/Language' } } }, required: ['languages'] }),
        304: { description: '304 Not Modified' },
        401: err401, 500: err500
      }
    },
    post: {
      tags: ['Languages'], summary: 'Crea idioma (admin only)',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          code: { type: 'string', pattern: '^[a-z]{2}(-[a-z]{2})?$', description: 'ISO 639-1 en minúsculas.' },
          name: { type: 'string', minLength: 1, maxLength: 60 }
        },
        required: ['code', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { language: { $ref: '#/components/schemas/Language' } }, required: ['language'] }),
        400: errRef('400 Bad Request — body inválido'),
        401: err401, 403: err403Admin,
        409: errRef('409 Conflict — `language_code_taken:<code>`'),
        500: err500
      }
    }
  },
  '/languages/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: {
      tags: ['Languages'], summary: 'Renombra un idioma (admin only)',
      requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 60 } } }),
      responses: {
        200: ok({ type: 'object', properties: { language: { $ref: '#/components/schemas/Language' } }, required: ['language'] }),
        401: err401, 403: err403Admin,
        404: errRef('404 Not Found — `language_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Languages'], summary: 'Elimina idioma (admin only, restrict si está en uso)',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `language_in_use`'),
        401: err401, 403: err403Admin, 500: err500
      }
    }
  },

  // ─── Users ──────────────────────────────────────────────────────
  '/users': {
    get: {
      tags: ['Users'], summary: 'Lista usuarios del backoffice (admin only)',
      responses: {
        200: ok({ type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } }, required: ['users'] }),
        401: err401, 403: err403Admin, 500: err500
      }
    },
    post: {
      tags: ['Users'], summary: 'Crea usuario (admin only)',
      description: 'Si no se pasa `password`, se manda welcome email con token de setup (TTL 48h). Para editors, `restaurantSlugs` popula la m2m.',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, description: 'Opcional: si falta, se envía welcome email.' },
          name: { type: 'string', minLength: 1, maxLength: 120 },
          role: { $ref: '#/components/schemas/UserRole' },
          avatarColor: { type: 'string' },
          restaurantSlugs: { type: 'array', items: { type: 'string' } }
        },
        required: ['email', 'name']
      }),
      responses: {
        201: ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } }, required: ['user'] }),
        400: errRef('400 Bad Request — `weak_password:<reason>`'),
        401: err401, 403: err403Admin,
        409: errRef('409 Conflict — `email_taken:<email>`'),
        500: err500
      }
    }
  },
  '/users/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: {
      tags: ['Users'], summary: 'Edita usuario (name, rol, password, restaurantes)',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' }, role: { $ref: '#/components/schemas/UserRole' },
          avatarColor: { type: 'string' }, password: { type: 'string', minLength: 8 },
          restaurantSlugs: { type: 'array', items: { type: 'string' } }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } }, required: ['user'] }),
        400: errRef('400 Bad Request — `weak_password:<reason>`'),
        401: err401, 403: err403Admin,
        404: errRef('404 Not Found — `user_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Users'], summary: 'Hard delete del usuario (no se puede borrar a sí mismo)',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `cannot_delete_self`'),
        401: err401, 403: err403Admin,
        404: errRef('404 Not Found — `user_not_found:<id>`'),
        500: err500
      }
    }
  },

  // ─── Media ──────────────────────────────────────────────────────
  '/media': {
    get: {
      tags: ['Media'], summary: 'Lista assets con filtros',
      parameters: [
        { name: 'restaurantSlug', in: 'query', schema: { type: 'string' } },
        { name: 'usage', in: 'query', schema: { $ref: '#/components/schemas/MediaUsage' } },
        { name: 'missingAlt', in: 'query', schema: { type: 'boolean' }, description: 'Solo assets sin alt text en ningún idioma.' }
      ],
      responses: {
        200: ok({ type: 'object', properties: { media: { type: 'array', items: { $ref: '#/components/schemas/MediaAsset' } } }, required: ['media'] }),
        401: err401, 403: err403Rest, 500: err500
      }
    }
  },
  '/media/upload-url': {
    post: {
      tags: ['Media'], summary: 'Firma PUT URL para subir binario directo a R2',
      description: [
        'Flujo browser → R2 directo (el Worker no proxea el binario):',
        '1) POST aquí → `{ mediaId, uploadUrl, publicUrl, expiresIn }`.',
        '2) El browser hace `PUT uploadUrl` con el binario (presigned, 5 min).',
        '3) POST /media/:id/confirm con `width`/`height`/`altText`.',
        'Max 10 MB. Mimetypes permitidos: jpeg/png/webp/avif/gif.'
      ].join(' '),
      requestBody: jsonBody({
        type: 'object',
        properties: {
          restaurantSlug: { type: 'string' },
          filename: { type: 'string' },
          mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] },
          sizeKb: { type: 'integer', minimum: 1, maximum: 10000 }
        },
        required: ['restaurantSlug', 'filename', 'mimeType', 'sizeKb']
      }),
      responses: {
        200: ok({ $ref: '#/components/schemas/UploadUrlResponse' }),
        400: errRef('400 Bad Request — mimetype no permitido o tamaño fuera de rango'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `restaurant_not_found:<slug>`'),
        500: err500
      }
    }
  },
  '/media/{id}/confirm': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    post: {
      tags: ['Media'], summary: 'Confirma upload — verifica HEAD contra R2',
      description: 'Si R2 no tiene el objeto, hace rollback (borra fila) y responde 400. Si el tamaño difiere >50% del declarado, igual rollback (y borra el objeto R2).',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          width: { type: 'integer', minimum: 1 },
          height: { type: 'integer', minimum: 1 },
          altText: { $ref: '#/components/schemas/I18nString' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { media: { $ref: '#/components/schemas/MediaAsset' } }, required: ['media'] }),
        400: errRef('400 Bad Request — `upload_not_found_in_r2` o `upload_size_mismatch`'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `media_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/media/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    patch: {
      tags: ['Media'], summary: 'Actualiza `usage` y/o alt text',
      requestBody: jsonBody({
        type: 'object',
        properties: {
          usage: { $ref: '#/components/schemas/MediaUsage' },
          hasAltText: { type: 'boolean' },
          altText: { $ref: '#/components/schemas/I18nString' }
        }
      }),
      responses: {
        200: ok({ type: 'object', properties: { media: { $ref: '#/components/schemas/MediaAsset' } }, required: ['media'] }),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `media_not_found:<id>`'),
        500: err500
      }
    },
    delete: {
      tags: ['Media'], summary: 'Elimina asset de BD + bucket R2 (restrict si está referenciado)',
      description: 'Pre-check: si el asset está en `dishes.imageAssetId` o `spaces.hero.imageAssetId`, lanza error 400 con el detalle de counts.',
      responses: {
        200: ok({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }),
        400: errRef('400 Bad Request — `media_in_use:dishes=<N>,spaces=<N>`'),
        401: err401, 403: err403Rest,
        404: errRef('404 Not Found — `media_not_found:<id>`'),
        500: err500
      }
    }
  },
  '/media/{id}/references': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Media'], summary: 'Lista platos y spaces que referencian este asset',
      description: 'Útil para la UI antes de permitir borrar: "no puedes borrar, usado en N platos".',
      responses: {
        200: ok({ $ref: '#/components/schemas/MediaReferences' }),
        401: err401,
        404: errRef('404 Not Found — `media_not_found:<id>`'),
        500: err500
      }
    }
  }
};

export const openApiSpec = {
  openapi: '3.1.0',
  info: BASE_INFO,
  servers: SERVERS,
  tags: [
    { name: 'System', description: 'Health y metadatos' },
    { name: 'Auth', description: 'Sesión (cookie `hs_session`, Lucia + scrypt via @noble/hashes)' },
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
