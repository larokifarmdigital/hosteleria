import { describe, it, expect } from 'vitest';
import { markdownToBlocks } from '../../../packages/content-client/src/markdown.js';
import { toGroupData, toLegalPages, toRestaurantData, toSpaceData } from '../../../packages/content-client/src/fromApi.js';
import { createContentQueries, createImageBuilder } from '../../../packages/content-client/src/index.js';
import { mapLegalPage, mapRestaurant, mapSpace, portableToMarkdown } from '../scripts/sanity-import/map.js';

const s = (es: string, en: string) => [{ _key: 'es', value: es }, { _key: 'en', value: en }];

describe('Markdown de las páginas legales', () => {
  const md = [
    '## Responsable',
    'Escribe a [la agencia](https://aepd.es) con ***calma*** y **firmeza**, *por favor*.',
    '- Primero\n- Segundo',
    '1. Uno\n2. Dos',
    '> Una cita',
    'Fin'
  ].join('\n\n');

  it('ida y vuelta: lo que se guarda es lo que se pinta', () => {
    expect(portableToMarkdown(markdownToBlocks(md))).toBe(md);
  });

  it('da los bloques que espera el pintor de texto enriquecido', () => {
    const blocks = markdownToBlocks('## Título\n\nUn **texto** con [enlace](https://x.cat).\n\n- uno');
    expect(blocks.map(b => [b.style, b.listItem])).toEqual([['h2', undefined], ['normal', undefined], ['normal', 'bullet']]);
    expect(blocks[1].children.map(c => [c.text, c.marks.length])).toEqual([['Un ', 0], ['texto', 1], [' con ', 0], ['enlace', 1], ['.', 0]]);
    expect(blocks[1].markDefs).toEqual([{ _type: 'link', _key: blocks[1].children[3].marks[0], href: 'https://x.cat' }]);
  });
});

// Un documento de Sanity pasa al api (volcado) y vuelve con la forma de Sanity (landing).
const doc = {
  nombre: 'La Prueba', dominio: 'https://laprueba.com', idiomaPorDefecto: 'es', idiomasActivos: ['es', 'en'],
  aceptaReservas: true, mostrarRedes: true, anyoFundacion: 1926,
  direccion: { calle: 'Plaça 1', ciudad: 'Barcelona', barrio: 'Gràcia', pais: 'ES' },
  contacto: { telefono: '+34 930', email: 'a@b.com' },
  redes: { instagram: 'https://instagram.com/x' },
  seoTitulo: s('Título', 'Title'),
  sobreCuerpo: [
    { _key: 'es', value: [{ _type: 'block', children: [{ text: 'Uno' }] }, { _type: 'block', children: [{ text: 'Dos' }] }] },
    { _key: 'en', value: [{ _type: 'block', children: [{ text: 'One' }] }] }
  ],
  gruposDestacados: [{ _key: 'gd1', texto: s('Hasta 30', 'Up to 30') }],
  gruposFeatures: [{ _key: 'gf1', icon: 'wine', label: s('Bodega', 'Cellar') }],
  faq: [{ _key: 'q1', pregunta: s('¿Sí?', 'Yes?'), respuesta: s('Sí', 'Yes') }],
  textosNav: { linkReservar: s('Reservar', 'Book') },
  textosForm: { exito: s('Hecho', 'Done') },
  textosFooter: { bylineIzq: s('Cocina', 'Cuisine') },
  resumenIA: s('Resumen', 'Summary'),
  precioMedio: 25, formasPago: ['cash'], serviciosExtras: ['grupos']
};
const espacio = {
  _id: 'e1', nombre: 'Sala', slug: { current: 'sala' }, tipo: 'restaurant',
  heroTitulo: s('Cocina', 'Kitchen'), horariosAbierto: s('Abierto hasta {hora}', 'Open until {hora}'),
  horariosSemana: [{ dia: 'Tu', turnos: [{ apertura: '13:00', cierre: '16:00' }] }],
  contactoReserva: { telefono: '930' }
};

function site(over: Record<string, unknown> = {}) {
  const r = mapRestaurant(doc);
  const e = mapSpace(espacio);
  return {
    restaurant: {
      slug: 'prueba', ...r.content, defaultLocale: 'es', activeLocales: ['es', 'en'],
      locales: [{ code: 'es', name: 'Español' }, { code: 'en', name: 'English' }], publishedAt: null, ...over
    },
    spaces: [{
      id: 's1', slug: e.slug, type: e.type, isDefault: true, name: e.name, descriptor: '', coverGradient: '', gallery: [],
      ...e.content, schedule: e.schedule,
      drinkCategories: [{ id: 'k1', name: { es: 'Cafés', en: 'Coffee' }, drinks: [{ id: 'b1', name: { es: 'Espresso', en: 'Espresso' }, note: {}, price: 2.2, imageAssetId: null }] }],
      dishCategories: [{ id: 'c1', name: { es: 'Fríos', en: 'Cold' }, dishes: [{ id: 'd1', name: { es: 'Gildas', en: 'Gildas' }, note: {}, price: 6, imageAssetId: null }] }],
      wineCategories: [{ id: 'w1', name: { es: 'Tintos', en: 'Reds' }, wines: [{ id: 'v1', name: 'Rioja', region: null, note: {}, priceGlass: 4, priceBottle: null }] }]
    }],
    legalPages: [mapLegalPage({
      tipo: 'aviso-legal', titulo: s('Aviso legal', 'Legal notice'), ultimaActualizacion: '2026-08-21',
      contenido: [{ _key: 'es', value: markdownToBlocks('## Titular\n\nTexto') }]
    })!],
    media: {}
  } as any;
}

describe('del api a la forma que consume la landing', () => {
  it('la ficha vuelve igual que estaba en Sanity', () => {
    const { restaurant } = toRestaurantData(site());
    const { idiomaPorDefecto, idiomasActivos, ...rest } = doc;
    expect(restaurant).toMatchObject({ ...rest, _id: 'restaurante-prueba', slug: { current: 'prueba' }, mostrarResenas: false });
    expect(restaurant.idiomaPorDefecto).toEqual({ codigo: 'es', nombre: 'Español' });
    expect(restaurant.idiomasActivos).toEqual([{ codigo: 'es', nombre: 'Español' }, { codigo: 'en', nombre: 'English' }]);
    // Lo vacío no aparece, como en Sanity.
    for (const key of ['logo', 'seoImagen', 'mapaUrl', 'cloudflareAnalyticsToken', 'bloquesHome', 'textosSecciones']) {
      expect(restaurant).not.toHaveProperty(key);
    }
  });

  it('el espacio y su horario', () => {
    const e = toRestaurantData(site()).restaurant.espacios![0];
    expect(e).toMatchObject({
      nombre: 'Sala', slug: { current: 'sala' }, tipo: 'restaurant', heroTitulo: espacio.heroTitulo,
      horariosAbierto: espacio.horariosAbierto, contactoReserva: { telefono: '930' }
    });
    expect(e.horariosSemana).toHaveLength(7);
    expect(e.horariosSemana![1]).toEqual({ dia: 'Tu', turnos: [{ apertura: '13:00', cierre: '16:00' }] });
    expect(e.horariosSemana![6]).toEqual({ dia: 'Su', turnos: [] });
  });

  it('la carta del espacio principal, con cada plato enlazado a su categoría', () => {
    const data = toRestaurantData(site());
    expect(data.dishes).toEqual([{
      _id: 'd1', nombre: s('Gildas', 'Gildas'), precio: 6, orden: 10, activo: true,
      categoria: { _id: 'c1', orden: 10, nombre: s('Fríos', 'Cold') }
    }]);
    expect(data.wines[0]).toMatchObject({ nombre: 'Rioja', precioCopa: 4, categoria: { _id: 'w1' } });
    expect(data.wines[0]).not.toHaveProperty('precioBotella');
    expect(data.drinks).toEqual([{
      _id: 'b1', nombre: s('Espresso', 'Espresso'), precio: 2.2, orden: 10, activo: true,
      categoria: { _id: 'k1', orden: 10, nombre: s('Cafés', 'Coffee') }
    }]);
  });

  it('las páginas legales vuelven con su tipo y su contenido en bloques', () => {
    const [page] = toLegalPages(site());
    expect(page).toMatchObject({ tipo: 'aviso-legal', titulo: s('Aviso legal', 'Legal notice'), ultimaActualizacion: '2026-08-21' });
    expect((page.contenido![0].value as any[]).map(b => b.style)).toEqual(['h2', 'normal']);
  });

  it('las imágenes llevan su URL y el constructor la devuelve', () => {
    const withLogo = site({ branding: { logoAssetId: 'm1' } });
    withLogo.media = { m1: { url: 'https://m.example/logo.webp', width: 500, height: 500, mimeType: 'image/webp', alt: { es: 'Logo' } } };
    const { restaurant } = toRestaurantData(withLogo);
    const img = createImageBuilder();
    expect(img.url(restaurant.logo as never)).toBe('https://m.example/logo.webp');
    expect(img.pngSquare(restaurant.logo as never, 180)).toBe('https://m.example/logo.webp');
    expect(img.url(undefined)).toBeUndefined();
    // Una imagen referenciada que ya no existe no rompe nada: no sale.
    expect(toRestaurantData(site({ branding: { logoAssetId: 'no-esta' } })).restaurant).not.toHaveProperty('logo');
  });
});

describe('grupos con varios espacios', () => {
  it('la portada del grupo y cada espacio por su slug', () => {
    const group = toGroupData(site());
    expect(group.espacios.map(e => e.slug?.current)).toEqual(['sala']);
    const data = toSpaceData(site(), 'sala')!;
    expect(data.espacio.nombre).toBe('Sala');
    expect(data.dishes).toHaveLength(1);
    expect(data.drinks).toHaveLength(1);
    expect(toSpaceData(site(), 'no-existe')).toBeNull();
  });
});

describe('peticiones al api', () => {
  it('una sola por build, y errores que dicen qué hacer', async () => {
    let calls = 0;
    const ok = createContentQueries({
      apiUrl: 'http://api/', slug: 'prueba',
      fetch: (async (url: string) => { calls++; expect(url).toBe('http://api/public/restaurants/prueba'); return new Response(JSON.stringify(site())); }) as never
    });
    await Promise.all([ok.fetchRestaurantData(), ok.fetchLegalPages(), ok.fetchRestaurantData()]);
    expect(calls).toBe(1);

    const missing = createContentQueries({ apiUrl: 'http://api', slug: 'x', fetch: (async () => new Response('{}', { status: 404 })) as never });
    await expect(missing.fetchRestaurantData()).rejects.toThrow(/no se ha publicado nunca/);
    const empty = createContentQueries({ apiUrl: 'http://api', slug: 'x', fetch: (async () => new Response(JSON.stringify({ ...site(), spaces: [] }))) as never });
    await expect(empty.fetchRestaurantData()).rejects.toThrow(/ningún espacio publicado/);
  });
});
