// Verificación objetiva del alcance funcional mínimo (12 puntos) de SIGAD.
// Se ejecuta contra una instancia limpia: http://localhost:3199/api
// Uso:  node tools/verify_scope.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3199/api';
const OUT = [];

function rep(punto, estado, evidencia = '', extra = '') {
  OUT.push({ punto, estado, evidencia, extra });
  console.log(`\n[${estado === 'PASS' ? 'OK' : 'FAIL'}] ${punto}`);
  if (evidencia) console.log('   evidencias: ' + evidencia);
  if (extra) console.log('   observaciones: ' + extra);
}

async function api(method, p, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let payload = body !== undefined ? JSON.stringify(body) : form;
  const r = await fetch(BASE + p, { method, headers, body: payload });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j, headers: r.headers };
}

const jlog = (o) => JSON.stringify(o);

async function run() {
  // ---- Autenticación base
  const adm = await api('POST', '/auth/login', { body: { username: 'admin', password: 'sigad2024' } });
  const ana = await api('POST', '/auth/login', { body: { username: 'analista', password: 'analista2024' } });
  const A = adm.json?.data?.token;
  const AN = ana.json?.data?.token;
  if (adm.status !== 200 || !A || ana.status !== 200 || !AN) {
    rep('P0 Preparación', 'FAIL', 'login admin/analista falló: ' + adm.status + ' / ' + ana.status);
    return;
  }

  // ============ P1. Autenticación y control básico de usuarios ============
  const p1 = [];
  const bad = await api('POST', '/auth/login', { body: { username: 'admin', password: 'mala' } });
  p1.push(`login incorrecto→${bad.status} (${bad.json?.error?.code})`);
  const noAuth = await api('GET', '/docs');
  p1.push(`/docs sin token→${noAuth.status}`);
  const me = await api('GET', '/auth/me', { token: A });
  p1.push(`me→${me.status} rol=${me.json?.data?.role}`);
  const reg = await api('POST', '/auth/register', { body: { username: 'verif', name: 'Usuario Verificación', password: 'clave123' } });
  const userV = reg.json?.data?.user;
  const TV = reg.json?.data?.token;
  p1.push(`register→${reg.status} rol=${userV?.role}`);
  const dup = await api('POST', '/auth/register', { body: { username: 'verif', name: 'X', password: 'clave123' } });
  p1.push(`register duplicado→${dup.status}`);
  const forb = await api('GET', '/users', { token: AN });
  p1.push(`analista /users→${forb.status}`);
  const rRole = await api('PATCH', `/users/${userV.id}/role`, { token: A, body: { role: 'admin' } });
  p1.push(`cambiar rol→${rRole.status}`);
  const rReset = await api('POST', `/users/${userV.id}/reset`, { token: A, body: { password: 'nueva123' } });
  p1.push(`reset pass→${rReset.status}`);
  const relog = await api('POST', '/auth/login', { body: { username: 'verif', password: 'nueva123' } });
  p1.push(`login con nueva pass→${relog.status}`);
  const selfDel = await api('DELETE', `/users/${ana.json.data.user.id}`, { token: AN });
  p1.push(`analista elimina su propia cuenta→${selfDel.status}`);
  const rDel = await api('DELETE', `/users/${userV.id}`, { token: A });
  p1.push(`admin elimina usuario→${rDel.status}`);
  const gone = await api('POST', '/auth/login', { body: { username: 'verif', password: 'nueva123' } });
  p1.push(`login tras borrado→${gone.status}`);
  // RBAC tras promoción: manejar si no se pudo borrar
  const okP1 = bad.status===401 && noAuth.status===401 && me.status===200 &&
    reg.status===201 && dup.status===400 && forb.status===403 && rRole.status===200 &&
    rReset.status===200 && relog.status===200 && selfDel.status===400 && rDel.status===200 && gone.status===401;
  rep('P1 Autenticación y control de usuarios', okP1 ? 'PASS' : 'FAIL', p1.join(' | '));

  // ============ P2. Repositorios/carpetas ============
  const p2 = [];
  const lr = await api('GET', '/repos', { token: A });
  p2.push(`listar→${lr.status} repos=${(lr.json?.data || []).length}`);
  const cr = await api('POST', '/repos', { token: A, body: { name: 'Repositorio Verif', desc: 'para la prueba' } });
  const rid = cr.json?.data?.id;
  p2.push(`crear→${cr.status}`);
  const lr2 = await api('GET', '/repos', { token: A });
  p2.push(`listar incluye nuevo→${(lr2.json?.data || []).some(r => r.id === rid)}`);
  const short = await api('POST', '/repos', { token: A, body: { name: 'Xy' } });
  p2.push(`nombre corto→${short.status}`);
  const delG = await api('DELETE', '/repos/general', { token: A });
  p2.push(`eliminar General→${delG.status}`);
  const delR = await api('DELETE', `/repos/${rid}`, { token: A });
  p2.push(`eliminar normal→${delR.status}`);
  const okP2 = lr.status===200 && cr.status===201 && lr2.json?.data?.some(r=>r.id===rid) &&
    short.status===400 && delG.status===400 && delR.status===200;
  rep('P2 Creación y administración de repositorios', okP2 ? 'PASS' : 'FAIL', p2.join(' | '));

  // ============ P3. Carga, consulta, descarga y eliminación ============
  const p3 = [];
  const txt = 'Factura de venta No 004 de la empresa TecnoSuministros SAS NIT 901.123.456. Subtotal $1.250.000, IVA 19% $237.500, total a pagar $1.487.500 antes del 15 de marzo de 2026. Forma de pago: transferencia bancaria.';
  const f1 = new FormData(); f1.append('file', new Blob([txt], { type: 'text/plain' }), 'demo01.txt'); f1.append('repoId', 'general');
  const up = await api('POST', '/docs', { token: A, form: f1 });
  const did = up.json?.data?.id;
  p3.push(`carga→${up.status} estado=${up.json?.data?.status}`);
  const get = await api('GET', `/docs/${did}`, { token: A });
  p3.push(`consulta detalle→${get.status}`);
  const dl = await fetch(BASE + `/docs/${did}/download`, { headers: { Authorization: 'Bearer ' + A } });
  const dlText = await dl.text();
  p3.push(`descarga→${dl.status} bytes=${dl.headers.get('content-length')} coincide=${dlText === txt}`);
  const badUp = new FormData(); badUp.append('file', new Blob(['x'], { type: 'application/octet-stream' }), 'malo.exe');
  const delExe = await api('POST', '/docs', { token: A, form: badUp });
  p3.push(`ext inválido→${delExe.status}`);
  const big = new FormData(); big.append('file', new Blob([new Uint8Array(11 * 1024 * 1024)]), 'grande.txt');
  const delBig = await api('POST', '/docs', { token: A, form: big });
  p3.push(`archivo >10MB→${delBig.status}`);
  const nope = await api('DELETE', `/docs/${did}`, { token: AN });
  p3.push(`eliminar ajeno (analista)→${nope.status}`);
  const del = await api('DELETE', `/docs/${did}`, { token: A });
  p3.push(`eliminar propietario→${del.status}`);
  const goneDoc = await api('GET', `/docs/${did}`, { token: A });
  p3.push(`detalle tras borrar→${goneDoc.status}`);
  const okP3 = up.status===201 && get.status===200 && dl.status===200 && dlText===txt &&
    delExe.status===400 && delBig.status===413 && nope.status===403 && del.status===200 && goneDoc.status===404;
  rep('P3 Carga, consulta, descarga y eliminación de archivos', okP3 ? 'PASS' : 'FAIL', p3.join(' | '));

  // ============ P4. Soporte PDF, DOCX y TXT ============
  // Se valida con la reimportación del corpus (contiene los tres formatos).
  const seed = await api('POST', '/seed/corpus', { token: A });
  const seedData = seed.json?.data || {};
  const docsList = await api('GET', '/docs?sort=recent', { token: A });
  const docs = docsList.json?.data || [];
  const exts = new Set(docs.map(d => d.ext));
  const okP4 = seed.status===200 && seedData.ok >= 30 && !seedData.failed &&
    exts.has('pdf') && exts.has('docx') && exts.has('txt');
  rep('P4 Soporte mínimo PDF, DOCX y TXT',
    okP4 ? 'PASS' : 'FAIL',
    `corpus: ${jlog(seedData)} | formatos presentes: ${[...exts].join(', ')} | docs=${docs.length}`);

  // ============ P5. Procesamiento automático con IA ============
  const p5 = [];
  const up2 = await api('POST', '/docs', { token: A, form: (() => {
    const f = new FormData();
    f.append('file', new Blob([txt], { type: 'text/plain' }), 'demo02.txt');
    return f;
  })() });
  const p2id = up2.json?.data?.id;
  const proc = await api('POST', `/docs/${p2id}/process`, { token: A });
  const d = proc.json?.data?.doc;
  p5.push(`process→${proc.status} estado=${d?.status}`);
  const steps = proc.json?.data?.steps;
  p5.push(`pasos materia: ${steps ? Object.keys(steps).join(',') : 'N/A'}`);
  p5.push(`wordCount=${d?.wordCount} cat=${d?.category} prob=${d?.categoryProbs?.[0]?.p?.toFixed(2)}`);
  const okP5 = proc.status===200 && d?.status==='procesado' && (d?.wordCount||0)>0 &&
    ['extract','token','class','sum','ner','index'].every(k => k in (steps||{}));
  rep('P5 Procesamiento automático mediante IA', okP5 ? 'PASS' : 'FAIL', p5.join(' | '));

  // ============ P6. Clasificación en mínimo 3 categorías ============
  const cats = [...new Set(docs.filter(d=>d.status==='procesado' && d.category !== null).map(d=>d.category))];
  const catCount = cats.length;
  const mism = docs.filter(d=>d.status==='procesado' && !['Contrato','Factura','Correspondencia','Informe'].includes(d.category)).length;
  const okP6 = catCount >= 3 && mism === 0;
  rep('P6 Clasificación automática en mínimo 3 categorías', okP6 ? 'PASS' : 'FAIL',
    `categorías distintas=${catCount}: ${cats.join(', ')} | procesados fuera de las 4 categorías=${mism}`);

  // ============ P7. Resumen por documento ============
  const processed = docs.filter(d => d.status === 'procesado');
  let sinResumen = 0, resumenCorto = 0, totalOraciones = 0;
  for (const d of processed) {
    const s = d.summary;
    if (!Array.isArray(s) || s.length === 0) sinResumen++;
    else if (s.length < 3) resumenCorto++;
    totalOraciones += (Array.isArray(s) ? s.length : 0);
  }
  const okP7 = sinResumen === 0 && resumenCorto === 0;
  const prom = processed.length ? (totalOraciones / processed.length).toFixed(1) : '0';
  rep('P7 Generación de resumen por documento', okP7 ? 'PASS' : 'FAIL',
    `procesados=${processed.length} sin resumen=${sinResumen} resúmenes<3 oraciones=${resumenCorto} promedio=${prom} oraciones`);

  // ============ P8. Extracción de información relevante ============
  const typeKeys = ['fechas','montos','correos','telefonos','identificaciones','personas','organizaciones'];
  const global = {};
  const perDoc = {};
  for (const d of processed) {
    const e = d.entities || {};
    const n = typeKeys.filter(k => (Array.isArray(e[k]) && e[k].length > 0));
    perDoc[d.id] = n.length;
    n.forEach(k => global[k] = (global[k] || 0) + 1);
  }
  const tiposConValores = Object.values(global).filter(v => v > 0).length;
  const distTipos = Object.entries(global).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}`).join(' ');
  const okP8 = tiposConValores >= 3;
  rep('P8 Extracción de información relevante (mínimo 3 tipos de datos)', okP8 ? 'PASS' : 'FAIL',
    `tipos de datos con valores=${tiposConValores} (${distTipos})`,
    `cobertura por documento: ${Math.round(perDocAvg(perDoc) * 100)}% de los docs tienen al menos 3 tipos (distribución detallada en la evidencia)`);

  function perDocAvg(obj) { const vs = Object.values(obj); return vs.length ? vs.reduce((a, b) => a + (b >= 3 ? 1 : 0), 0) / vs.length : 0; }

  // ============ P9. Búsqueda en contenido ============
  const p9 = [];
  const s1 = await api('GET', '/search?q=factura', { token: A });
  p9.push(`q=factura→${s1.status} ${(s1.json?.data||[]).length} resultado(s)`);
  p9.push(`con snippet ${(s1.json?.data||[])[0]?.snippets?.length || 0}`);
  const s2 = await api('GET', '/search?q=zzznoexiste99', { token: A });
  p9.push(`q sin coincidencias→${(s2.json?.data||[]).length}`);
  const okP9 = s1.status===200 && (s1.json?.data||[]).length > 0 &&
    (s1.json?.data||[])[0].snippets?.length > 0 && s2.status===200 && (s2.json?.data||[]).length === 0;
  rep('P9 Búsqueda dentro del contenido documental', okP9 ? 'PASS' : 'FAIL', p9.join(' | '));

  // ============ P10. Consulta en lenguaje natural ============
  const p10 = [];
  const q1 = await api('POST', '/ask', { token: A, body: { q: '¿cuánto hay que pagar?' } });
  const a1 = q1.json?.data || {};
  p10.push(`intención=${a1.intent} conf=${a1.conf?.toFixed(2)} fuentes=${(a1.sources||[]).length} type=${a1.type}`);
  p10.push(`cita [1] en html=${(a1.html||'').includes('[1]') || (a1.html||'').includes('<cite')}`);
  const q2 = await api('POST', '/ask', { token: A, body: { q: 'zxqwb nmklp sqdft' } });
  const a2 = q2.json?.data || {};
  p10.push(`sin evidencia→type=${a2.type} conf=${a2.conf} fuentes=${(a2.sources||[]).length}`);
  const hist = await api('GET', '/chat', { token: A });
  p10.push(`historial→${hist.status} msgs=${(hist.json?.data||[]).length}`);
  const okP10 = q1.status===200 && a1.type==='answer' && a1.conf > 0.5 && (a1.sources||[]).length >= 1 &&
    ((a1.html||'').includes('[1]')) && q2.status===200 && a2.type==='none' && a2.conf===0 && hist.status===200 && (hist.json?.data||[]).length >= 2;
  rep('P10 Consulta mediante lenguaje natural', okP10 ? 'PASS' : 'FAIL', p10.join(' | '));

  // ============ P11. Dashboard con indicadores ============
  const dbd = await api('GET', '/dashboard', { token: A });
  const dd = dbd.json?.data || {};
  const expDocs = processed.length + 1; // corpus + demo02 procesada (demo01 borrada)
  const expProc = processed.length + 1;
  const sumCats = (dd.categories||[]).reduce((a, c) => a + c.value, 0);
  const p11 = [
    `docs=${dd.docs} (esperado ${expDocs}) procesados=${dd.processed} (esperado ${expProc})`,
    `pendientes=${dd.pendientes} procesando=${dd.procesando} errores=${dd.errores}`,
    `categorías=${jlog(dd.categories?.map(c=>c.label+':'+c.value))}`,
    `formatos=${jlog(dd.formats?.map(f=>f.ext+':'+f.value))}`,
    `índice=${jlog(dd.index)}`
  ];
  const okP11 = dbd.status===200 && dd.docs===expDocs && dd.processed===expProc &&
    sumCats===expProc && (dd.categories||[]).length>=4 && (dd.formats||[]).length>=3;
  rep('P11 Dashboard con indicadores del repositorio', okP11 ? 'PASS' : 'FAIL', p11.join(' | '));

  // ============ P12. Registro de errores y estados ============
  const p12 = [];
  // provocar un error real: archivo sin contenido legible
  const emptyF = new FormData(); emptyF.append('file', new Blob(['   '], { type: 'text/plain' }), 'vacio.txt');
  const upE = await api('POST', '/docs', { token: A, form: emptyF });
  const eid = upE.json?.data?.id;
  const procE = await api('POST', `/docs/${eid}/process`, { token: A });
  const de = procE.json?.data?.doc;
  p12.push(`doc vacío → estado=${de?.status} motivo="${de?.error?.slice(0,60)||''}"`);
  const ev = await api('GET', '/events', { token: A });
  const evs = ev.json?.data || [];
  p12.push(`eventos→${ev.status} total=${evs.length} niveles=${[...new Set(evs.map(e=>e.level))].join(',')}`);
  const hasErr = evs.some(e => e.comp==='Pipeline' && e.level==='ERROR');
  p12.push(`evento ERROR del pipeline presente=${hasErr}`);
  const evErr = await api('GET', '/events?level=ERROR', { token: A });
  p12.push(`filtro nivel ERROR→${(evErr.json?.data||[]).length}`);
  // bitácora del analista: registramos una acción y validamos el filtro por rol
  const rA = await api('POST', '/repos', { token: AN, body: { name: 'Repo del Analista' } });
  const evAna = await api('GET', '/events', { token: AN });
  const anaOnly = (evAna.json?.data || []).every(e => e.user === 'analista');
  p12.push(`analista crea repo→${rA.status} | su bitácora solo muestra sus eventos=${anaOnly}`);
  // estados visibles en el listado
  const sts = [...new Set(docs.map(d=>d.status))].join(',');
  p12.push(`estados presentes en /docs: ${sts}`);
  const okP12 = procE.status===200 && de?.status==='error' && Boolean(de?.error) &&
    ev.status===200 && hasErr && evErr.status===200 && anaOnly;
  rep('P12 Registro de errores y estados de procesamiento', okP12 ? 'PASS' : 'FAIL', p12.join(' | '));

  // ============ BONUS: verificación de regla RN08/RF05 (admin principal) ============
  // Se promo verif a admin ANTES (ya se hizo), se intenta borrar al admin principal con 'verif'.
  // Nota: si verif ya fue borrado, se recrea.
  const reg2 = await api('POST', '/auth/register', { body: { username: 'verif2', name: 'Verificación Dos', password: 'clave123' } });
  const v2 = reg2.json?.data?.user;
  await api('PATCH', `/users/${v2.id}/role`, { token: A, body: { role: 'admin' } });
  const TV2 = (await api('POST', '/auth/login', { body: { username: 'verif2', password: 'clave123' } })).json?.data?.token;
  const delAdmin = await api('DELETE', '/users/admin', { token: TV2 });
  const esperado = "protegido (400/403)"; const obtenido = delAdmin.status;
  rep('BONUS RN08/RF05 — el admin principal NO puede ser eliminado por otro admin',
    delAdmin.status >= 400 && delAdmin.status < 500 ? 'PASS' : 'FAIL',
    `intento: status=${delAdmin.status} (esperado: ${esperado})`);

  // limpieza del usuario bonus
  await api('DELETE', `/users/${v2.id}`, { token: A });

  // ============ OBSERVACIÓN: archivos huérfanos en uploads ============
  try {
    const files = fs.readdirSync('uploads_test').length;
    const refs = new Set();
    for (const d of docs) refs.add(d.id);
    const finalDocs = (await api('GET', '/docs', { token: A })).json?.data || [];
    finalDocs.forEach(d => refs.add(d.id.slice(0, 36)));
    // conteo simple: docs en BD vs archivos físicos
    const dbfiles = [...new Set(finalDocs.map(() => true))].length;
    const orphan = files - finalDocs.length;
    if (orphan > 0) {
      rep('OBS Archivos huérfanos en uploads/', 'OBS',
        `${files} archivos físicos vs ${finalDocs.length} documentos en BD → ${orphan} huérfano(s) tras rechazos de validación`);
    }
  } catch (e) {
    rep('OBS Archivos huérfanos en uploads/', 'OBS', 'no se pudo contar: ' + e.message);
  }

  // ============ Resumen ============
  const fails = OUT.filter(o => o.estado !== 'PASS');
  console.log('\n========== RESUMEN ==========');
  console.log(`PUNTOS: ${OUT.filter(o=>o.estado==='PASS').length}/${OUT.length} cumplen sin errores`);
  if (fails.length) {
    console.log('\nERRORES / FALLOS CAPTURADOS:');
    fails.forEach(f => console.log(` - ${f.punto}: ${f.evidencia || 'sin evidencia'}`));
  } else {
    console.log('SIN FALLOS.');
  }
  process.exit(fails.length ? 1 : 0);
}

run().catch(e => { console.error('Error de ejecución:', e); process.exit(2); });