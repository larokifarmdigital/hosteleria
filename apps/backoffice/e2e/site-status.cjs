// Fase 6: estado de la web. Api real (el del backoffice en local) con un servidor local que hace de hook,
// y cada estado de la tarjeta simulando la respuesta en el navegador. Sobre «pruebas»; restaura al acabar.
const { chromium } = require(process.env.PW);
const { spawnSync } = require('child_process');
const http = require('http');
const S = process.env.S, BASE = process.env.BASE;
const rawApi = require('./api.cjs')(S + '/admin.json');
// El aviso a la web sale después de responder: tras cada escritura se le da un momento.
const api = async (m, p, b) => { const r = await rawApi(m, p, b); if (m !== 'GET') await new Promise(res => setTimeout(res, 700)); return r; };
const rawEditor = require('./api.cjs')(S + '/editor.json');
const editorApi = async (m, p, b) => { const r = await rawEditor(m, p, b); if (m !== 'GET') await new Promise(res => setTimeout(res, 700)); return r; };
const state = require('./pruebas-state.cjs')(api);
const all = (t) => ({ es: t, ca: t + ' (ca)', en: t + ' (en)' });
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const SP = `/restaurants/pruebas/spaces/${state.SPACE}`;

(async () => {
  let calls = 0;
  const server = http.createServer((req, res) => { if (req.method === 'POST') calls++; res.writeHead(201).end('{}'); });
  await new Promise(r => server.listen(8799, r));
  const before = await state.read();
  const rebuildBefore = (await state.pool.query(`SELECT last_rebuild_at, last_rebuild_ok FROM restaurants WHERE slug = 'pruebas'`)).rows[0];
  const browser = await chromium.launch();
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
    const s0 = (await api('GET', '/restaurants/pruebas/site-status'));
    check('sin publicar: estado «sin publicar» y nada que actualizar', s0.status === 200 && s0.body.site.state === 'unpublished' && s0.body.site.canRebuild === false, s0.body);
    check('el editor ve el de su restaurante y no el de otro', (await editorApi('GET', '/restaurants/pruebas/site-status')).status === 200 && (await editorApi('GET', '/restaurants/pubilla/site-status')).status === 403);
    check('sin sesión no se ve', (await fetch(process.env.API + '/restaurants/pruebas/site-status')).status === 401);
    const noHook = await api('POST', '/restaurants/pruebas/rebuild');
    check('sin publicar, pedir la actualización no llama a nada', noHook.status === 200 && calls === 0 && noHook.body.site.lastRebuildAt === (rebuildBefore.last_rebuild_at?.toISOString() ?? null), noHook.body);

    await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: 'http://localhost:8799/hook' });
    const space0 = (await api('GET', SP)).body.space;
    const hero = { ...space0.hero, title: all('Pruebas'), subtitle: {}, note: {}, metaLeft: {}, metaRight: {}, cta: {}, imageAlt: {} };
    await api('PATCH', SP, { hero, state: 'published' });
    const pub = await api('PATCH', '/restaurants/pruebas', { state: 'published' });
    const s1 = (await api('GET', '/restaurants/pruebas/site-status')).body.site;
    check('al publicar se avisa a la web y queda apuntado', pub.status === 200 && calls === 1 && !!s1.lastRebuildAt && s1.lastRebuildOk === true && s1.canRebuild === true, s1);
    check('una web que no responde no se da por buena ni por mala', s1.state === 'unknown' && s1.siteUrl === 'https://pruebas.example', s1);
    const t0 = s1.lastRebuildAt;
    await pause(1100);
    const man = await api('POST', '/restaurants/pruebas/rebuild');
    check('pedir la actualización a mano vuelve a avisar', man.status === 200 && calls === 2 && man.body.site.lastRebuildAt > t0 && man.body.site.lastRebuildOk === true, man.body.site);
    check('un editor también puede pedirla en su restaurante, y no en otro', (await editorApi('POST', '/restaurants/pruebas/rebuild')).status === 200 && calls === 3 && (await editorApi('POST', '/restaurants/pubilla/rebuild')).status === 403);
    const dish = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes[0];
    await api('PATCH', `/dishes/${dish.id}`, { price: dish.price });
    check('guardar un plato avisa y queda apuntado', calls === 4 && (await api('GET', '/restaurants/pruebas/site-status')).body.site.lastRebuildOk === true);
    const bad = await api('PATCH', '/restaurants/pruebas', { domain: 'localhost', state: 'draft' });
    const s2 = (await api('GET', '/restaurants/pruebas/site-status')).body.site;
    check('un dominio que no es una web pública no se consulta', bad.status === 200 && s2.state === 'unknown' && s2.siteUrl === null, s2);
    await api('PATCH', '/restaurants/pruebas', { domain: before.r.domain, state: 'published' });
    const callsBeforeUi = calls;

    await pause(45000);
    if (process.env.SOLO_API) throw Object.assign(new Error('solo api'), { soloApi: true });
    console.log('— Pantallas (respuesta simulada)');
    const site = (over) => ({ state: 'up_to_date', siteUrl: 'https://pruebas.example', builtAt: new Date(Date.now() - 5 * 60000).toISOString(), lastRebuildAt: new Date(Date.now() - 6 * 60000).toISOString(), lastRebuildOk: true, canRebuild: true, ...over });
    for (const [vpName, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
      console.log(`  ${vpName}`);
      const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: vp, isMobile: vpName === 'móvil', hasTouch: vpName === 'móvil' });
      const p = await ctx.newPage();
      let mock = site({});
      await p.route('**/api/restaurants/pruebas/site-status', r => r.fulfill({ json: { site: mock } }));
      // El estado de la web se ve al pulsar el aviso de arriba («La web está al día ›»).
      const card = p.getByRole('dialog').locator('section', { has: p.getByRole('heading', { name: 'Web', exact: true }) });
      const open = async (m) => {
        mock = m; await p.goto(`${BASE}/restaurants/pruebas`); await p.getByRole('heading', { level: 1 }).waitFor(); await p.waitForTimeout(700);
        await p.getByRole('button', { name: /ver el detalle/ }).first().click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(300);
      };

      await open(site({}));
      check('al día: lo dice, con cuándo se actualizó y enlace a la web', await card.getByText('La web enseña lo último publicado').isVisible() && await card.getByText(/Se actualizó hace 5 min/).isVisible()
        && (await card.getByRole('link', { name: /Abrir la web/ }).getAttribute('href')) === 'https://pruebas.example' && (await card.getByRole('button').count()) === 0, await card.innerText());
      await audit(p, 'ficha con la web al día');

      await open(site({ state: 'updating' }));
      check('actualizándose: lo dice y no ofrece repetir', await card.getByText('La web se está actualizando').isVisible() && (await card.getByRole('button').count()) === 0);

      await open(site({ state: 'outdated', canRebuild: false }));
      check('desfasada sin actualización automática: remite al administrador', await card.getByText('La web todavía no enseña los últimos cambios').isVisible() && await card.getByText(/no tiene configurada la actualización automática/).isVisible() && (await card.getByRole('button').count()) === 0);

      await open(site({ state: 'outdated', lastRebuildOk: false }));
      check('desfasada porque falló el aviso: lo explica', await card.getByText(/No se pudo avisar a la web/).isVisible());
      await audit(p, 'ficha con la web desfasada');
      const c0 = calls;
      // El botón llama al api de verdad; la respuesta siguiente ya es «actualizándose».
      await p.unroute('**/api/restaurants/pruebas/site-status');
      await p.route('**/api/restaurants/pruebas/site-status', r => r.fulfill({ json: { site: site({ state: 'updating' }) } }));
      await card.getByRole('button', { name: 'Actualizar la web ahora' }).click();
      await p.getByText('Actualización pedida', { exact: true }).first().waitFor();
      check('«Actualizar la web ahora» avisa a la web de verdad', calls === c0 + 1, [c0, calls]);

      await pause(25000);
      await p.unroute('**/api/restaurants/pruebas/site-status');
      await p.route('**/api/restaurants/pruebas/site-status', r => r.fulfill({ json: { site: mock } }));
      await open(site({ state: 'unknown' }));
      check('sin poder comprobar: lo dice, nombra el dominio y deja reintentar', await card.getByText('No se ha podido comprobar la web').isVisible() && await card.getByText(/pruebas\.example no responde/).isVisible() && await card.getByRole('button', { name: 'Actualizar la web ahora' }).isVisible());

      await open(site({ state: 'unpublished', siteUrl: null, canRebuild: false }));
      check('sin publicar: la tarjeta no aparece', (await card.count()) === 0);

      await pause(20000);
      // Carta
      const note = p.getByRole('main').getByRole('status').filter({ hasText: /La web/ });
      mock = site({});
      await p.goto(`${BASE}/dishes?r=pruebas`);
      await p.getByRole('navigation', { name: 'Tipo de carta' }).waitFor();
      await p.waitForTimeout(700);
      check('carta con la web al día: no hay aviso', (await note.count()) === 0);
      mock = site({ state: 'updating' });
      const c1 = calls;
      await p.getByRole('switch').first().click().catch(async () => { await p.getByRole('checkbox').first().click(); });
      await note.waitFor({ timeout: 10000 });
      check('al cambiar un plato, la carta avisa de que la web se está actualizando', /La web se está actualizando/.test(await note.innerText()) && calls === c1 + 1, [await note.innerText(), c1, calls]);
      await audit(p, 'carta con el aviso');
      await p.getByRole('switch').first().click().catch(async () => { await p.getByRole('checkbox').first().click(); });
      await p.waitForTimeout(1500);
      await ctx.close();
      await pause(45000);
    }

    console.log('— Hook caído');
    await new Promise(r => server.close(r));
    const down = await api('POST', '/restaurants/pruebas/rebuild');
    await pause(1500);
    const afterDown = (await api('GET', '/restaurants/pruebas/site-status')).body.site;
    check('si la web no acepta el aviso, queda apuntado como fallo', down.status === 200 && afterDown.lastRebuildOk === false, afterDown);

    console.log('— Herramienta ux-a11y-audit (con la tarjeta real: web sin comprobar)');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/restaurants/pruebas`, `${BASE}/dishes?r=pruebas`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr).trim().split('\n').filter(l => /══|✗|Total/.test(l)).join('\n'));
    check('herramienta: 0 incidencias', out.status === 0);
    void callsBeforeUi;
  } catch (e) { if (!e.soloApi) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); } }
  finally {
    await browser.close();
    if (server.listening) await new Promise(r => server.close(r));
    await api('PATCH', '/restaurants/pruebas', { rebuildHookUrl: null });
    const dishes = (await api('GET', '/dishes?restaurantSlug=pruebas')).body.dishes;
    for (const d of dishes) if (!d.active) await api('PATCH', `/dishes/${d.id}`, { active: true });
    await state.pool.query(`UPDATE restaurants SET last_rebuild_at = $1, last_rebuild_ok = $2 WHERE slug = 'pruebas'`, [rebuildBefore.last_rebuild_at, rebuildBefore.last_rebuild_ok]);
    const diff = await state.restore(before);
    const after = (await api('GET', '/restaurants/pruebas')).body.restaurant;
    console.log('«pruebas» restaurado; diferencias:', JSON.stringify(diff), '· hook:', after.rebuildHookUrl, '· estado:', after.state);
    if (diff.length || after.rebuildHookUrl !== null) fail++;
    await state.pool.end();
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
