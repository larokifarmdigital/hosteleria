// Deja «pruebas» sin fotos: portada y platos sin imagen, y borra todas las imágenes.
// Para después de las pruebas de imágenes, que suben fotos reales y no limpian solas.
const S = process.env.S;
const api = require('./api.cjs')(S + '/admin.json');
const SPACE = 'fnnv25hq7v7k4gvs04wqsk3x';
const HERO = { title: { en: 'Market cooking,', es: 'Cocina de mercado,' }, subtitle: { es: 'coctelería de autor' } };
(async () => {
  const r = await api('PATCH', `/restaurants/pruebas/spaces/${SPACE}`, { hero: HERO, gallery: [], state: 'draft' });
  for (const d of (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes) if (d.imageAssetId) await api('PATCH', `/dishes/${d.id}`, { imageAssetId: null });
  for (const m of (await api('GET', '/media?restaurantSlug=pruebas')).body.media) {
    const x = await api('DELETE', `/media/${m.id}`);
    if (x.status !== 200) console.log('no se pudo borrar', m.name, JSON.stringify(x.body));
  }
  const left = (await api('GET', '/media?restaurantSlug=pruebas')).body.media.length;
  const tasks = (await api('GET', '/restaurants/pruebas/pending')).body.tasks.map(x => x.type + ':' + x.target.kind + (x.target.menu ? ':' + x.target.menu : '') + (x.count ? '=' + x.count : ''));
  console.log('«pruebas» limpio:', r.status === 200 && left === 0, '· fotos:', left, '· pendientes:', tasks.join(' '));
})();
