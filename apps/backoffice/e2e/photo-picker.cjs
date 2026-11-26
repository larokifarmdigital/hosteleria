// Entrega 2: ya no hay «Todas las fotos»; describir y borrar una foto se hace al elegirla (menú «⋯»).
// No pulsa «Sí, borrar».
// Las fotos se simulan en el navegador (GET /api/media y sus referencias): no sube ni borra nada en R2.
const { chromium } = require(process.env.PW);
const S = process.env.S, BASE = process.env.BASE;
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const asset = (id, name, alt) => ({ id, name, r2Key: id, publicUrl: PIXEL, mimeType: 'image/webp', sizeKb: 120, width: 1600, height: 1000, usage: 'unused', hasAltText: !!alt, altText: alt ?? {}, restaurantSlug: 'pruebas', restaurantName: 'Pruebas', uploadedBy: null, createdAt: '2026-11-20T10:00:00.000Z' });

(async () => {
  const browser = await chromium.launch();
  const audit = async (p, name) => {
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE }) => {
      const r = await axe.run(document, AXE);
      return r.violations.filter(v => v.id !== 'region').map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; '));
    }, { AXE });
    check(`auditoría: ${name}`, res.length === 0, res);
  };
  const patches = [];
  try {
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const media = [asset('aaaaaaaaaaaaaaaaaaaaaaaa', 'terraza-noche.webp', { es: 'Terraza de noche', ca: 'Terrassa de nit', en: 'Terrace at night' }), asset('bbbbbbbbbbbbbbbbbbbbbbbb', 'barra.webp', null)];
    await p.route(/\/api\/media(\?.*)?$/, r => r.request().method() === 'GET' ? r.fulfill({ json: { media } }) : r.continue());
    await p.route(/\/api\/media\/[a-z]+\/references$/, r => r.fulfill({ json: { dishes: [], spaces: [], galleries: [], restaurant: [] } }));
    await p.route(/\/api\/media\/[a-z]+$/, r => {
      const m = r.request().method();
      if (m === 'PATCH') { patches.push(r.request().postDataJSON()); const a = media[1]; return r.fulfill({ json: { asset: { ...a, ...r.request().postDataJSON(), hasAltText: true } } }); }
      return r.continue();
    });

    await p.goto(`${BASE}/restaurants/pruebas?s=cover`);
    check('«Todas las fotos» ya no está en el menú', (await p.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /fotos$/i }).allInnerTexts()).every(t => !/Todas las fotos/.test(t)));
    await p.getByRole('button', { name: 'Elegir foto' }).first().click();
    const dialog = p.getByRole('dialog');
    await dialog.getByRole('heading', { name: 'Elegir foto' }).waitFor();
    const more = dialog.getByRole('button', { name: 'Más acciones: Terraza de noche' });
    check('cada foto tiene su menú «⋯»', await more.isVisible() && await dialog.getByRole('button', { name: /^Más acciones: barra/ }).isVisible());
    await audit(p, 'elegir foto con el menú de cada una');
    await more.click();
    const items = await p.getByRole('menuitem').allInnerTexts();
    check('el menú ofrece cambiar la descripción y borrar', JSON.stringify(items) === JSON.stringify(['Cambiar la descripción', 'Borrar']), items);
    await p.getByRole('menuitem', { name: 'Borrar' }).click();
    await p.getByRole('heading', { name: '¿Borrar «terraza-noche.webp»?' }).waitFor();
    check('al no usarse, deja borrarla', await p.getByRole('button', { name: 'Sí, borrar' }).isVisible());
    await audit(p, 'confirmar borrar dentro de elegir foto');
    await p.waitForTimeout(300);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    check('cancelar vuelve a las fotos', await dialog.getByRole('heading', { name: 'Elegir foto' }).isVisible());
    await dialog.getByRole('button', { name: /^Más acciones: barra/ }).click();
    check('a una foto sin descripción se le ofrece describirla', await p.getByRole('menuitem', { name: 'Describir' }).isVisible());
    await p.getByRole('menuitem', { name: 'Describir' }).click();
    await dialog.getByRole('heading', { name: 'Describe la foto' }).waitFor();
    check('describir no la usa: el botón solo guarda', await dialog.getByRole('button', { name: 'Guardar descripción' }).isVisible());
    await audit(p, 'describir una foto desde elegir foto');
    await dialog.getByRole('button', { name: 'Volver a las fotos' }).click();
    check('volver deja otra vez la lista de fotos', await dialog.getByRole('heading', { name: 'Elegir foto' }).isVisible() && patches.length === 0);
    await ctx.close();
  } catch (err) {
    check('excepción', false, String(err?.message ?? err).split('\n').slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    console.log(`${pass} correctas, ${fail} fallidas`);
    process.exit(fail ? 1 : 0);
  }
})();
