const fs = require('fs');
module.exports = function (statePath) {
  const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const cookie = st.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  // El api corta a las 100 peticiones por minuto y usuario. Si la prueba lo agota, se
  // espera a que se abra la ventana y se repite: así la limpieza final nunca se queda a medias.
  return async (method, path, body) => {
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(process.env.API + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (r.status === 429 && attempt < 3) {
        const wait = Math.min(65, Number(r.headers.get('retry-after')) || 30);
        await new Promise(res => setTimeout(res, (wait + 1) * 1000));
        continue;
      }
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
      return { status: r.status, body: j };
    }
  };
};
