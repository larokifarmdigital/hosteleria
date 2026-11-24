// Carta de bebidas en el backoffice (build de producción), sobre «pruebas».
// Borra al acabar todo lo que crea y comprueba que «pruebas» queda como estaba.
const { chromium } = require(process.env.PW);
const { spawnSync } = require('child_process');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };

const cleanup = async () => {
  // Si el api corta por el límite de peticiones, se espera y se reintenta: no puede quedar nada a medias.
  const list = async (path, key) => {
    for (let i = 0; i < 6; i++) {
      const r = await api('GET', path);
      if (r.status === 200) return r.body[key];
      await pause(15000);
    }
    throw new Error(`no se pudo leer ${path}`);
  };
  for (const d of await list('/dishes?restaurantSlug=pruebas&kind=drink', 'dishes')) await api('DELETE', `/dishes/${d.id}`);
  for (const c of await list(`/dishes/categories?spaceId=${state.SPACE}&kind=drink`, 'categories')) await api('DELETE', `/dishes/categories/${c.id}`);
};

(async () => {
  const before = await state.read();
  const dishesBefore = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => d.id).sort();
  const browser = await chromium.launch();
  const audit = async (p, name, root = 'main') => {
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE, root }) => {
      const r = await axe.run(document, AXE);
      const scope = [...document.querySelectorAll(root)].pop() ?? document.body;
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...scope.querySelectorAll('button, a[href], input, select, textarea')].filter(visible);
      const small = controls.filter(e => { if (e.matches('input[type=checkbox]')) e = e.closest('label') ?? e; const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.id || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], select, input[type=checkbox]') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.id || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE, root });
    const n = res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0);
    check(`auditoría: ${name}`, n === 0, res);
  };
  try {
    for (const [vpName, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
      console.log(`— ${vpName}`);
      await cleanup();
      const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: vp, isMobile: vpName === 'móvil', hasTouch: vpName === 'móvil' });
      const p = await ctx.newPage();
      const tabs = p.getByRole('navigation', { name: 'Tipo de carta' });

      await p.goto(`${BASE}/dishes?r=pruebas`);
      await tabs.waitFor();
      check('sin bebidas, la pestaña «Bebidas» no se ofrece', (await tabs.getByRole('link', { name: /^Bebidas/ }).count()) === 0);

      // Una categoría con una bebida, por el api: ya hay carta de bebidas.
      const cat = (await api('POST', '/dishes/categories', { spaceId: state.SPACE, name: all('Cafés'), order: 0, kind: 'drink' })).body.category;
      await api('POST', '/dishes', { spaceId: state.SPACE, categoryId: cat.id, name: all('Espresso'), price: 2.2 });
      await p.goto(`${BASE}/dishes?r=pruebas`);
      await tabs.getByRole('link', { name: /^Bebidas/ }).waitFor();
      await tabs.getByRole('link', { name: /^Bebidas\s*1$/ }).waitFor({ timeout: 8000 }).catch(() => {});
      check('con bebidas, aparece la pestaña con su número', /Bebidas\s*1/.test(await tabs.getByRole('link', { name: /^Bebidas/ }).innerText()), await tabs.getByRole('link', { name: /^Bebidas/ }).innerText());
      check('la bebida no sale entre los platos', (await p.getByText('Espresso', { exact: true }).count()) === 0 && (await p.getByRole('heading', { name: /Cafés/ }).count()) === 0);
      await tabs.getByRole('link', { name: /^Bebidas/ }).click();
      await p.getByText('Espresso', { exact: true }).waitFor();
      check('en «Bebidas» sale la categoría con su bebida y su precio', p.url().includes('tipo=bebidas') && await p.getByText('2,20 €').first().isVisible());
      check('y no salen los platos', (await p.getByRole('button', { name: 'Añadir plato' }).count()) === 0 && (await p.getByRole('button', { name: 'Añadir bebida', exact: true }).count()) === 1);
      await audit(p, 'carta de bebidas');

      await p.getByRole('button', { name: 'Añadir bebida', exact: true }).click();
      const sheet = p.getByRole('dialog');
      await sheet.getByRole('heading', { name: 'Nueva bebida' }).waitFor();
      check('el formulario habla de bebidas y no pide foto', (await sheet.getByText('Nombre de la bebida').count()) > 0 && (await sheet.getByText('Foto del plato').count()) === 0);
      await audit(p, 'formulario de bebida nueva', '[role=dialog]');
      await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
      await sheet.getByText('Escribe el nombre en español.').waitFor();
      check('sin nombre no guarda y lo dice', true);
      await sheet.locator('#name-es').fill('Cortado');
      await sheet.locator('#d-price').fill('2,50');
      await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
      await p.getByText('Bebida añadida', { exact: true }).first().waitFor();
      await p.getByText('Cortado', { exact: true }).waitFor();
      const drinks = (await api('GET', '/dishes?restaurantSlug=pruebas&kind=drink')).body.dishes;
      const cortado = drinks.find(d => d.name.es === 'Cortado');
      check('la bebida nueva queda en la carta de bebidas con su precio', !!cortado && cortado.price === 2.5 && cortado.kind === 'drink' && cortado.categoryId === cat.id, cortado);
      check('la carta de platos sigue igual', state.j((await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => d.id).sort()) === state.j(dishesBefore));

      await p.getByRole('button', { name: 'Editar Cortado' }).click();
      await sheet.getByRole('heading', { name: 'Editar bebida' }).waitFor();
      await sheet.locator('#d-price').fill('3');
      await sheet.getByRole('button', { name: 'Guardar', exact: true }).click();
      await p.getByText('Bebida guardada', { exact: true }).first().waitFor();
      check('editar cambia el precio', (await api('GET', `/dishes/${cortado.id}`)).body.dish.price === 3);
      await pause(8000);

      await p.getByRole('button', { name: 'Añadir categoría' }).first().click();
      const dialog = p.getByRole('dialog');
      await dialog.getByText('Por ejemplo: Cafés, Cervezas, Refrescos.').waitFor();
      await audit(p, 'categoría de bebidas nueva', '[role=dialog]');
      await dialog.locator('#cat-es').fill('Refrescos');
      await dialog.locator('#cat-ca').fill('Refrescos');
      await dialog.locator('#cat-en').fill('Soft drinks');
      await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
      await p.getByText('Categoría añadida', { exact: true }).first().waitFor();
      const cats = (await api('GET', `/dishes/categories?spaceId=${state.SPACE}&kind=drink`)).body.categories;
      const dishCats = (await api('GET', `/dishes/categories?spaceId=${state.SPACE}`)).body.categories;
      check('la categoría nueva es de bebidas y no aparece en la de platos', cats.some(c => c.name.es === 'Refrescos' && c.kind === 'drink') && !dishCats.some(c => c.name.es === 'Refrescos'), cats);

      await p.getByRole('button', { name: 'Editar Cortado' }).click();
      await sheet.getByRole('button', { name: 'Eliminar bebida' }).click();
      await p.waitForTimeout(350);
      await p.getByRole('button', { name: /^Sí, eliminar/ }).click();
      await p.getByText('Bebida eliminada', { exact: true }).first().waitFor();
      check('eliminar la quita de la carta', (await api('GET', `/dishes/${cortado.id}`)).status === 404);
      await ctx.close();
      // La carta hace muchas llamadas por carga: sin esta pausa, el móvil choca con el límite por minuto.
      await pause(60000);
    }

    console.log('— Herramienta ux-a11y-audit');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/dishes?r=pruebas&tipo=bebidas`, `${BASE}/dishes?r=pruebas`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr).trim());
    check('herramienta: 0 incidencias', out.status === 0);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); }
  finally {
    await browser.close();
    await cleanup();
    const diff = await state.restore(before);
    const left = (await api('GET', '/dishes?restaurantSlug=pruebas&kind=drink')).body.dishes.length;
    const dishesAfter = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => d.id).sort();
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· bebidas que quedan:', left, '· platos iguales:', state.j(dishesAfter) === state.j(dishesBefore));
    if (diff.length || left || state.j(dishesAfter) !== state.j(dishesBefore)) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
