// Fase 6: usuarios e idiomas en Ajustes, y la página de elegir contraseña (build de producción).
// Crea un usuario y un idioma de prueba y los borra al acabar.
const { chromium } = require(process.env.PW);
const select = require('./select.cjs');
const { spawnSync } = require('child_process');
const S = process.env.S, BASE = process.env.BASE;
const api = require('./api.cjs')(S + '/admin.json');
const pause = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${!ok && extra !== '' ? ' — ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`); };
const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } };
const EMAIL = 'prueba6.fase6@hostelery.com', NAME = 'Prueba Fase Seis', PASSWORD = 'Cuatro-mesas-junto-al-ventanal-82';
const LANG = 'zz';

const cleanup = async () => {
  const users = (await api('GET', '/users')).body.users ?? [];
  for (const u of users.filter(u => u.email === EMAIL)) await api('DELETE', `/users/${u.id}`);
  const langs = (await api('GET', '/languages')).body.languages ?? [];
  for (const l of langs.filter(l => l.code === LANG)) await api('DELETE', `/languages/${l.id}`);
};

(async () => {
  await cleanup();
  const usersBefore = (await api('GET', '/users')).body.users.map(u => u.email).sort();
  const langsBefore = (await api('GET', '/languages')).body.languages.map(l => l.code).sort();
  const me = (await api('GET', '/auth/session')).body.user;
  const browser = await chromium.launch();
  const audit = async (p, name, root = 'main') => {
    // Un aviso emergente a medio desvanecerse falsea el contraste: se espera a que se vaya.
    await p.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await p.evaluate(async ({ AXE, root }) => {
      const r = await axe.run(document, AXE);
      const scope = [...document.querySelectorAll(root)].pop() ?? document.body;
      const visible = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const controls = [...scope.querySelectorAll('button, a[href], input, select, textarea')].filter(visible);
      const small = controls.filter(e => { if (e.matches('input[type=checkbox]')) e = e.closest('label') ?? e; const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(e => (e.getAttribute('aria-label') || e.id || e.textContent || e.tagName).trim().slice(0, 40));
      const noPointer = controls.filter(e => e.matches('button:not(:disabled), a[href], select:not(:disabled), input[type=checkbox]') && getComputedStyle(e).cursor !== 'pointer').map(e => (e.getAttribute('aria-label') || e.id || e.textContent).trim().slice(0, 40));
      return { v: r.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' ; ')), small, noPointer, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, { AXE, root });
    const n = res.v.length + res.small.length + res.noPointer.length + (res.overflow ? 1 : 0);
    check(`auditoría: ${name}`, n === 0, res);
  };
  try {
    const ctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage();
    const dialog = p.getByRole('dialog');
    await p.goto(`${BASE}/settings`);
    await p.getByRole('heading', { name: 'Usuarios' }).waitFor();
    await audit(p, 'ajustes');

    console.log('— Idiomas: por restaurante, no en Administración');
    check('Administración ya no tiene idiomas', (await p.getByRole('heading', { name: 'Idiomas' }).count()) === 0 && (await p.getByRole('button', { name: 'Añadir idioma' }).count()) === 0);
    await p.goto(`${BASE}/restaurants/pruebas?s=languages`);
    await p.getByRole('button', { name: 'Añadir idioma' }).click();
    await dialog.getByRole('heading', { name: 'Añadir idiomas' }).waitFor();
    await dialog.getByRole('button', { name: '¿No está en la lista? Crear otro idioma' }).click();
    await dialog.locator('#new-lang-code').fill('1a');
    await dialog.locator('#new-lang-name').fill('Prueba');
    await dialog.getByRole('button', { name: 'Crear idioma', exact: true }).click();
    check('un código que no son 2 o 3 letras se rechaza con explicación', await dialog.getByText(/El código son 2 o 3 letras/).isVisible());
    await audit(p, 'crear otro idioma', '[role=dialog]');
    await dialog.locator('#new-lang-code').fill(LANG.toUpperCase());
    await dialog.getByRole('button', { name: 'Crear idioma', exact: true }).click();
    await p.getByText('Idioma creado', { exact: true }).first().waitFor();
    check('el idioma se crea en minúscula y queda marcado en la web', (await api('GET', '/languages')).body.languages.some(l => l.code === LANG && l.name === 'Prueba') && await dialog.locator(`#lang-${LANG}`).isChecked());
    // Sin guardar: «pruebas» se queda con sus idiomas.
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    for (const l of (await api('GET', '/languages')).body.languages.filter(l => l.code === LANG)) await api('DELETE', `/languages/${l.id}`);
    check('el idioma de prueba se borra', !(await api('GET', '/languages')).body.languages.some(l => l.code === LANG));
    await p.goto(`${BASE}/settings`);
    await p.getByRole('heading', { name: 'Usuarios' }).waitFor();
    await pause(8000);

    console.log('— Alta de usuario e invitación');
    await p.getByRole('button', { name: 'Añadir usuario' }).click();
    await dialog.getByRole('heading', { name: 'Nuevo usuario' }).waitFor();
    await audit(p, 'usuario nuevo', '[role=dialog]');
    await dialog.getByRole('button', { name: 'Crear usuario' }).click();
    check('sin nombre no crea y lo dice', await dialog.getByText('Escribe el nombre.').isVisible());
    await dialog.locator('#u-name').fill(NAME);
    await dialog.locator('#u-email').fill('sin-arroba');
    await dialog.getByRole('button', { name: 'Crear usuario' }).click();
    check('un email mal escrito se rechaza con ejemplo', await dialog.getByText(/Escribe un email válido/).isVisible());
    await dialog.locator('#u-email').fill(EMAIL);
    await dialog.getByLabel('Pruebas', { exact: true }).check();
    await dialog.getByRole('button', { name: 'Crear usuario' }).click();
    await dialog.getByRole('heading', { name: 'Enlace para elegir contraseña' }).waitFor();
    const link = await dialog.locator('#invitation-url').inputValue();
    check('tras crearlo se enseña el enlace de invitación, en este mismo sitio', new RegExp(`^${BASE}/set-password\\?token=[\\w-]{16,}$`).test(link), link);
    await dialog.getByRole('button', { name: 'Copiar enlace' }).click();
    await dialog.getByText('Enlace copiado.').waitFor();
    check('«Copiar enlace» lo deja en el portapapeles', (await p.evaluate(() => navigator.clipboard.readText())) === link);
    await audit(p, 'enlace de invitación', '[role=dialog]');
    await dialog.getByRole('button', { name: 'Hecho' }).click();
    const users = p.getByRole('region', { name: 'Usuarios' });
    const row = users.getByRole('row').filter({ hasText: EMAIL });
    check('el usuario sale en la lista como editor de «Pruebas» que aún no ha entrado', /Editor/.test(await row.innerText()) && /Pruebas/.test(await row.innerText()) && /Aún no ha entrado/.test(await row.innerText()), await row.innerText());

    console.log('— Elegir contraseña (sin sesión)');
    const guest = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const g = await guest.newPage();
    await g.goto(`${BASE}/set-password`);
    check('sin token explica qué hacer', await g.getByRole('heading', { name: 'Falta el enlace completo' }).isVisible());
    await g.goto(link);
    await g.getByRole('heading', { name: 'Elige tu contraseña' }).waitFor();
    await audit(g, 'elegir contraseña');
    await g.locator('#sp-pwd').fill(PASSWORD);
    await g.locator('#sp-repeat').fill(PASSWORD + 'x');
    await g.getByRole('button', { name: 'Guardar contraseña' }).click();
    check('si no coinciden lo dice', await g.getByRole('alert').filter({ hasText: 'no coinciden' }).isVisible());
    await g.locator('#sp-pwd').fill('12345678');
    await g.locator('#sp-repeat').fill('12345678');
    await g.getByRole('button', { name: 'Guardar contraseña' }).click();
    await g.getByRole('alert').filter({ hasText: /./ }).first().waitFor();
    const weak = await g.getByRole('alert').first().innerText();
    check('una contraseña floja se rechaza con el motivo', weak.length > 10 && !/no coinciden/.test(weak) && (await g.getByRole('heading', { name: 'Elige tu contraseña' }).isVisible()), weak);
    await audit(g, 'elegir contraseña con error');
    await g.locator('#sp-pwd').fill(PASSWORD);
    await g.locator('#sp-repeat').fill(PASSWORD);
    await g.getByRole('button', { name: 'Guardar contraseña' }).click();
    await g.getByRole('heading', { name: 'Contraseña guardada' }).waitFor();
    await audit(g, 'contraseña guardada');
    await g.goto(link);
    await g.locator('#sp-pwd').fill(PASSWORD);
    await g.locator('#sp-repeat').fill(PASSWORD);
    await g.getByRole('button', { name: 'Guardar contraseña' }).click();
    await g.getByRole('alert').filter({ hasText: /no es válido o ha caducado/ }).waitFor({ timeout: 10000 }).catch(() => {});
    check('el enlace no sirve dos veces', await g.getByRole('alert').filter({ hasText: /no es válido o ha caducado/ }).isVisible(), await g.getByRole('alert').allInnerTexts());
    await g.goto(`${BASE}/login`);
    await g.locator('#lg-email').fill(EMAIL);
    await g.locator('#lg-pwd').fill(PASSWORD);
    await g.getByRole('button', { name: 'Entrar' }).click();
    await g.waitForURL(/\/restaurants\/pruebas/, { timeout: 20000 }).catch(() => {});
    check('con esa contraseña entra y cae en su restaurante', /\/restaurants\/pruebas/.test(g.url()), [g.url(), await g.getByRole('alert').allInnerTexts()]);
    await pause(8000);

    console.log('— Suspender y reactivar (menú «⋯» de la fila)');
    await p.reload();
    const rowMenu = async (name, action) => {
      await users.getByRole('button', { name: `Más acciones: ${name}`, exact: true }).click();
      await p.getByRole('menuitem', { name: action, exact: true }).click();
    };
    await row.waitFor();
    check('la tabla dice el estado: activa tras entrar', /Activa/.test(await row.innerText()), await row.innerText());
    check('editar, con su icono, y lo demás en el menú de la fila', await users.getByRole('button', { name: `Editar a ${NAME}` }).isVisible() && await users.getByRole('button', { name: `Más acciones: ${NAME}`, exact: true }).isVisible());
    await users.getByRole('button', { name: `Editar a ${NAME}` }).click();
    await dialog.getByRole('heading', { name: `Editar a ${NAME}` }).waitFor();
    check('el diálogo de editar solo lleva los datos', (await dialog.getByRole('button', { name: /Suspender|Eliminar|Crear enlace/ }).count()) === 0);
    await audit(p, 'editar usuario', '[role=dialog]');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await users.getByRole('button', { name: `Más acciones: ${NAME}`, exact: true }).click();
    check('el menú ofrece enlace, suspender y eliminar', JSON.stringify(await p.getByRole('menuitem').allInnerTexts()) === JSON.stringify(['Crear enlace para elegir contraseña', 'Suspender cuenta', 'Eliminar']), await p.getByRole('menuitem').allInnerTexts());
    await p.getByRole('menuitem', { name: 'Suspender cuenta', exact: true }).click();
    await p.getByText('Cuenta suspendida', { exact: true }).first().waitFor();
    await g.goto(`${BASE}/dishes`);
    await g.waitForURL(/\/login/, { timeout: 20000 });
    check('su sesión abierta se cierra', true);
    await g.locator('#lg-email').fill(EMAIL);
    await g.locator('#lg-pwd').fill(PASSWORD);
    await g.getByRole('button', { name: 'Entrar' }).click();
    await g.getByRole('alert').filter({ hasText: /suspendida/ }).waitFor();
    check('y al intentar entrar se le dice que está suspendida', true);
    await p.waitForTimeout(800);
    check('en la lista sale como «Suspendida»', /Suspendida/.test(await row.innerText()));
    await rowMenu(NAME, 'Reactivar cuenta');
    await p.getByText('Cuenta reactivada', { exact: true }).first().waitFor();
    check('tras un intento fallido, el formulario conserva el email', (await g.locator('#lg-email').inputValue()) === EMAIL, await g.locator('#lg-email').inputValue());
    await g.locator('#lg-pwd').fill(PASSWORD);
    await g.getByRole('button', { name: 'Entrar' }).click();
    await g.waitForURL(/\/dishes/, { timeout: 20000 }).catch(() => {});
    check('reactivada, vuelve a entrar, a la página de la que salió', /\/dishes/.test(g.url()), g.url());
    await pause(8000);

    console.log('— Editar, enlace nuevo y eliminar');
    await rowMenu(NAME, 'Crear enlace para elegir contraseña');
    await dialog.getByRole('heading', { name: 'Enlace para elegir contraseña' }).waitFor();
    const link2 = await dialog.locator('#invitation-url').inputValue();
    check('se puede crear un enlace nuevo, distinto del primero', link2 !== link && link2.includes('/set-password?token='));
    await dialog.getByRole('button', { name: 'Hecho' }).click();
    await users.getByRole('button', { name: `Editar a ${NAME}` }).click();
    await select.pick(p, dialog.locator('#u-role'), 'admin');
    check('al pasar a administrador desaparece la lista de restaurantes', (await dialog.getByText('Restaurantes que puede editar').count()) === 0);
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await p.getByText('Usuario guardado', { exact: true }).first().waitFor();
    check('guardar cambia el rol', /Administrador/.test(await row.innerText()) && /Todos/.test(await row.innerText()), await row.innerText());

    await users.getByRole('button', { name: `Más acciones: ${me.name}`, exact: true }).click();
    check('en tu propia cuenta el menú no ofrece suspenderte ni eliminarte', JSON.stringify(await p.getByRole('menuitem').allInnerTexts()) === JSON.stringify(['Crear enlace para elegir contraseña']));
    await p.keyboard.press('Escape');
    await users.getByRole('button', { name: `Editar a ${me.name}` }).click();
    check('ni cambiarte el rol', await dialog.locator('#u-role').isDisabled());
    const self = await api('PATCH', `/users/${me.id}`, { suspended: true });
    const selfRole = await api('PATCH', `/users/${me.id}`, { role: 'editor' });
    check('y el api tampoco lo permite', self.status === 400 && selfRole.status === 400 && self.body.code === 'CANNOT_LOCK_SELF_OUT', [self.status, selfRole.status]);
    await dialog.getByRole('button', { name: 'Cancelar' }).click();

    await rowMenu(NAME, 'Eliminar');
    await p.waitForTimeout(350);
    await p.getByRole('button', { name: 'Sí, eliminar' }).click();
    await p.getByText('Usuario eliminado', { exact: true }).first().waitFor();
    check('eliminar lo quita de la lista', !(await api('GET', '/users')).body.users.some(u => u.email === EMAIL));
    await guest.close();
    await ctx.close();
    await pause(20000);

    console.log('— Móvil');
    const mctx = await browser.newContext({ storageState: S + '/admin.json', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await mctx.newPage();
    await m.goto(`${BASE}/settings`);
    await m.getByRole('heading', { name: 'Usuarios' }).waitFor();
    await audit(m, 'ajustes en móvil');
    await m.getByRole('button', { name: 'Añadir usuario' }).click();
    await m.getByRole('dialog').getByRole('heading', { name: 'Nuevo usuario' }).waitFor();
    await audit(m, 'usuario nuevo en móvil', '[role=dialog]');
    await m.keyboard.press('Escape');
    await m.getByRole('region', { name: 'Usuarios' }).getByRole('button', { name: `Editar a ${me.name}` }).click();
    await audit(m, 'editar usuario en móvil', '[role=dialog]');
    await m.keyboard.press('Escape');
    await mctx.close();
    const mg = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await mg.newPage();
    await mp.goto(`${BASE}/set-password?token=un-token-cualquiera-de-prueba`);
    await mp.getByRole('heading', { name: 'Elige tu contraseña' }).waitFor();
    await audit(mp, 'elegir contraseña en móvil');
    await mg.close();
    await pause(15000);

    console.log('— Herramienta ux-a11y-audit');
    const out = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `--storage=${S}/admin.json`, `${BASE}/settings`], { encoding: 'utf8' });
    const out2 = spawnSync('node', [process.env.HOME + '/.claude/tools/ux-a11y-audit.cjs', `${BASE}/set-password?token=un-token-cualquiera-de-prueba`, `${BASE}/login`], { encoding: 'utf8' });
    console.log((out.stdout + out.stderr + out2.stdout + out2.stderr).trim().split('\n').filter(l => /══|✗|Total/.test(l)).join('\n'));
    check('herramienta: 0 incidencias', out.status === 0 && out2.status === 0);
  } catch (e) { fail++; console.log('EXCEPCIÓN', e.message.split('\n').slice(0, 4).join(' | ')); }
  finally {
    await browser.close();
    await cleanup();
    const usersAfter = (await api('GET', '/users')).body.users.map(u => u.email).sort();
    const langsAfter = (await api('GET', '/languages')).body.languages.map(l => l.code).sort();
    const meAfter = (await api('GET', '/users')).body.users.find(u => u.id === me.id);
    const same = JSON.stringify(usersBefore) === JSON.stringify(usersAfter) && JSON.stringify(langsBefore) === JSON.stringify(langsAfter);
    console.log('usuarios e idiomas como antes:', same, '· mi cuenta:', meAfter.role, meAfter.suspended ? 'SUSPENDIDA' : 'activa');
    if (!same || meAfter.role !== 'admin' || meAfter.suspended) fail++;
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
