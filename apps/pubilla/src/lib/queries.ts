import type { CampoI18nSanity } from '@hosteleria/i18n-utils';
import { sanity } from './sanity';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'pubilla';

// ─────────────────────────────────────────────────────────────────────────────
// Types (subset — solo lo que consume la landing)
// ─────────────────────────────────────────────────────────────────────────────

export type IdiomaRef = { codigo: string; nombre: string };

export type Turno = { apertura: string; cierre: string };
export type DiaHorario = { dia: 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su'; turnos?: Turno[] };

export type SanityImg = { asset?: { _ref?: string; _id?: string; url?: string } } & Record<string, unknown>;

export type PortableBlock = { _type: string; children?: { text?: string }[] };
export type I18nPortable = { _key: string; value?: PortableBlock[] }[] | null | undefined;

export type Restaurante = {
  _id: string;
  nombre: string;
  slug?: { current: string };
  dominio?: string;
  logo?: SanityImg;
  favicon?: SanityImg;
  iconoApp?: SanityImg;
  idiomaPorDefecto?: IdiomaRef;
  idiomasActivos?: IdiomaRef[];
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
  // Sobre
  sobreEyebrow?: CampoI18nSanity;
  sobreTitulo?: CampoI18nSanity;
  sobreCuerpo?: I18nPortable;
  sobreImagenes?: SanityImg[];
  // Galería
  galeria?: SanityImg[];
  // Grupos
  gruposEyebrow?: CampoI18nSanity;
  gruposTitulo?: CampoI18nSanity;
  gruposCta?: CampoI18nSanity;
  gruposImagen?: SanityImg;
  // Horarios
  horariosTitulo?: CampoI18nSanity;
  horariosTexto?: CampoI18nSanity;
  horariosAbierto?: CampoI18nSanity;
  horariosProximaApertura?: CampoI18nSanity;
  horariosCerrado?: CampoI18nSanity;
  horariosSemana?: DiaHorario[];
  // Contacto
  direccion?: {
    calle?: string;
    codigoPostal?: string;
    ciudad?: string;
    provincia?: string;
    barrio?: string;
    pais?: string;
  };
  contacto?: { telefono?: string; whatsapp?: string; email?: string; web?: string };
  redes?: { instagram?: string; facebook?: string; tiktok?: string };
  // Textos UI
  textosUi?: {
    nav?: Record<string, CampoI18nSanity>;
    secciones?: Record<string, CampoI18nSanity>;
    form?: Record<string, CampoI18nSanity>;
    footer?: Record<string, CampoI18nSanity>;
  };
  // SEO
  seoTitulo?: CampoI18nSanity;
  seoDescripcion?: CampoI18nSanity;
  seoImagen?: SanityImg;
};

export type CategoriaVino = { _id: string; nombre?: CampoI18nSanity; orden?: number };
export type Vino = {
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

export type CategoriaPlato = { _id: string; nombre?: CampoI18nSanity; orden?: number };
export type Plato = {
  _id: string;
  nombre?: CampoI18nSanity;
  nota?: CampoI18nSanity;
  precio?: number;
  orden?: number;
  activo?: boolean;
  categoria?: { _id: string; orden?: number; nombre?: CampoI18nSanity };
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANTE_QUERY = /* groq */ `
  *[_type == "restaurante" && slug.current == $slug][0]{
    ...,
    "idiomaPorDefecto": idiomaPorDefecto->{codigo, nombre},
    "idiomasActivos": idiomasActivos[]->{codigo, nombre}
  }
`;

const CATEGORIAS_VINO_QUERY = /* groq */ `
  *[_type == "categoriaVino" && restaurante._ref == $rid] | order(orden asc)
`;

const VINOS_QUERY = /* groq */ `
  *[_type == "vino" && restaurante._ref == $rid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

const CATEGORIAS_PLATO_QUERY = /* groq */ `
  *[_type == "categoriaPlato" && restaurante._ref == $rid] | order(orden asc)
`;

const PLATOS_QUERY = /* groq */ `
  *[_type == "plato" && restaurante._ref == $rid && activo == true]{
    ...,
    "categoria": categoria->{_id, orden, nombre}
  } | order(categoria->orden asc, orden asc)
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fetchers
// ─────────────────────────────────────────────────────────────────────────────

export type DataRestaurante = {
  restaurante: Restaurante;
  categoriasVino: CategoriaVino[];
  vinos: Vino[];
  categoriasPlato: CategoriaPlato[];
  platos: Plato[];
};

export async function fetchDataRestaurante(): Promise<DataRestaurante> {
  const restaurante = await sanity.fetch<Restaurante | null>(RESTAURANTE_QUERY, {
    slug: RESTAURANT_SLUG,
  });
  if (!restaurante) {
    throw new Error(
      `Restaurante '${RESTAURANT_SLUG}' no encontrado en Sanity. Crea el doc en el Studio o corre 'pnpm --filter studio run seed'.`,
    );
  }
  const [categoriasVino, vinos, categoriasPlato, platos] = await Promise.all([
    sanity.fetch<CategoriaVino[]>(CATEGORIAS_VINO_QUERY, { rid: restaurante._id }),
    sanity.fetch<Vino[]>(VINOS_QUERY, { rid: restaurante._id }),
    sanity.fetch<CategoriaPlato[]>(CATEGORIAS_PLATO_QUERY, { rid: restaurante._id }),
    sanity.fetch<Plato[]>(PLATOS_QUERY, { rid: restaurante._id }),
  ]);
  return { restaurante, categoriasVino, vinos, categoriasPlato, platos };
}
