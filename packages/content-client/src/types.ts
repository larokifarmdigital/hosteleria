// Forma del contenido que leen las landings (lo que devuelve `createContentQueries`).
// Los nombres de los tipos van en inglés; los de los campos, en español, porque así los
// usan los componentes de todas las webs.
import type { CampoI18n } from '@hosteleria/i18n-utils';

export type LocaleRef = { codigo: string; nombre: string };

export type Turno = { apertura: string; cierre: string };

export type DayHours = { dia: 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su'; turnos?: Turno[] };

export type ContentImage = { asset?: { _ref?: string; _id?: string; url?: string } } & Record<
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
  heroTitulo?: CampoI18n;
  heroSubtitulo?: CampoI18n;
  heroMetaIzq?: CampoI18n;
  heroMetaDer?: CampoI18n;
  heroNota?: CampoI18n;
  heroCta?: CampoI18n;
  heroImagen?: ContentImage;
  // Manifiesto
  manifiestoEyebrow?: CampoI18n;
  manifiestoTexto?: CampoI18n;
  // Galería
  galeria?: ContentImage[];
  // Horarios
  horariosTitulo?: CampoI18n;
  horariosTexto?: CampoI18n;
  horariosAbierto?: CampoI18n;
  horariosProximaApertura?: CampoI18n;
  horariosCerrado?: CampoI18n;
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
  titulo?: CampoI18n;
  texto?: CampoI18n;
  imagen?: ContentImage;
  ctaTexto?: CampoI18n;
  ctaHref?: string;
};

export type Restaurant = {
  _id: string;
  nombre: string;
  slug?: { current: string };
  dominio?: string;
  logo?: ContentImage;
  favicon?: ContentImage;
  iconoApp?: ContentImage;
  idiomaPorDefecto?: LocaleRef;
  idiomasActivos?: LocaleRef[];
  anyoFundacion?: number;
  espacios?: Espacio[];
  bloquesHome?: BloqueHome[];
  // Sobre nosotros (marca — compartido por todos los espacios)
  sobreEyebrow?: CampoI18n;
  sobreTitulo?: CampoI18n;
  sobreCuerpo?: I18nPortable;
  sobreImagenes?: ContentImage[];
  // Grupos y eventos (compartido)
  gruposEyebrow?: CampoI18n;
  gruposTitulo?: CampoI18n;
  gruposCta?: CampoI18n;
  gruposImagen?: ContentImage;
  gruposDestacados?: Array<{ _key?: string; texto?: CampoI18n }>;
  gruposFeatures?: Array<{
    _key?: string;
    icon: 'users' | 'chef' | 'wine' | 'clock' | 'pin' | 'star';
    label?: CampoI18n;
    texto?: CampoI18n;
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
  textosNav?: Record<string, CampoI18n>;
  textosSecciones?: Record<string, CampoI18n>;
  textosForm?: Record<string, CampoI18n>;
  textosFooter?: Record<string, CampoI18n>;
  seoTitulo?: CampoI18n;
  seoDescripcion?: CampoI18n;
  seoImagen?: ContentImage;
  resumenIA?: CampoI18n;
  aceptaReservas?: boolean;
  precioMedio?: number;
  cloudflareAnalyticsToken?: string;
  formasPago?: string[];
  serviciosExtras?: string[];
  faqEyebrow?: CampoI18n;
  faqTitulo?: CampoI18n;
  faqTituloAcento?: CampoI18n;
  faq?: Array<{
    _key?: string;
    pregunta?: CampoI18n;
    respuesta?: CampoI18n;
  }>;
};

export type WineCategory = { _id: string; nombre?: CampoI18n; orden?: number };

export type Wine = {
  _id: string;
  nombre: string;
  region?: string;
  nota?: CampoI18n;
  precioCopa?: number;
  precioBotella?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18n };
};

export type DishCategory = { _id: string; nombre?: CampoI18n; orden?: number };

export type Dish = {
  _id: string;
  nombre?: CampoI18n;
  nota?: CampoI18n;
  precio?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18n };
};

export type DrinkCategory = { _id: string; nombre?: CampoI18n; orden?: number };

export type Drink = {
  _id: string;
  nombre?: CampoI18n;
  nota?: CampoI18n;
  precio?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18n };
};

export type LegalPageDoc = {
  _id: string;
  tipo: 'aviso-legal' | 'privacidad' | 'cookies';
  titulo?: CampoI18n;
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

/** Lo que acepta el constructor de URLs de imagen: una imagen del contenido o nada. */
export type ImageSource = ContentImage | null | undefined;

export type ImageBuilder = {
  /** URL de la imagen, o undefined si no hay. */
  url(source: ImageSource): string | undefined;
  /** URL con ancho concreto. */
  width(source: ImageSource, w: number): string | undefined;
  /** PNG cuadrado (favicons, iconos de la app). */
  pngSquare(source: ImageSource, size: number): string | undefined;
};
