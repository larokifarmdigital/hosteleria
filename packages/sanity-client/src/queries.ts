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
  heroTitulo?: CampoI18nSanity;
  heroSubtitulo?: CampoI18nSanity;
  heroMetaIzq?: CampoI18nSanity;
  heroMetaDer?: CampoI18nSanity;
  heroNota?: CampoI18nSanity;
  heroCta?: CampoI18nSanity;
  heroImagen?: SanityImg;
  manifiestoEyebrow?: CampoI18nSanity;
  manifiestoTexto?: CampoI18nSanity;
  sobreEyebrow?: CampoI18nSanity;
  sobreTitulo?: CampoI18nSanity;
  sobreCuerpo?: I18nPortable;
  sobreImagenes?: SanityImg[];
  galeria?: SanityImg[];
  gruposEyebrow?: CampoI18nSanity;
  gruposTitulo?: CampoI18nSanity;
  gruposCta?: CampoI18nSanity;
  gruposImagen?: SanityImg;
  gruposDestacados?: Array<{ _key?: string; texto?: CampoI18nSanity }>;
  horariosTitulo?: CampoI18nSanity;
  horariosTexto?: CampoI18nSanity;
  horariosAbierto?: CampoI18nSanity;
  horariosProximaApertura?: CampoI18nSanity;
  horariosCerrado?: CampoI18nSanity;
  horariosSemana?: DayHours[];
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

export type LegalPageDoc = {
  _id: string;
  tipo: 'aviso-legal' | 'privacidad' | 'cookies';
  titulo?: CampoI18nSanity;
  contenido?: Array<{ _key: string; value?: unknown[] }>;
  ultimaActualizacion?: string;
  orden?: number;
};

export type RestaurantData = {
  restaurant: Restaurant;
  wineCategories: WineCategory[];
  wines: Wine[];
  dishCategories: DishCategory[];
  dishes: Dish[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries GROQ
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANT_QUERY = /* groq */ `
  *[_type == "restaurante" && slug.current == $slug][0]{
    ...,
    "idiomaPorDefecto": idiomaPorDefecto->{codigo, nombre},
    "idiomasActivos": idiomasActivos[]->{codigo, nombre}
  }
`;

const WINE_CATEGORIES_QUERY = /* groq */ `
  *[_type == "categoriaVino" && restaurante._ref == $rid] | order(orden asc)
`;

const WINES_QUERY = /* groq */ `
  *[_type == "vino" && restaurante._ref == $rid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

const DISH_CATEGORIES_QUERY = /* groq */ `
  *[_type == "categoriaPlato" && restaurante._ref == $rid] | order(orden asc)
`;

const DISHES_QUERY = /* groq */ `
  *[_type == "plato" && restaurante._ref == $rid && activo == true]{
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

export type RestaurantQueries = {
  fetchRestaurantData(): Promise<RestaurantData>;
  fetchLegalPages(restaurantId: string): Promise<LegalPageDoc[]>;
};

export function crearRestaurantQueries(client: SanityClient, slug: string): RestaurantQueries {
  return {
    async fetchRestaurantData() {
      const restaurant = await client.fetch<Restaurant | null>(RESTAURANT_QUERY, { slug });
      if (!restaurant) {
        throw new Error(
          `Restaurante '${slug}' no encontrado en Sanity. Crea el doc en el Studio o corre 'pnpm --filter studio run seed'.`
        );
      }
      const [wineCategories, wines, dishCategories, dishes] = await Promise.all([
        client.fetch<WineCategory[]>(WINE_CATEGORIES_QUERY, { rid: restaurant._id }),
        client.fetch<Wine[]>(WINES_QUERY, { rid: restaurant._id }),
        client.fetch<DishCategory[]>(DISH_CATEGORIES_QUERY, { rid: restaurant._id }),
        client.fetch<Dish[]>(DISHES_QUERY, { rid: restaurant._id })
      ]);
      return { restaurant, wineCategories, wines, dishCategories, dishes };
    },
    async fetchLegalPages(restaurantId: string) {
      return client.fetch<LegalPageDoc[]>(LEGAL_PAGES_QUERY, { rid: restaurantId });
    }
  };
}
