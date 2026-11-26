// Fase 6: tareas pendientes en el panel de inicio y en la ficha (build de producción),
// sobre «pruebas». Restaura al acabar.
const { chromium } = require(process.env.PW);
const { spawnSync } = require('child_process');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const editorApi = require('./api.cjs')(S + '/editor.json');
const state = require('./pruebas-state.cjs')(api);
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };

(async () => {
  const before = await state.read();
  const browser = await chromium.launch();
  // Lo que la prueba cambia en la carta: se deshace siempre, también si falla a mitad.
  const undo = [];
  const restoreMenu = async () => { while (undo.length) { const [m, path, body] = undo.shift(); await api(m, path, body); } };
  const audit = async (p, name) => {
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE }) => {
      const r = await axe.run(document, AXE);
      const scope = document.querySelector('main') ?? document.body;
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...scope.querySelectorAll('button, a[href], input, select, textarea, [role=tab]')].filter(visible);
      const small = controls.filter(e => { if (e.matches('input[type=checkbox]')) e = e.closest('label') ?? e; const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.id || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], [role=tab], select') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.id || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE });
    const n = res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0);
    check(`auditoría: ${name}`, n === 0, res);
  };
  try {
    console.log('— Api');
    const t = await api('GET', '/restaurants/pruebas/pending');
    const kinds = t.body.tasks.map(x => `${x.type}:${x.target.kind}${x.target.menu ? ':' + x.target.menu : ''}`);
    check('«pruebas» tiene pendiente publicar ficha y espacio, y traducciones de portada y platos',
      t.status === 200 && ['unpublished:restaurant', 'unpublished:space', 'translations:space', 'translations:menu:dishes'].every(k => kinds.includes(k)), kinds);
    const e1 = await editorApi('GET', '/restaurants/pruebas/pending');
    const e2 = await editorApi('GET', '/restaurants/pubilla/pending');
    check('el editor ve las de su restaurante y no las de otro', e1.status === 200 && e2.status === 403, [e1.status, e2.status]);
    const anon = await fetch(process.env.API + '/restaurants/pruebas/pending');
    check('sin sesión no se ven', anon.status === 401, anon.status);

    for (const [vpName, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
      console.log(`— ${vpName}`);
      const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: vp, isMobile: vpName === 'móvil', hasTouch: vpName === 'móvil' });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/dashboard`);
      const section = p.getByRole('region', { name: 'Pendiente' });
      await section.getByRole('heading', { name: 'Pruebas' }).waitFor();
      await p.waitForFunction(() => !document.body.innerText.includes('Comprobando el contenido'), null, { timeout: 15000 }).catch(() => {});
      const status = await section.getByRole('status').innerText();
      check('el panel resume cuánto hay pendiente', /\d+ cosas? por resolver en \d+ restaurantes?\./.test(status), status);
      const group = section.getByRole('listitem').filter({ has: p.getByRole('heading', { name: 'Pruebas' }) });
      check('«Pruebas» lista sus cuatro pendientes', (await group.getByRole('link').count()) === 5 && /4 pendientes/.test(await group.innerText()), await group.innerText());
      check('un restaurante al día no aparece en «Pendiente»', (await section.getByRole('heading', { name: 'La Pubilla' }).count()) === 0);
      check('cada tarea dice qué falta, en qué idiomas y un ejemplo',
        await group.getByText('2 textos sin traducir en el espacio «Comedor principal»').isVisible()
        && await group.getByText('Faltan en català y english. Por ejemplo: Título de la portada, Subtítulo de la portada.').isVisible()
        && await group.getByText('La ficha del restaurante aún no se ha publicado').isVisible());
      await audit(p, 'panel de inicio con pendientes');

      await group.getByRole('link', { name: /en los platos de «Comedor principal»/ }).click();
      await p.waitForURL(/s=menu/);
      await p.locator('#carta-mostrar').waitFor();
      check('la tarea de la carta lleva a los platos ya filtrados por «Falta traducción»',
        /ver=sin-traducir/.test(p.url()) && (await p.locator('#carta-mostrar').inputValue()) === 'missing' && await p.getByText('Tortilla trufada').first().isVisible(), p.url());
      await pause(4000);

      await p.goto(`${BASE}/dashboard`);
      await group.getByRole('link', { name: /2 textos sin traducir en el espacio/ }).click();
      await p.waitForURL(new RegExp(`s=cover&e=${state.SPACE}`));
      check('la tarea del espacio lleva al espacio', true);
      await pause(4000);

      await p.goto(`${BASE}/restaurants/pruebas`);
      // «Resumen» ya no existe: lo que falta se ve al pulsar el estado de la web, arriba (o abajo en móvil).
      const openStatus = async () => { await p.locator('button:visible').filter({ hasText: 'ver el detalle' }).first().click(); await p.getByRole('dialog').waitFor(); };
      await p.locator('button:visible').filter({ hasText: 'ver el detalle' }).first().waitFor();
      await p.waitForTimeout(800);
      await openStatus();
      const aside = p.getByRole('dialog');
      await aside.getByRole('heading', { name: 'Lo que falta' }).waitFor();
      const links = aside.locator('section', { has: p.getByRole('heading', { name: 'Lo que falta' }) }).getByRole('link');
      await links.first().waitFor();
      // Lo que está sin publicar lo dice la barra de arriba: en el resumen, lo que falta completar.
      check('el estado de la web enseña lo que falta completar (espacio y carta)', (await links.count()) === 2 && !(await links.filter({ hasText: 'aún no se ha publicado' }).count()), await links.allInnerTexts());
      await audit(p, 'estado de la web con pendientes', '[role=dialog]');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);

      // Se arregla lo de los platos por el api y se guarda algo en la ficha: la lista se pone al día sola.
      const dishes = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
      const cats = (await api('GET', `/dishes/categories?spaceId=${state.SPACE}`)).body.categories;
      for (const d of dishes) { undo.push(['PATCH', `/dishes/${d.id}`, { name: d.name, note: d.note }]); await api('PATCH', `/dishes/${d.id}`, { name: { es: 'x', ca: 'x', en: 'x' }, note: {} }); }
      for (const c of cats) { undo.push(['PATCH', `/dishes/categories/${c.id}`, { name: c.name }]); await api('PATCH', `/dishes/categories/${c.id}`, { name: { es: 'x', ca: 'x', en: 'x' } }); }
      // En escritorio las secciones son un menú; en móvil, un desplegable. Se guarda solo.
      const open = (id, label) => vpName === 'móvil' ? p.locator('#seccion-picker').selectOption(id) : p.getByRole('navigation', { name: 'Secciones de la web' }).getByRole('button', { name: label }).click();
      await open('contact', /^Contacto y reservas/);
      await p.locator('#r-founded').fill('1999');
      await p.getByText('Cambios guardados', { exact: true }).first().waitFor({ timeout: 10000 });
      await openStatus();
      await p.waitForFunction(() => !document.body.innerText.includes('en los platos de'), null, { timeout: 8000 }).catch(() => {});
      check('tras guardar, lo ya resuelto desaparece de la lista', (await aside.getByText(/en los platos de/).count()) === 0 && (await links.count()) === 1, await links.allInnerTexts());
      await restoreMenu();
      await api('PATCH', '/restaurants/pruebas', { foundedYear: before.r.founded_year, state: 'draft' });
      await ctx.close();
      await pause(65000);
    }

    console.log('— Editor');
    const ctx = await browser.newContext({ storageState: S + '/editor.json', viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/restaurants/pruebas`);
    await p.waitForTimeout(1500);
    await p.locator('button:visible').filter({ hasText: 'ver el detalle' }).first().click();
    await p.getByRole('dialog').getByRole('heading', { name: 'Lo que falta' }).waitFor();
    check('el editor ve lo pendiente en el estado de su web', true);
    await ctx.close();
    await pause(15000);

    console.log('— Herramienta ux-a11y-audit');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/dashboard`, `${BASE}/restaurants/pruebas`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr).trim().split('\n').filter(l => /══|✗|Total|✓ axe/.test(l)).join('\n'));
    check('herramienta: 0 incidencias', out.status === 0);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); }
  finally {
    await browser.close();
    await restoreMenu();
    const diff = await state.restore(before);
    const dishes = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes.map(d => d.name.es).sort();
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· platos:', dishes.join(', '));
    if (diff.length || dishes.includes('x')) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
