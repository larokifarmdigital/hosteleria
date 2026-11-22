// Inicia sesión en el backoffice y guarda la sesión para las pruebas.
// El login está limitado a 5 intentos por hora y email: la sesión guardada se reutiliza.
const { chromium } = require(process.env.PW);
(async () => {
  const [email, password, out] = process.argv.slice(2);
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(process.env.BASE + '/login');
  await p.getByLabel(/email|correo/i).fill(email);
  await p.getByLabel(/contraseña/i).fill(password);
  await p.getByRole('button', { name: /entrar|iniciar/i }).click();
  await p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await ctx.storageState({ path: out });
  console.log('ok', p.url());
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
