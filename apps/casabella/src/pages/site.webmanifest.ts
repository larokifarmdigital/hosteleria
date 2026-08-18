import type { APIRoute } from 'astro';
import { fetchRestaurantData } from '../lib/queries';
import { img } from '../lib/sanity';

export const prerender = true;

/**
 * Genera dinámicamente el manifest PWA con los datos del restaurant en Sanity.
 * Si el icono aún no está subido, usa placeholders en /public.
 */
export const GET: APIRoute = async () => {
  const { restaurant } = await fetchRestaurantData();
  const iconoApp = restaurant.iconoApp;
  const theme = restaurant.colorMarca ?? '#d2622a';
  const shortName = restaurant.nombre.split(' ').pop() ?? restaurant.nombre;

  const icons = iconoApp
    ? [
        { src: img.pngSquare(iconoApp, 192)!, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: img.pngSquare(iconoApp, 512)!, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: img.pngSquare(iconoApp, 512)!, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];

  const manifest = {
    name: restaurant.nombre,
    short_name: shortName,
    description: restaurant.nombre,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: restaurant.idiomaPorDefecto?.codigo ?? 'es',
    background_color: '#f5f1e8',
    theme_color: theme,
    icons,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  });
};
