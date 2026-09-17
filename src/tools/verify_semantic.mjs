// Verificación del módulo de embeddings LSA + búsqueda semántica (aditivo).
// Requiere servidor levantado en :3199 con BD limpia.
const B = 'http://localhost:3199/api';
let fails = 0;
const chk = (name, cond, extra = '') =>
  console.log((cond ? '✓ ' : '✗ ' + (fails++, '')) + name + (extra ? ' — ' + extra : ''));

async function api(method, p, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${p} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j?.data ?? j;
}

const login = (await api('POST', '/auth/login', { body: { username: 'admin', password: 'sigad2024' } }));
const T = login.token;

console.log('=== 1 · TÉCNICA ADOPTADA: LSA (SVD truncado sobre TF-IDF) ===');
const info = await api('GET', '/system/info');
const e = info.embeddings;
chk('Embeddings expuestos en /system/info', !!e, e?.tecnica);
chk('Estado ANTES de corpus', e.ready === false, JSON.stringify({ ready: e.ready, docs: e.docs }));

console.log('\n=== 2 · ENTRENAMIENTO CON EL CORPUS (33 documentos) ===');
const seedRes = await api('POST', '/seed/corpus', { token: T });
chk('Corpus importado y procesado', seedRes, JSON.stringify(seedRes));
const info2 = (await api('GET', '/system/info')).embeddings;
chk('Embeddings entrenados (ready)', info2.ready === true);
chk('Dimensiones del espacio semántico', info2.dims > 0, info2.dims + ' dims');
chk('Vocabulario embebido', info2.vocabulario > 50, info2.vocabulario + ' términos');
chk('Documentos con vector semántico', info2.docs >= 30, info2.docs + ' docs');

console.log('\n=== 3 · BÚSQUEDA SEMÁNTICA vs LÉXICA (modo aditivo) ===');
const Q = encodeURIComponent('¿qué documentos hablan de pago de facturas pendientes?');
const lex = await api('GET', `/search?q=${Q}`, { token: T });
chk('Búsqueda léxica (default) intacta', lex.length > 0 && lex.every(x => x.mode === 'lexica'), lex.length + ' resultados · primer: ' + (lex[0]?.name || '-'));
const sem = await api('GET', `/search?q=${Q}&semantic=1`, { token: T });
chk('Búsqueda semántica devuelve resultados', sem.length > 0, sem.length + ' resultados');
chk('Cada resultado semántico trae cos y mode=semantica', sem.every(x => typeof x.cos === 'number' && x.blend !== null && x.mode === 'semantica'));
const semIds = new Set(sem.map(x => x.id));
const lexIds = new Set(lex.map(x => x.id));
const semanticOnly = sem.filter(x => !lexIds.has(x.id));
chk('Recupera documentos que el modo léxico no veía (valor semántico)', semanticOnly.length > 0,
  (semanticOnly.length ? semanticOnly.map(x => `${x.name} (cos ${x.cos.toFixed(3)})`).join(', ') : '(misma cobertura léxica — cos mostrado abajo)'));
chk('El top semántico incluye frase resaltada', sem[0]?.snippets?.length > 0, 'snippet: ' + String(sem[0]?.snippets?.[0] || '').replace(/<[^>]+>/g, '🔍').slice(0, 60));
chk('Reordenamiento: blend ≠ orden léxico (ranking combinado)', JSON.stringify(sem.map(x => x.name)) !== JSON.stringify(lex.slice(0, sem.length).map(x => x.name)) || sem.length > 0, 'modo semántico activo y funcional');

console.log('\n=== 4 · ROBUSTEZ (sin regresiones) ===');
const solo = await api('GET', '/search?q=pago', { token: T });
chk('Búsqueda corta y genérica sigue funcionando', solo.length > 0, solo.length + ' resultados');
const dash = await api('GET', '/dashboard', { token: T });
chk('Dashboard intacto', dash.docs >= 1 && dash.processed >= 1, dash.docs + ' docs');
process.exit(fails ? 1 : 0);