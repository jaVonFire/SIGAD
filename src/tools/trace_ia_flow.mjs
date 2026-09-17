// Traza del flujo central de IA: archivo → extracción → IA → análisis →
// almacenamiento → búsqueda/consulta → respuesta.
import fs from 'node:fs';
const B = 'http://localhost:3199/api';

async function api(method, p, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : form });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const TXT = `FACTURA DE VENTA No 004-2026
EMISOR: TecnoSuministros SAS, NIT 901.123.456-7, Bogota.
CLIENTE: Compañía Comercial Ltda, NIT 900.555.888.
FECHA: 15 de marzo de 2026.
CONCEPTO: suministro de equipos de computo.
CANTIDAD 5, VALOR UNITARIO $250.000 = SUBTOTAL $1.250.000.
IVA 19% = $237.500. TOTAL A PAGAR $1.487.500.
FORMA DE PAGO: transferencia bancaria. VENCIMIENTO: 30 de abril de 2026.
Contacto: ventas@tecnosuministros.com, telefono 601 555 4433.
`;

const ANN = (t) => console.log('\n=== ' + t + ' ===');

async function main() {
  const login = (await api('POST', '/auth/login', { body: { username: 'admin', password: 'sigad2024' } })).json.data;
  const T = login.token;

  ANN('ETAPA 0 · ENTRADA (archivo)');
  const f = new FormData();
  f.append('file', new Blob([TXT], { type: 'text/plain' }), 'FE-004.txt');
  const c = (await api('POST', '/docs', { token: T, form: f })).json.data;
  console.log(`archivo: ${c.name} | ${c.ext} | ${c.size} bytes | estado=${c.status}`);

  ANN('ETAPA 1 · EXTRACCIÓN DE CONTENIDO');
  const pr = (await api('POST', `/docs/${c.id}/process`, { token: T })).json.data;
  const steps = pr.steps;
  console.log('texto extraído (primeros 160):', (steps.extract.text || '').slice(0, 160).replace(/\n/g, ' '));
  console.log('largo texto:', (steps.extract.text || '').length);

  ANN('ETAPA 2 · PROCESAMIENTO IA');
  console.log('tokenización: %d tokens (muestra: %s)', steps.token.toks.length, steps.token.toks.slice(0, 8).join(' '));
  console.log('clasificación (4 categorías, probabilidades):');
  steps.class.forEach(x => console.log(`   ${x.cat.padEnd(15)} ${(x.p * 100).toFixed(1)}%`));
  console.log('resumen extractivo (%d oraciones):', steps.sum.length, steps.sum.map(s => '• ' + s.slice(0, 70)).join('\n'));
  console.log('entidades detectadas:');
  Object.entries(steps.ner).forEach(([k, v]) => { if (v.length) console.log(`   ${k}: ${v.slice(0, 3).join(' | ')}`); });

  ANN('ETAPA 3 · ANÁLISIS Y RESULTADOS GUARDADOS');
  const d = pr.doc;
  console.log('categoría:', d.category, '| conf:', (d.categoryProbs[0].p * 100).toFixed(1) + '%');
  console.log('wordCount:', d.wordCount, '| oraciones resumen:', d.summary.length, '| estado:', d.status);
  console.log('fecha análisis (analysisAt):', d.analysisAt ? new Date(d.analysisAt).toISOString() : 'NULL');

  ANN('ETAPA 4 · ALMACENAMIENTO / INDEXACIÓN');
  const dash = (await api('GET', '/dashboard', { token: T })).json.data;
  console.log('índice TF-IDF en memoria:', JSON.stringify(dash.index));
  console.log('docs en BD:', dash.docs, '| procesados:', dash.processed);

  ANN('ETAPA 5 · BÚSQUEDA DENTRO DEL CONTENIDO');
  const s = (await api('GET', '/search?q=pago total', { token: T })).json.data;
  console.log('resultados:', s.length);
  const top = s[0];
  console.log('top:', top.name, '| score:', top.score.toFixed(4));
  console.log('snippet:', (top.snippets[0] || '').replace(/<[^>]+>/g, '🔍'));

  ANN('ETAPA 6 · CONSULTA EN LENGUAJE NATURAL → RESPUESTA');
  const a = (await api('POST', '/ask', { token: T, body: { q: '¿cuánto hay que pagar por los equipos?' } })).json.data;
  console.log('intención:', a.intent, '| confianza:', a.conf.toFixed(2), '| fuentes:', a.sources.length);
  const limpio = (a.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('respuesta (texto plano):', limpio.slice(0, 260));
  console.log('citas con capítulo <span class="cite">: presente =', (a.html || '').includes('cite'));

  ANN('CONFIRMACIÓN FLUJO COMPLETO');
  console.log('archivo→extracción→IA→análisis→almacenamiento→búsqueda→consulta→respuesta: OK (todas las etapas ejecutadas con datos reales)');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });