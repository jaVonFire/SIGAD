/* Smoke test E2E — SIGAD
   Levanta el servidor, autentica, sube un documento real del corpus,
   lo procesa con IA, consulta en lenguaje natural y valida el dashboard.
   Uso: node server/test/smoke.mjs
*/
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
const CORPUS = path.resolve(ROOT, '../11_Documentos_Prueba');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = msg => { console.error('✗ ' + msg); process.exitCode = 1; };
const pass = msg => console.log('✓ ' + msg);

let ok = true;
function check(name, cond, extra = ''){
  if (cond){ pass(name + (extra ? ' — ' + extra : '')); }
  else { ok = false; fail(name); }
}

async function api(path_, opts = {}){
  const res = await fetch(BASE + path_, opts);
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${path_} -> ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.data ?? body;
}

const child = spawn(process.execPath, ['server/index.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), DB_PATH: 'data/smoke.sqlite', UPLOADS_DIR: 'uploads/smoke' },
  stdio: ['ignore', 'pipe', 'pipe']
});
child.stdout.on('data', d => process.stdout.write('[srv] ' + d));
child.stderr.on('data', d => process.stderr.write('[srv-err] ' + d));
const stop = () => { try { child.kill(); } catch (e) {} };

let started = false;
for (let i = 0; i < 40; i++){
  try { await api('/api/system/info'); started = true; break; } catch (e) { await sleep(250); }
}
check('Servidor arranca y /api/system/info responde', started);

if (started){
  try {
    const info = await api('/api/system/info');
    check('Info de sistema', info.app === 'SIGAD');

    const { token } = await api('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'sigad2024' })
    });
    check('Login admin/analista seed funciona', !!token);
    const H = { Authorization: 'Bearer ' + token };

    const docErrado = await api('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'incorrecta' })
    }).then(() => 'no-error').catch(e => String(e.message));
    check('Login con contraseña incorrecta es rechazado', docErrado.includes('401'), docErrado);

    const repos = await api('/api/repos', { headers: H });
    check('Lista de repositorios', repos.some(r => r.name === 'General'), repos.length + ' repos');

    const file = path.join(CORPUS, 'FE-001.txt');
    const buf = fs.readFileSync(file);
    const fd = new FormData();
    fd.append('file', new Blob([buf]), 'FE-001.txt');
    fd.append('repoId', 'general');
    const rec = await api('/api/docs', { method: 'POST', headers: H, body: fd });
    check('Upload documento TXT', rec.status === 'pendiente', rec.name);

    const procResult = await api(`/api/docs/${rec.id}/process`, { method: 'POST', headers: H });
    const d = procResult.doc;
    check('Pipeline IA: estado procesado', d.status === 'procesado');
    check('Clasificación (debe ser Factura)', d.category === 'Factura', d.category + ' ' + (procResult.error || ''));
    check('Resumen generado (≥3 oraciones)', (d.summary || []).length >= 3, (d.summary || []).length + ' oraciones');
    check('Entidades extraídas', Object.values(d.entities || {}).reduce((a, b) => a + b.length, 0) > 0);
    check('Palabras contadas', (d.wordCount || 0) > 50, d.wordCount + ' palabras');

    const search = await api(`/api/search?q=total%20facturas`, { headers: H });
    const searchOk = search.length > 0 && String(search[0].name).includes('FE-001');
    if (!searchOk){
      console.error('DEBUG search ->', JSON.stringify(search).slice(0, 400));
    }
    check('Búsqueda TF-IDF devuelve el documento', searchOk, search.map(s => s.name).join(', '));

    const ans = await api('/api/ask', {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '¿Cuál es el valor total de la factura?' })
    });
    check('Asistente responde con fuentes', ans.type === 'answer' && (ans.sources || []).length > 0, ans.intent + ' · conf ' + Math.round(ans.conf * 100) + '%');

    const dash = await api('/api/dashboard', { headers: H });
    check('Dashboard consolida indicadores', dash.docs >= 1 && dash.processed >= 1, dash.docs + ' docs / ' + dash.processed + ' procesados');

    const me = await api('/api/auth/me', { headers: H });
    check('Endpoint /me', me.username === 'admin');

    const hist = await api('/api/chat', { headers: H });
    check('Historial de chat persistido', hist.length >= 2, hist.length + ' mensajes');
  } catch (e){
    ok = false; fail('Error en la ejecución: ' + e.message);
  }
}

stop();
await sleep(300);
if (fs.existsSync(path.join(ROOT, 'data/smoke.sqlite'))) {
  try { fs.unlinkSync(path.join(ROOT, 'data/smoke.sqlite')); fs.unlinkSync(path.join(ROOT, 'data/smoke.sqlite-wal')); } catch (e) { }
}
try { fs.rmSync(path.join(ROOT, 'uploads/smoke'), { recursive: true, force: true }); } catch (e) { }

console.log(ok ? '\nSMOKE TEST OK' : '\nSMOKE TEST CON ERRORES');
process.exit(ok ? 0 : 1);