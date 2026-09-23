import type { CampoI18nSanity } from '@hosteleria/i18n-utils';
import type { SanityClient } from '@sanity/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types (subset — solo lo que consume la landing)
// Nota: los NOMBRES de types son inglés; los NOMBRES DE CAMPOS dentro reflejan
// literalmente las keys del doc Sanity (español) porque GROQ las devuelve así.
// ─────────────────────────────────────────────────────────────────────────────

export type LocaleRef = { codigo: string; nombre: string };

export type Turno = { apertura: string; cierre: string };
export type DayHours = { dia: 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su'; turnos?: Turno[] };

export type SanityImg = { asset?: { _ref?: string; _id?: string; url?: string } } & Record<
  string,
  unknown
>;

export type PortableBlock = { _type: string; children?: { text?: string }[] };
export type I18nPortable = { _key: string; value?: PortableBlock[] }[] | null | undefined;

/**
 * Un "espacio" es una experiencia concreta dentro de un restaurante/grupo
 * (Restaurant, Café, Coctelería, Club, Terraza…). Cada restaurante tiene 1+
 * espacios en `restaurant.espacios[]`. Los campos hero/manifiesto/sobre/
 * galería/grupos/horarios viven aquí, no en el restaurante.
 */
export type Espacio = {
  _id: string;
  nombre: string;
  slug?: { current: string };
  tipo?: 'restaurant' | 'cafe' | 'coctel' | 'club' | 'terraza' | 'live_music' | 'otro';
  orden?: number;
  // Hero
  heroTitulo?: CampoI18nSanity;
  heroSubtitulo?: CampoI18nSanity;
  heroMetaIzq?: CampoI18nSanity;
  heroMetaDer?: CampoI18nSanity;
  heroNota?: CampoI18nSanity;
  heroCta?: CampoI18nSanity;
  heroImagen?: SanityImg;
  // Manifiesto
  manifiestoEyebrow?: CampoI18nSanity;
  manifiestoTexto?: CampoI18nSanity;
  // Galería
  galeria?: SanityImg[];
  // Horarios
  horariosTitulo?: CampoI18nSanity;
  horariosTexto?: CampoI18nSanity;
  horariosAbierto?: CampoI18nSanity;
  horariosProximaApertura?: CampoI18nSanity;
  horariosCerrado?: CampoI18nSanity;
  horariosSemana?: DayHours[];
  // Contacto propio del espacio (opcional; fallback al del restaurante)
  direccion?: {
    calle?: string;
    codigoPostal?: string;
    ciudad?: string;
    provincia?: string;
    barrio?: string;
    pais?: string;
  };
  mapaUrl?: string;
  contactoReserva?: { telefono?: string; whatsapp?: string; email?: string };
};

/**
 * Bloque destacado del home. Opcional; el hub renderiza N cards en grid
 * adaptativo. Si el array está vacío o ausente, la sección no se muestra.
 */
export type BloqueHome = {
  _key?: string;
  titulo?: CampoI18nSanity;
  texto?: CampoI18nSanity;
  imagen?: SanityImg;
  ctaTexto?: CampoI18nSanity;
  ctaHref?: string;
};

export type Restaurant = {
  _id: string;
  nombre: string;
  slug?: { current: string };
  dominio?: string;
  logo?: SanityImg;
  favicon?: SanityImg;
  iconoApp?: SanityImg;
  idiomaPorDefecto?: LocaleRef;
  idiomasActivos?: LocaleRef[];
  anyoFundacion?: number;
  espacios?: Espacio[];
  bloquesHome?: BloqueHome[];
  // Sobre nosotros (marca — compartido por todos los espacios)
  sobreEyebrow?: CampoI18nSanity;
  sobreTitulo?: CampoI18nSanity;
  sobreCuerpo?: I18nPortable;
  sobreImagenes?: SanityImg[];
  // Grupos y eventos (compartido)
  gruposEyebrow?: CampoI18nSanity;
  gruposTitulo?: CampoI18nSanity;
  gruposCta?: CampoI18nSanity;
  gruposImagen?: SanityImg;
  gruposDestacados?: Array<{ _key?: string; texto?: CampoI18nSanity }>;
  gruposFeatures?: Array<{
    _key?: string;
    icon: 'users' | 'chef' | 'wine' | 'clock' | 'pin' | 'star';
    label?: CampoI18nSanity;
    texto?: CampoI18nSanity;
  }>;
  direccion?: {
    calle?: string;
    codigoPostal?: string;
    ciudad?: string;
    provincia?: string;
    barrio?: string;
    pais?: string;
  };
  contacto?: { telefono?: string; whatsapp?: string; email?: string; web?: string };
  mapaUrl?: string;
  mostrarRedes?: boolean;
  redes?: { instagram?: string; facebook?: string; tiktok?: string };
  mostrarResenas?: boolean;
  textosNav?: Record<string, CampoI18nSanity>;
  textosSecciones?: Record<string, CampoI18nSanity>;
  textosForm?: Record<string, CampoI18nSanity>;
  textosFooter?: Record<string, CampoI18nSanity>;
  seoTitulo?: CampoI18nSanity;
  seoDescripcion?: CampoI18nSanity;
  seoImagen?: SanityImg;
  resumenIA?: CampoI18nSanity;
  aceptaReservas?: boolean;
  precioMedio?: number;
  cloudflareAnalyticsToken?: string;
  formasPago?: string[];
  serviciosExtras?: string[];
  faqEyebrow?: CampoI18nSanity;
  faqTitulo?: CampoI18nSanity;
  faqTituloAcento?: CampoI18nSanity;
  faq?: Array<{
    _key?: string;
    pregunta?: CampoI18nSanity;
    respuesta?: CampoI18nSanity;
  }>;
};

export type WineCategory = { _id: string; nombre?: CampoI18nSanity; orden?: number };
export type Wine = {
  _id: string;
  nombre: string;
  region?: string;
  nota?: CampoI18nSanity;
  precioCopa?: number;
  precioBotella?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18nSanity };
};

export type DishCategory = { _id: string; nombre?: CampoI18nSanity; orden?: number };
export type Dish = {
  _id: string;
  nombre?: CampoI18nSanity;
  nota?: CampoI18nSanity;
  precio?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18nSanity };
};

export type DrinkCategory = { _id: string; nombre?: CampoI18nSanity; orden?: number };
export type Drink = {
  _id: string;
  nombre?: CampoI18nSanity;
  nota?: CampoI18nSanity;
  precio?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18nSanity };
};

export type LegalPageDoc = {
  _id: string;
  tipo: 'aviso-legal' | 'privacidad' | 'cookies';
  titulo?: CampoI18nSanity;
  contenido?: Array<{ _key: string; value?: unknown[] }>;
  ultimaActualizacion?: string;
  orden?: number;
};

/**
 * Datos completos de un restaurante para una landing.
 * - `restaurant.espacios[]` está siempre poblado (mín. 1 espacio).
 * - `wineCategories/wines/dishCategories/dishes` son los del **espacio principal**
 *   (`restaurant.espacios[0]`), para mantener el flujo simple del caso más
 *   común (restaurante mono-espacio). Landings multi-espacio consultan por
 *   espacio con `fetchEspacioMenu(espacioId)`.
 */
export type RestaurantData = {
  restaurant: Restaurant;
  wineCategories: WineCategory[];
  wines: Wine[];
  dishCategories: DishCategory[];
  dishes: Dish[];
  drinkCategories: DrinkCategory[];
  drinks: Drink[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries GROQ
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANT_QUERY = /* groq */ `
  *[_type == "restaurante" && slug.current == $slug][0]{
    ...,
    "idiomaPorDefecto": idiomaPorDefecto->{codigo, nombre},
    "idiomasActivos": idiomasActivos[]->{codigo, nombre},
    "espacios": espacios[]->{ ... } | order(orden asc)
  }
`;

const WINE_CATEGORIES_QUERY = /* groq */ `
  *[_type == "categoriaVino" && espacio._ref == $eid] | order(orden asc)
`;

const WINES_QUERY = /* groq */ `
  *[_type == "vino" && espacio._ref == $eid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

const DISH_CATEGORIES_QUERY = /* groq */ `
  *[_type == "categoriaPlato" && espacio._ref == $eid] | order(orden asc)
`;

const DISHES_QUERY = /* groq */ `
  *[_type == "plato" && espacio._ref == $eid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

const DRINK_CATEGORIES_QUERY = /* groq */ `
  *[_type == "categoriaBebida" && espacio._ref == $eid] | order(orden asc)
`;

const DRINKS_QUERY = /* groq */ `
  *[_type == "bebida" && espacio._ref == $eid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

const LEGAL_PAGES_QUERY = /* groq */ `
  *[_type == "paginaLegal" && restaurante._ref == $rid] | order(orden asc)
`;

// ─────────────────────────────────────────────────────────────────────────────
// Factory de fetchers — cada app instancia con su client + slug
// ─────────────────────────────────────────────────────────────────────────────

export type EspacioMenu = {
  wineCategories: WineCategory[];
  wines: Wine[];
  dishCategories: DishCategory[];
  dishes: Dish[];
  drinkCategories: DrinkCategory[];
  drinks: Drink[];
};

/**
 * Datos completos para una landing multi-espacio, para una URL como
 * `/apotheke`, `/sala`, etc. Contiene el `restaurant` (grupo) con TODOS sus
 * espacios (para el nav cross-espacio) y el `espacio` concreto seleccionado
 * junto con su menú (cartas filtradas por ese espacio).
 */
export type EspacioData = {
  restaurant: Restaurant;
  espacio: Espacio;
  wineCategories: WineCategory[];
  wines: Wine[];
  dishCategories: DishCategory[];
  dishes: Dish[];
  drinkCategories: DrinkCategory[];
  drinks: Drink[];
};

/** Datos ligeros para el hub del grupo — solo restaurante + lista de espacios, sin cartas. */
export type GrupoData = {
  restaurant: Restaurant;
  espacios: Espacio[];
};

export type RestaurantQueries = {
  fetchRestaurantData(): Promise<RestaurantData>;
  fetchLegalPages(restaurantId: string): Promise<LegalPageDoc[]>;
  fetchEspacioMenu(espacioId: string): Promise<EspacioMenu>;
  /** Trae restaurante + todos sus espacios (sin cartas). Para el hub del grupo. */
  fetchGrupoData(): Promise<GrupoData>;
  /**
   * Trae restaurante + el espacio con `slug.current === espacioSlug` + su menú.
   * Para landings de espacio en grupos multi-espacio (Ocaña).
   */
  fetchEspacioBySlug(espacioSlug: string): Promise<EspacioData>;
};

async function fetchEspacioMenuFor(
  client: SanityClient,
  espacioId: string
): Promise<EspacioMenu> {
  const [wineCategories, wines, dishCategories, dishes, drinkCategories, drinks] =
    await Promise.all([
      client.fetch<WineCategory[]>(WINE_CATEGORIES_QUERY, { eid: espacioId }),
      client.fetch<Wine[]>(WINES_QUERY, { eid: espacioId }),
      client.fetch<DishCategory[]>(DISH_CATEGORIES_QUERY, { eid: espacioId }),
      client.fetch<Dish[]>(DISHES_QUERY, { eid: espacioId }),
      client.fetch<DrinkCategory[]>(DRINK_CATEGORIES_QUERY, { eid: espacioId }),
      client.fetch<Drink[]>(DRINKS_QUERY, { eid: espacioId })
    ]);
  return { wineCategories, wines, dishCategories, dishes, drinkCategories, drinks };
}

export function crearRestaurantQueries(client: SanityClient, slug: string): RestaurantQueries {
  return {
    async fetchRestaurantData() {
      const restaurant = await client.fetch<Restaurant | null>(RESTAURANT_QUERY, { slug });
      if (!restaurant) {
        throw new Error(
          `Restaurante '${slug}' no encontrado en Sanity. Crea el doc en el Studio o corre 'pnpm --filter studio run seed'.`
        );
      }
      const espacioPrincipal = restaurant.espacios?.[0];
      if (!espacioPrincipal) {
        throw new Error(
          `Restaurante '${slug}' no tiene ningún espacio asociado. ` +
            `El campo 'espacios[]' del restaurante está vacío o el espacio no existe. ` +
            `Arréglalo con:\n` +
            `  1) Desde el Studio: crea/asocia un doc 'espacio' al restaurante, o\n` +
            `  2) Si tienes un seed específico (p. ej. Casabella), ejecuta ` +
            `'pnpm --filter studio run seed:<slug>' — restaura la relación bidireccional ` +
            `restaurante ↔ espacio sin tocar imágenes ni cartas.`
        );
      }
      const menu = await fetchEspacioMenuFor(client, espacioPrincipal._id);
      return { restaurant, ...menu };
    },
    async fetchLegalPages(restaurantId: string) {
      return client.fetch<LegalPageDoc[]>(LEGAL_PAGES_QUERY, { rid: restaurantId });
    },
    async fetchEspacioMenu(espacioId: string) {
      return fetchEspacioMenuFor(client, espacioId);
    },
    async fetchGrupoData() {
      const restaurant = await client.fetch<Restaurant | null>(RESTAURANT_QUERY, { slug });
      if (!restaurant) {
        throw new Error(
          `Restaurante '${slug}' no encontrado en Sanity. Crea el doc en el Studio o corre 'pnpm --filter studio run seed'.`
        );
      }
      const espacios = restaurant.espacios ?? [];
      if (espacios.length === 0) {
        throw new Error(
          `Restaurante '${slug}' no tiene espacios. Un hub multi-espacio necesita 2+ espacios; el modelo single-espacio usa fetchRestaurantData().`
        );
      }
      return { restaurant, espacios };
    },
    async fetchEspacioBySlug(espacioSlug: string) {
      const restaurant = await client.fetch<Restaurant | null>(RESTAURANT_QUERY, { slug });
      if (!restaurant) {
        throw new Error(
          `Restaurante '${slug}' no encontrado en Sanity.`
        );
      }
      const espacio = restaurant.espacios?.find(e => e.slug?.current === espacioSlug);
      if (!espacio) {
        const disponibles = (restaurant.espacios ?? [])
          .map(e => e.slug?.current)
          .filter(Boolean)
          .join(', ');
        throw new Error(
          `Espacio '${espacioSlug}' no encontrado en '${slug}'. Disponibles: ${disponibles || '(ninguno)'}`
        );
      }
      const menu = await fetchEspacioMenuFor(client, espacio._id);
      return { restaurant, espacio, ...menu };
    }
  };
}
