const fs = require('fs');
module.exports = function (statePath) {
  const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const cookie = st.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  return async (method, path, body) => {
    const r = await fetch(process.env.API + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
    return { status: r.status, body: j };
  };
};
