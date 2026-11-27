// Reordenar la carta y marcar varias fotos a la vez (con fotos reales en R2), sobre «pruebas».
// Borra lo que crea y restaura «pruebas» al acabar.
const { chromium } = require(process.env.PW);
const { spawnSync } = require('child_process');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const editorApi = require('./api.cjs')(S + '/editor.json');
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const SP = state.SPACE;

(async () => {
  const before = await state.read();
  const dishes0 = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
  const cats0 = (await api('GET', `/dishes/categories?spaceId=${SP}`)).body.categories;
  const created = { dishCats: [], dishes: [], wineCats: [], wines: [], media: [] };
  const browser = await chromium.launch();
  const audit = async (p, name, root = 'main') => {
    await p.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE, root }) => {
      const r = await axe.run(document, AXE);
      const scope = [...document.querySelectorAll(root)].pop() ?? document.body;
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...scope.querySelectorAll('button, a[href], input, select, textarea')].filter(visible);
      const small = controls.filter(e => { if (e.matches('input[type=checkbox], input[type=file]')) e = e.closest('label') ?? e; const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.id || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], select:not(:disabled)') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.id || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE, root });
    const n = res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0);
    check(`auditoría: ${name}`, n === 0, res);
  };
  const orderOf = async (kind, categoryId) => (await api('GET', `/${kind}?restaurantSlug=pruebas`)).body[kind].filter(d => d.categoryId === categoryId).sort((a, b) => a.order - b.order).map(d => typeof d.name === 'string' ? d.name : d.name.es);
  const catOrder = async (kind) => (await api('GET', `/${kind}/categories?spaceId=${SP}`)).body.categories.sort((a, b) => a.order - b.order).map(c => c.name.es);
  try {
    // Una segunda categoría con tres platos, y dos categorías de vinos.
    const cat = (await api('POST', '/dishes/categories', { spaceId: SP, name: all('Temporal'), order: 5 })).body.category;
    created.dishCats.push(cat.id);
    for (const [i, n] of ['Uno', 'Dos', 'Tres'].entries()) created.dishes.push((await api('POST', '/dishes', { spaceId: SP, categoryId: cat.id, name: all(n), price: i + 1, order: i })).body.dish.id);
    for (const n of ['Tintos', 'Blancos']) created.wineCats.push((await api('POST', '/wines/categories', { spaceId: SP, name: all(n), order: created.wineCats.length })).body.category.id);
    for (const n of ['Rioja', 'Ribera']) created.wines.push((await api('POST', '/wines', { spaceId: SP, categoryId: created.wineCats[0], name: n, order: created.wines.length })).body.wine.id);

    console.log('— Reordenar: api');
    const mix = await api('POST', '/dishes/reorder', { ids: [created.dishes[0], dishes0[0].id] });
    check('no deja mezclar platos de categorías distintas', mix.status === 400 && mix.body.code === 'INVALID_REORDER', mix.body);
    check('ni repetir elementos ni nombrar uno que no existe', (await api('POST', '/dishes/reorder', { ids: [created.dishes[0], created.dishes[0]] })).status === 400 && (await api('POST', '/dishes/reorder', { ids: ['no-existe'] })).status === 400);
    const pub = (await api('GET', '/dishes?restaurantSlug=pubilla')).body.dishes.slice(0, 2).map(d => d.id);
    check('un editor no puede reordenar la carta de otro restaurante', (await editorApi('POST', '/dishes/reorder', { ids: pub })).status === 403);
    check('sin sesión no se puede', (await fetch(process.env.API + '/dishes/reorder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ids":["x"]}' })).status === 401);
    await pause(5000);

    for (const [vpName, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
      console.log(`— Reordenar: ${vpName}`);
      await api('POST', '/dishes/reorder', { ids: created.dishes });
      await api('POST', '/dishes/categories/reorder', { ids: [...cats0.map(c => c.id), cat.id] });
      const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: vp, isMobile: vpName === 'móvil', hasTouch: vpName === 'móvil' });
      const p = await ctx.newPage();
      const active = () => p.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
      const status = p.getByRole('main').getByRole('status').filter({ hasText: /posición/ });
      await p.goto(`${BASE}/dishes?r=pruebas`);
      const mobile = vpName === 'móvil';
      // Escritorio: asa de arrastre, también con teclado (Espacio, flechas, Espacio).
      // Móvil: «Subir» y «Bajar» en el menú «⋯» de la fila; con el dedo no se arrastra.
      const moveDown = async name => {
        if (mobile) {
          await p.getByRole('button', { name: `Más acciones: ${name}`, exact: true }).click();
          await p.getByRole('menuitem', { name: 'Bajar', exact: true }).click();
        } else {
          await p.getByRole('button', { name: `Mover ${name}`, exact: true }).focus();
          await p.keyboard.press('Space');
          await p.waitForTimeout(250);
          await p.keyboard.press('ArrowDown');
          await p.waitForTimeout(250);
          await p.keyboard.press('Space');
        }
      };
      const categoryAction = async (label, action) => {
        await p.getByRole('button', { name: `Más acciones: categoría ${label}`, exact: true }).click();
        await p.getByRole('menuitem', { name: action, exact: true }).click();
      };
      const movers = () => p.getByRole('button', { name: mobile ? /^Más acciones: (Uno|Dos|Tres)$/ : /^Mover (Uno|Dos|Tres)$/ });
      await movers().first().waitFor();
      check('cada plato se puede mover', (await movers().count()) === 3);
      if (mobile) {
        await p.getByRole('button', { name: 'Más acciones: Uno', exact: true }).click();
        check('el primero no puede subir', (await p.getByRole('menuitem', { name: 'Subir', exact: true }).getAttribute('aria-disabled')) === 'true');
        await p.keyboard.press('Escape');
      }
      await audit(p, 'carta con orden');

      await moveDown('Uno');
      await status.first().waitFor();
      check('bajar un plato lo recoloca al momento y lo anuncia', /Uno (pasa a|queda en) la posición 2 de 3/.test(await status.first().innerText()), await status.first().innerText());
      if (!mobile) check('el foco sigue en el asa del plato movido', /^Mover Uno$/.test(await active()), await active());
      await p.waitForTimeout(1200);
      check('y queda guardado', state.j(await orderOf('dishes', cat.id)) === '["Dos","Uno","Tres"]', await orderOf('dishes', cat.id));
      await moveDown('Uno');
      await p.waitForTimeout(1500);
      check('orden final guardado', state.j(await orderOf('dishes', cat.id)) === '["Dos","Tres","Uno"]', await orderOf('dishes', cat.id));

      await categoryAction('Temporal', 'Subir categoría');
      await p.waitForTimeout(1500);
      check('subir una categoría la pone primera y se guarda', (await catOrder('dishes'))[0] === 'Temporal' && (await p.locator('#carta-platos').getByRole('heading', { level: 4 }).first().innerText()).startsWith('Temporal'), await catOrder('dishes'));
      await p.reload();
      await movers().first().waitFor();
      check('tras recargar se mantiene', (await p.locator('#carta-platos').getByRole('heading', { level: 4 }).first().innerText()).startsWith('Temporal')
        && state.j(await p.getByRole('button', { name: /^Editar (Uno|Dos|Tres)$/ }).evaluateAll(b => b.map(x => x.getAttribute('aria-label').replace('Editar ', '')))) === '["Dos","Tres","Uno"]');

      await p.locator('#carta-buscar').fill('Dos');
      await p.waitForTimeout(400);
      check('con un filtro activo no se ofrece mover', (await p.getByRole('button', { name: /^(Mover |Más acciones: (Uno|Dos|Tres)$)/ }).count()) === 0);
      await p.locator('#carta-buscar').fill('');
      await pause(4000);

      await p.getByRole('navigation', { name: 'Partes de la carta' }).getByRole('link', { name: /^Vinos/ }).click();
      await p.getByRole('button', { name: 'Editar Rioja', exact: true }).waitFor();
      await moveDown('Rioja');
      await p.waitForTimeout(800);
      await categoryAction('Tintos', 'Bajar categoría');
      await p.waitForTimeout(1500);
      check('los vinos y sus categorías también se reordenan', state.j(await orderOf('wines', created.wineCats[0])) === '["Ribera","Rioja"]' && state.j(await catOrder('wines')) === '["Blancos","Tintos"]', [await orderOf('wines', created.wineCats[0]), await catOrder('wines')]);
      await api('POST', '/wines/reorder', { ids: created.wines });
      await api('POST', '/wines/categories/reorder', { ids: created.wineCats });
      await ctx.close();
      await pause(65000);
    }

    console.log('— Varias fotos a la vez (fotos reales en R2)');
    const put = require('./upload.cjs')(api, S);
    for (const n of ['uno', 'dos', 'tres', 'cuatro']) created.media.push(await put('sueltos-' + n, all('Foto ' + n)));
    created.media.push(await put('sueltos-sin', {}));
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const dialog = p.getByRole('dialog');
    const mark = (n) => dialog.getByRole('button', { name: new RegExp(`^Marcar la foto: Foto ${n}`) });
    await p.goto(`${BASE}/restaurants/pruebas?s=photos&e=${SP}`);
    await p.getByRole('heading', { level: 2, name: 'Galería' }).waitFor();
    const gallery = p.getByRole('group', { name: 'Fotos de la galería' });
    await gallery.getByRole('button', { name: 'Añadir fotos' }).click();
    await mark('uno').waitFor();
    check('las fotos reales cargan desde R2', await mark('uno').locator('img').evaluate(img => img.complete && img.naturalWidth > 0));
    check('sin marcar nada no se puede añadir', await dialog.getByRole('button', { name: 'Añadir foto', exact: true }).isDisabled() && await dialog.getByText('Ninguna foto marcada.').isVisible());
    await mark('tres').click();
    await mark('uno').click();
    await mark('dos').click();
    await mark('dos').click();
    check('se marcan y desmarcan, y se cuenta cuántas van', (await mark('tres').getAttribute('aria-pressed')) === 'true' && (await mark('dos').getAttribute('aria-pressed')) === 'false' && await dialog.getByText('2 fotos marcadas.').isVisible() && await dialog.getByRole('button', { name: 'Añadir 2 fotos' }).isEnabled());
    await audit(p, 'elegir varias fotos', '[role=dialog]');
    await dialog.getByRole('button', { name: /^Marcar la foto: sueltos-sin/ }).click();
    check('una foto sin descripción pide describirla antes de marcarla', await dialog.getByRole('heading', { name: 'Describe la foto' }).isVisible());
    await dialog.getByRole('button', { name: 'Volver a las fotos' }).click();
    check('al volver, lo marcado sigue marcado', await dialog.getByText('2 fotos marcadas.').isVisible());
    await dialog.getByRole('button', { name: 'Añadir 2 fotos' }).click();
    await gallery.getByRole('listitem').nth(1).waitFor();
    const alts = await gallery.getByRole('listitem').locator('img').evaluateAll(imgs => imgs.map(i => i.alt));
    check('se añaden juntas, en el orden en que se marcaron', state.j(alts) === '["Foto tres","Foto uno"]', alts);
    await gallery.getByRole('button', { name: 'Añadir más' }).click();
    await mark('dos').waitFor();
    check('las ya añadidas no se ofrecen otra vez', (await mark('uno').count()) === 0 && (await mark('tres').count()) === 0);
    await p.keyboard.press('Escape');
    // Se guarda sola: se espera a que el api la tenga.
    let saved = [];
    for (let i = 0; i < 12; i++) {
      await p.waitForTimeout(700);
      saved = (await api('GET', `/restaurants/pruebas/spaces/${SP}`)).body.space.gallery;
      if (saved.length === 2) break;
    }
    check('la galería queda guardada en ese orden', state.j(saved) === state.j([created.media[2], created.media[0]]), saved);
    await pause(6000);

    await p.goto(`${BASE}/restaurants/pruebas?s=about`);
    const photos = p.getByRole('group', { name: 'Fotos', exact: true });
    await photos.getByRole('button', { name: 'Añadir fotos' }).click();
    await mark('uno').waitFor();
    for (const n of ['uno', 'dos', 'tres']) await mark(n).click();
    check('con el máximo marcado (3), las demás quedan desactivadas y se explica', await mark('cuatro').isDisabled() && await dialog.getByText(/3 fotos marcadas: no caben más \(máximo 3\)\./).isVisible());
    await dialog.getByRole('button', { name: 'Añadir 3 fotos' }).click();
    await photos.getByRole('listitem').nth(2).waitFor();
    check('con la lista llena ya no se ofrece añadir, y se explica', (await photos.getByRole('button', { name: /^Añadir/ }).count()) === 0 && await photos.getByText(/máximo de 3 fotos/).isVisible());

    // El logo y los iconos son ahora un solo «Icono», en Google y buscadores.
    await p.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: /^Google y buscadores/ }).click();
    const logo = p.getByRole('group', { name: 'Icono', exact: true });
    await logo.getByRole('button', { name: 'Elegir foto' }).click();
    await dialog.getByRole('button', { name: /^Usar la foto: Foto cuatro/ }).click();
    await logo.getByRole('button', { name: 'Cambiar foto' }).waitFor();
    check('donde va una sola foto, se sigue eligiendo con un clic', (await logo.locator('img').getAttribute('alt')) === 'Foto cuatro');
    let r;
    for (let i = 0; i < 12; i++) {
      await p.waitForTimeout(700);
      r = (await api('GET', '/restaurants/pruebas')).body.restaurant;
      if (r.branding?.logoAssetId === created.media[3]) break;
    }
    check('ficha guardada con las tres fotos en orden y el logo', state.j(r.about.imageAssetIds) === state.j(created.media.slice(0, 3)) && r.branding.logoAssetId === created.media[3], [r.about.imageAssetIds, r.branding]);
    await ctx.close();
    await pause(15000);

    console.log('— Herramienta ux-a11y-audit');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/restaurants/pruebas?s=menu`, `${BASE}/restaurants/pruebas?s=photos`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr).trim().split('\n').filter(l => /══|✗|Total/.test(l)).join('\n'));
    check('herramienta: 0 incidencias', out.status === 0);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); }
  finally {
    await browser.close();
    for (const id of created.dishes) await api('DELETE', `/dishes/${id}`);
    for (const id of created.dishCats) await api('DELETE', `/dishes/categories/${id}`);
    for (const id of created.wines) await api('DELETE', `/wines/${id}`);
    for (const id of created.wineCats) await api('DELETE', `/wines/categories/${id}`);
    await api('POST', '/dishes/categories/reorder', { ids: cats0.sort((a, b) => a.order - b.order).map(c => c.id) });
    for (const c of cats0) await api('PATCH', `/dishes/categories/${c.id}`, { order: c.order });
    for (const d of dishes0) await api('PATCH', `/dishes/${d.id}`, { order: d.order });
    const diff = await state.restore(before, created.media);
    const dishes1 = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    const byId = list => list.map(d => [d.id, d.order, d.active]).sort((a, b) => a[0].localeCompare(b[0]));
    const same = state.j(byId(dishes1)) === state.j(byId(dishes0));
    const wines1 = (await api('GET', '/wines?restaurantSlug=pruebas')).body.wines.length;
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· platos como antes:', same, '· vinos:', wines1);
    if (diff.length || !same || wines1) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
