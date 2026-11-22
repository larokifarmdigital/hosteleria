import { describe, it, expect } from 'vitest';
import {
  canonical, domainOf, i18n, mapDish, mapLegalPage, mapRestaurant, mapSpace, mapWine,
  portableToMarkdown, portableToPlain
} from '../scripts/sanity-import/map.js';

const s = (es: string, en?: string) => [
  { _key: 'es', value: es },
  ...(en === undefined ? [] : [{ _key: 'en', value: en }])
];
const block = (text: string, extra: Record<string, unknown> = {}) => ({
  _type: 'block', style: 'normal', markDefs: [], children: [{ _type: 'span', text, marks: [] }], ...extra
});

describe('textos por idioma', () => {
  it('pasa de lista a objeto y salta los idiomas vacíos', () => {
    expect(i18n([{ _key: 'es', value: 'Hola' }, { _key: 'en', value: '  ' }, { _key: 'ca' }])).toEqual({ es: 'Hola' });
    expect(i18n(undefined)).toEqual({});
  });
});

describe('texto enriquecido', () => {
  it('a texto plano: un párrafo por bloque', () => {
    expect(portableToPlain([block('Uno. '), block(''), block('Dos.')])).toBe('Uno.\n\nDos.');
  });

  it('a Markdown: títulos, listas, negrita, cursiva y enlaces', () => {
    const md = portableToMarkdown([
      block('Responsable', { style: 'h2' }),
      {
        _type: 'block', style: 'normal', markDefs: [{ _key: 'l1', _type: 'link', href: 'https://aepd.es' }],
        children: [
          { _type: 'span', text: 'Escribe a ', marks: [] },
          { _type: 'span', text: 'la agencia ', marks: ['l1'] },
          { _type: 'span', text: 'con ', marks: [] },
          { _type: 'span', text: 'calma', marks: ['strong', 'em'] }
        ]
      },
      block('Primero', { listItem: 'bullet', level: 1 }),
      block('Segundo', { listItem: 'bullet', level: 1 }),
      block('Fin'),
      block('Uno', { listItem: 'number' }),
      block('Dos', { listItem: 'number' })
    ]);
    expect(md).toBe([
      '## Responsable',
      'Escribe a [la agencia](https://aepd.es) con ***calma***',
      '- Primero\n- Segundo',
      'Fin',
      '1. Uno\n2. Dos'
    ].join('\n\n'));
  });

  it('avisa de lo que no sabe traducir', () => {
    const warnings: string[] = [];
    portableToMarkdown([{ _type: 'image' }, block('x', { style: 'raro' })], m => warnings.push(m));
    expect(warnings).toHaveLength(2);
  });
});

describe('restaurante', () => {
  const doc = {
    nombre: 'La Prueba', dominio: 'https://laprueba.com/', idiomaPorDefecto: 'es', idiomasActivos: ['es', 'en'],
    aceptaReservas: true, mostrarRedes: true, anyoFundacion: 1926,
    cloudflareAnalyticsToken: '[COMPLETAR - pegar token]',
    direccion: { calle: 'Plaça 1', ciudad: 'Barcelona', barrio: 'Gràcia', pais: 'ES' },
    contacto: { telefono: '+34 930', email: 'a@b.com' },
    redes: { instagram: 'https://instagram.com/x' },
    seoTitulo: s('Título', 'Title'),
    sobreTitulo: s('Historia', 'Story'),
    sobreCuerpo: [{ _key: 'es', value: [block('Uno'), block('Dos')] }, { _key: 'en', value: [block('One')] }],
    gruposDestacados: [{ _key: 'gd1', texto: s('Hasta 30', 'Up to 30') }],
    gruposFeatures: [{ _key: 'gf1', icon: 'wine', label: s('Bodega') }, { _key: 'gf2', icon: 'cohete', label: s('No') }],
    faq: [{ _key: 'q1', pregunta: s('¿Sí?', 'Yes?'), respuesta: s('Sí', 'Yes') }],
    textosNav: { linkReservar: s('Reservar', 'Book'), linkInventado: s('x') },
    textosSecciones: { vinosNotaFinal: s('Pregunta') },
    textosForm: { exito: s('Hecho'), labelComensales: s('Comensales') },
    textosFooter: { colContacto: s('Contacto'), bylineIzq: s('Cocina') },
    resumenIA: s('Resumen'),
    precioMedio: 25, formasPago: ['cash', 'trueque'], serviciosExtras: ['grupos'],
    logo: { asset: { _ref: 'image-1' } }
  };

  it('traduce cada campo a su sitio en el api', () => {
    const warnings: string[] = [];
    const r = mapRestaurant(doc, m => warnings.push(m));
    expect(r.defaultLocaleCode).toBe('es');
    expect(r.activeLocaleCodes).toEqual(['es', 'en']);
    expect(r.content).toMatchObject({
      name: 'La Prueba', domain: 'laprueba.com', acceptsBookings: true, showSocials: true, showReviews: false,
      foundedYear: 1926, analyticsToken: null, mapUrl: null,
      address: { street: 'Plaça 1', city: 'Barcelona', district: 'Gràcia', country: 'ES' },
      contact: { phone: '+34 930', email: 'a@b.com' },
      socials: { instagram: 'https://instagram.com/x' },
      seo: { title: { es: 'Título', en: 'Title' } },
      about: { title: { es: 'Historia', en: 'Story' }, body: { es: 'Uno\n\nDos', en: 'One' } },
      groups: {
        highlights: [{ id: 'gd1', text: { es: 'Hasta 30', en: 'Up to 30' } }],
        features: [{ id: 'gf1', icon: 'wine', label: { es: 'Bodega' } }]
      },
      faq: { items: [{ id: 'q1', question: { es: '¿Sí?', en: 'Yes?' }, answer: { es: 'Sí', en: 'Yes' } }] },
      uiTexts: {
        nav: { book: { es: 'Reservar', en: 'Book' } },
        sections: { winesFootnote: { es: 'Pregunta' } },
        form: { success: { es: 'Hecho' }, labelGuests: { es: 'Comensales' } },
        footer: { contactColumn: { es: 'Contacto' }, byline: { es: 'Cocina' } }
      },
      aiSummary: { es: 'Resumen' },
      business: { averagePrice: 25, paymentMethods: ['cash'], extraServices: ['grupos'] },
      homeBlocks: []
    });
    expect(warnings).toEqual([
      'imagen sin copiar: logo',
      'el token de analítica es un texto de relleno: se deja vacío',
      'ventaja de grupos 2: icono «cohete» que el api no conoce; no se copia',
      'texto de interfaz sin sitio en el api: textosNav.linkInventado',
      'formas de pago: valor «trueque» que el api no conoce'
    ]);
  });

  it('un documento casi vacío da bloques vacíos, no errores', () => {
    const r = mapRestaurant({ nombre: 'X', idiomasActivos: ['es'] });
    expect(r.defaultLocaleCode).toBe('es');
    expect(r.content).toMatchObject({ about: {}, groups: {}, faq: {}, uiTexts: {}, seo: {}, business: {}, contact: {}, foundedYear: null });
  });

  it('el dominio se guarda sin protocolo', () => {
    expect(domainOf('http://x.cat')).toBe('x.cat');
    expect(domainOf('x.cat')).toBe('x.cat');
    expect(domainOf('')).toBeUndefined();
  });
});

describe('espacio y carta', () => {
  it('el espacio trae portada, textos y el horario de los siete días', () => {
    const e = mapSpace({
      _id: 'e1', nombre: 'Sala', slug: { current: 'sala' }, tipo: 'club',
      heroTitulo: s('Cocina', 'Kitchen'), horariosAbierto: s('Abierto hasta {hora}'),
      horariosSemana: [{ dia: 'Tu', turnos: [{ apertura: '13:00', cierre: '16:00' }, { apertura: '20:00' }] }],
      contactoReserva: { telefono: '930' }
    });
    expect(e).toMatchObject({
      sourceId: 'e1', slug: 'sala', name: 'Sala', type: 'club',
      content: {
        hero: { title: { es: 'Cocina', en: 'Kitchen' } }, manifesto: {},
        scheduleTexts: { open: { es: 'Abierto hasta {hora}' } }, address: {}, mapUrl: null, bookingContact: { phone: '930' }
      }
    });
    expect(e.schedule.map(d => d.day)).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    expect(e.schedule[1].shifts).toEqual([{ open: '13:00', close: '16:00' }]);
    expect(e.schedule[0].shifts).toEqual([]);
  });

  it('platos y vinos', () => {
    expect(mapDish({ _id: 'p1', categoria: { _ref: 'c1' }, nombre: s('Gildas', 'Gildas'), precio: 6, orden: 20 }, 0)).toEqual({
      sourceId: 'p1', categorySourceId: 'c1', name: { es: 'Gildas', en: 'Gildas' }, note: {}, price: 6, order: 20, active: true
    });
    expect(mapWine({ _id: 'v1', categoria: { _ref: 'c2' }, nombre: 'Riesling', region: 'Mosel', precioCopa: 8, activo: false }, 3)).toEqual({
      sourceId: 'v1', categorySourceId: 'c2', name: 'Riesling', region: 'Mosel', note: {}, priceGlass: 8, priceBottle: null, order: 3, active: false
    });
  });
});

describe('páginas legales', () => {
  it('cambia el tipo y pasa el contenido a Markdown por idioma', () => {
    expect(mapLegalPage({
      tipo: 'aviso-legal', titulo: s('Aviso legal', 'Legal notice'), ultimaActualizacion: '2026-08-21',
      contenido: [{ _key: 'es', value: [block('Titular', { style: 'h2' }), block('Texto')] }]
    })).toEqual({
      type: 'legal-notice', title: { es: 'Aviso legal', en: 'Legal notice' },
      content: { es: '## Titular\n\nTexto' }, lastUpdated: '2026-08-21'
    });
  });

  it('un tipo desconocido no se copia', () => {
    expect(mapLegalPage({ tipo: 'otra' })).toBeNull();
  });
});

describe('comparación', () => {
  it('no depende del orden de las claves', () => {
    expect(canonical({ a: 1, b: { c: [1, { e: 2, d: 1 }] } })).toBe(canonical({ b: { c: [1, { d: 1, e: 2 }] }, a: 1 }));
  });
});
