import { Index } from './tfidf.js';
import { expand } from './tokenizer.js';
import { extractEntities, toNum } from './entities.js';
import { config } from '../config.js';
import { parseJson } from '../db.js';

/* ---------- RAG extractivo (consulta en lenguaje natural) ----------
   Flujo: pregunta -> intención -> expansión léxica -> recuperación TF-IDF
   (documentos + fragmentos) -> composición de respuesta con citas [n].
   Soporta modo docId para acotar la consulta a un solo documento.
*/

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function detectIntent(q){
  const l = norm(q);
  /* Conteo: "¿cuántos documentos hay (en total)?", "¿cuántas facturas hay?" */
  const cuentaCosas = /\bcu[aá]nt(os|as)\b/.test(l) || /\bcantidad de\b/.test(l) || /\bhay\s+en\s+total\b/.test(l);
  const cosasContables = /\b(documentos?|archivos?|facturas?|contratos?|informes?|correspondencias?|repositorios?|pdfs?|docx?|txts?|soportes?)\b/.test(l);
  if (cuentaCosas && cosasContables) return 'count';
  /* Pagos pendientes: "¿qué documentos están pendientes de pago?" (listado, no suma) */
  if (/\b(pendientes?\s+de\s+pago|pago\s+pendiente|por\s+pagar|sin\s+pagar)\b/.test(l) &&
      !/(suma|asciende|cu[aá]nto\s+(es|suma|asciende))/.test(l)) return 'pending';
  /* Narrativa: "¿qué dice/habla/menciona/contiene...?" pide contenido, no una suma */
  if (/\b(qu[eé]\s+(dice|habla|menciona|contiene|incluye)|hablan)\b/.test(l)) return 'what';
  const discurso = /\b(sobre|acerca de|relacionad|referente)\b/.test(l);
  const cantidadKw = /(cu[aá]nto|suma|total|valor|monto|saldo|precio|pagar|pago)/.test(l);
  if (discurso && !cantidadKw) return 'what';
  if (/(cuanto|valor|monto|precio|costo|suma|pagar|pago|recaudo|saldo)/.test(l)) return 'money';
  if (/(cuando|fecha|plazo|vence|vencimiento|vigencia|hasta)/.test(l)) return 'date';
  if (/(quien|quienes|responsable|empresa|persona|emisor|remitente|parte|contratante)/.test(l)) return 'who';
  /* Catálogo solo cuando NO es una pregunta sobre contenido ("qué documentos HAY/SON/lista") */
  if (/cu[aá]les\s+(documentos|son)|documentos?\s+(hay|existen|son|en\s+total|tiene)|(lista|enumera)\b/.test(l) &&
      !discurso) return 'cat';
  return 'what';
}

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function looseRegex(term){
  const map = { a:'aáà', e:'eéè', i:'iíì', o:'oóò', u:'uúüù' };
  const pat = term.split('').map(ch => map[ch] ? '[' + map[ch] + ']' : ch).join('');
  return new RegExp('\\b' + pat + '\\w{0,3}', 'gi');
}
export function highlight(text, terms){
  let html = esc(text);
  (terms || []).filter(t => /^[a-z0-9]{4,}$/.test(t)).forEach(t => {
    html = html.replace(looseRegex(t), m => '<mark>' + m + '</mark>');
  });
  return html;
}

const cited = (sources, s) => '<span class="cite">[' + (sources.indexOf(s) + 1) + ']</span>';

function askBody(sources, terms){
  const picks = [];
  sources.slice(0, 3).forEach(s => { if (s.snippets[0]) picks.push({ s, text: s.snippets[0] }); });
  return '<p class="ans-lead">Según ' + picks.length + ' fragmento(s) recuperado(s) del repositorio:</p><ul class="ans-list">' +
    picks.map(p => '<li>' + highlight(p.text, terms) + ' ' + cited(sources, p.s) + '</li>').join('') + '</ul>';
}

function askGeneric(sources, terms){
  return { type:'answer', intent:'what', conf:0.25, terms, sources, html: askBody(sources, terms) };
}

async function buildDocAnswer(q, intent, terms, sources, html){
  const conf = Math.min(1, (sources[0]?.score || 0) * 2.2);
  const answer = { type:'answer', intent, conf, terms, sources, html };
  return await augmentWithLlm(answer, q);
}

async function augmentWithLlm(answer, q){
  if (!(config.ai.base && config.ai.key)) return answer;
  if (answer.type !== 'answer' || !answer.sources.length) return answer;
  try {
    const ctx = answer.sources.map((s, i) =>
      `[${i + 1}] ${s.name}\n${(s.snippets || []).join('\n')}`).join('\n\n');
    const r = await fetch(config.ai.base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.ai.key },
      body: JSON.stringify({
        model: config.ai.model, temperature: 0.3,
        messages: [
          { role: 'system', content: 'Responde SOLO con base en el contexto entregado. Si el contexto no responde la pregunta, di que no hay información suficiente. Cita las fuentes con [n]. No inventes datos. Usa viñetas si el usuario lo pide o si da claridad.' },
          { role: 'user', content: `Pregunta: ${q}\n\nContexto de documentos:\n${ctx}` }
        ]
      })
    });
    if (r.ok){
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content?.trim();
      if (text){
        answer.html = '<p class="ans-lead">Respuesta sintetizada con IA a partir de los documentos:</p><div class="ans-llm">' + esc(text).replace(/\n/g, '<br>') + '</div>';
        answer.llm = true;
      }
    }
  } catch (e){ answer.llmError = String(e.message || e); }
  return answer;
}

/* --- Catálogo de documentos --- */
const CATEGORIES = ['Contrato', 'Factura', 'Correspondencia', 'Informe'];

function catalogAnswer(q, docs){
  const l = q.toLowerCase();
  const cat = CATEGORIES.find(c => l.toLowerCase().includes(c.toLowerCase()));
  let list;
  if (cat) list = docs.filter(d => d.category === cat);
  else list = docs.filter(d => d.status === 'procesado');
  if (!list.length) return null;

  let lead;
  if (cat){
    lead = `<p class="ans-lead">Encontré <b>${list.length}</b> documento(s) de la categoría «${esc(cat)}»:</p>`;
  } else {
    const byCat = {};
    list.forEach(d => { const k = d.category || 'Sin categoría'; byCat[k] = (byCat[k] || 0) + 1; });
    const chips = Object.entries(byCat).map(([k, n]) => `<span class="tag-chip">${esc(k)} · ${n}</span>`).join(' ');
    lead = `<p class="ans-lead">El repositorio tiene <b>${list.length}</b> documento(s) procesado(s):</p>` +
      (chips ? `<div class="ans-meta">${chips}</div>` : '');
  }

  const rows = list.slice(0, 10).map(d =>
    `<li><b>${esc(d.name)}</b> <span class="tag">${esc(d.category || 'sin categoría')}</span> <span class="dim">${(d.wordCount || 0).toLocaleString('es-CO')} palabras</span></li>`
  ).join('');
  const extra = list.length > 10 ? `<p class="dim">… y ${list.length - 10} documento(s) más.</p>` : '';

  return {
    type:'answer', intent:'cat', conf:0.9,
    terms: expand(q).map(x => x.t),
    sources: list.slice(0, 5).map((d, i) => ({ n: i + 1, id: d.id, name: d.name, category: d.category })),
    html: lead + `<ul class="ans-list">${rows}</ul>` + extra
  };
}

/* --- Respuestas agregadas sobre TODOS los documentos ---
   Para preguntas generales ("todos los documentos") se tienen en cuenta
   TODOS los documentos cargados y procesados, agregando sus entidades
   almacenadas en lugar de limitarse a los mejor puntuados por TF-IDF.
*/
function entFromDoc(d){
  /* parseJson desanida JSON anidado/codificado múltiples veces (datos legados). */
  return d && d.entities ? parseJson(d.entities) : null;
}

function gather(key, docs, cat){
  const pool = cat
    ? docs.filter(d => d.status === 'procesado' && d.category === cat)
    : docs.filter(d => d.status === 'procesado');
  const out = [];
  pool.forEach(d => {
    const e = entFromDoc(d);
    const vals = (e && e[key]) ? e[key].slice(0, 8) : [];
    if (vals.length) out.push({ doc: d, vals });
  });
  return out;
}

const citeFor = (sources, id) => {
  const i = sources.findIndex(s => s.id === id);
  return i < 0 ? '' : cited(sources, sources[i]);
};

function countAnswer(q, docs){
  const l = norm(q);
  const processed = docs.filter(d => d.status === 'procesado');
  const pendientes = docs.filter(d => d.status === 'pendiente' || d.status === 'procesando');
  const errores = docs.filter(d => d.status === 'error');
  const total = docs.length;

  const cat = CATEGORIES.find(c => l.includes(c.toLowerCase())) || null;
  const ext = /\bpdf\b/.test(l) ? 'pdf' : /\bdocx\b/.test(l) ? 'docx' : /\btxt\b/.test(l) ? 'txt' : null;

  const byCat = {};
  processed.forEach(d => { const k = d.category || 'Sin categoría'; byCat[k] = (byCat[k] || 0) + 1; });
  const chips = Object.keys(byCat).length
    ? '<div class="ans-meta">' + Object.entries(byCat).map(([k, n]) => `<span class="tag-chip">${esc(k)} · ${n}</span>`).join(' ') + '</div>'
    : '';

  let extra = '';
  if (cat){
    const list = processed.filter(d => d.category === cat);
    extra = `<p class="dim">De los procesados, <b>${list.length}</b> pertenece(n) a la categoría «${esc(cat)}»:</p><ul class="ans-list">` +
      list.slice(0, 10).map(d => `<li><b>${esc(d.name)}</b> <span class="tag">${esc(d.category)}</span></li>`).join('') + `</ul>` +
      (list.length > 10 ? `<p class="dim">… y ${list.length - 10} más.</p>` : '');
  } else if (ext){
    const list = processed.filter(d => d.ext === ext);
    extra = `<p class="dim">De los procesados, <b>${list.length}</b> está(n) en formato <b>${ext.toUpperCase()}</b>.</p>`;
  }

  return {
    type: 'answer', intent: 'count', conf: 0.97, q,
    terms: expand(q).filter(x => x.t.length >= 4).map(x => x.t),
    sources: processed.slice(0, 5).map((d, i) => ({ n: i + 1, id: d.id, name: d.name, category: d.category })),
    html:
      `<p class="ans-lead">En el repositorio hay <b>${total}</b> documento(s) en total.</p>` +
      `<ul class="ans-list">` +
        `<li>✅ <b>${processed.length}</b> procesado(s) con IA</li>` +
        `<li>🕒 <b>${pendientes.length}</b> pendiente(s) de procesamiento</li>` +
        `<li>⚠️ <b>${errores.length}</b> con error</li>` +
      `</ul>` +
      chips +
      extra
  };
}

function moneyAnswer(q, docs){
  const cat = CATEGORIES.find(c => norm(q).includes(c.toLowerCase())) || null;
  const rows = gather('montos', docs, cat);
  if (!rows.length) return null;
  const out = rows.map(r => ({ id: r.doc.id, name: r.doc.name, category: r.doc.category || null }));
  let total = 0, n = 0;
  rows.forEach(r => r.vals.forEach(v => { total += toNum(v); n++; }));
  const lead = cat
    ? `<p class="ans-lead">En <b>${rows.length}</b> documento(s) de la categoría «${esc(cat)}», detecté <b>${n}</b> valor(es):</p>`
    : `<p class="ans-lead">En <b>${rows.length}</b> documento(s) del repositorio detecté <b>${n}</b> mención(es) de valor:</p>`;
  return {
    type: 'answer', intent: 'money', conf: 0.92, q,
    terms: expand(q).filter(x => x.t.length >= 4).map(x => x.t),
    sources: out,
    html:
      lead +
      '<ul class="ans-list">' +
      rows.slice(0, 8).map(r => `<li><b>${esc(r.doc.name)}</b> — ${r.vals.map(v => '<span class="mono">' + esc(v) + '</span>').join(' · ')} ${citeFor(out, r.doc.id)}</li>`).join('') +
      '</ul>' +
      (rows.length > 8 ? `<p class="dim">… y ${rows.length - 8} documento(s) más con valores.</p>` : '') +
      (n > 1 ? `<div class="ans-total">Σ Total detectado: $${total.toLocaleString('es-CO')}</div>` : '')
  };
}

function dateAnswer(q, docs){
  const cat = CATEGORIES.find(c => norm(q).includes(c.toLowerCase())) || null;
  const rows = gather('fechas', docs, cat);
  if (!rows.length) return null;
  const out = rows.map(r => ({ id: r.doc.id, name: r.doc.name, category: r.doc.category || null }));
  return {
    type: 'answer', intent: 'date', conf: 0.88, q,
    terms: expand(q).filter(x => x.t.length >= 4).map(x => x.t),
    sources: out,
    html:
      `<p class="ans-lead">Fechas mencionadas en <b>${rows.length}</b> documento(s) del repositorio:</p><ul class="ans-list">` +
      rows.slice(0, 8).map(r => `<li><b>${esc(r.doc.name)}</b> — ${r.vals.slice(0, 5).map(v => '<span class="mono">' + esc(v) + '</span>').join(' · ')} ${citeFor(out, r.doc.id)}</li>`).join('') + '</ul>' +
      (rows.length > 8 ? `<p class="dim">… y ${rows.length - 8} documento(s) más.</p>` : '')
  };
}

function whoAnswer(q, docs){
  const cat = CATEGORIES.find(c => norm(q).includes(c.toLowerCase())) || null;
  const pool = cat
    ? docs.filter(d => d.status === 'procesado' && d.category === cat)
    : docs.filter(d => d.status === 'procesado');
  const rows = [];
  pool.forEach(d => {
    const e = entFromDoc(d);
    const vals = [
      ...((e && e.personas) ? e.personas : []).slice(0, 3),
      ...((e && e.organizaciones) ? e.organizaciones : []).slice(0, 2)
    ];
    if (vals.length) rows.push({ doc: d, vals });
  });
  if (!rows.length) return null;
  const out = rows.map(r => ({ id: r.doc.id, name: r.doc.name, category: r.doc.category || null }));
  return {
    type: 'answer', intent: 'who', conf: 0.9, q,
    terms: expand(q).filter(x => x.t.length >= 4).map(x => x.t),
    sources: out,
    html:
      `<p class="ans-lead">Personas y organizaciones identificadas en <b>${rows.length}</b> documento(s) del repositorio:</p><ul class="ans-list">` +
      rows.slice(0, 8).map(r => `<li><b>${esc(r.doc.name)}</b> — ${r.vals.map(v => esc(v)).join(' · ')} ${citeFor(out, r.doc.id)}</li>`).join('') + '</ul>' +
      (rows.length > 8 ? `<p class="dim">… y ${rows.length - 8} documento(s) más.</p>` : '')
  };
}

/* --- Banco de respuestas: saludos, ayuda y avisos --- */
const GENERAL_SUGGESTIONS = [
  '¿Qué documentos hay en el repositorio?',
  '¿Cuáles documentos son facturas?',
  '¿Cuáles documentos son informes?',
  '¿Qué documentos están pendientes de pago?',
  '¿Cuánto suman los valores de las facturas?',
  '¿Quién emitió las facturas?'
];
const DOC_SUGGESTIONS = [
  'Resume este documento',
  '¿De qué trata?',
  '¿Qué valores o montos aparecen?',
  '¿Qué fechas menciona?',
  '¿Quiénes aparecen?',
  '¿Hay algo relacionado con pagos?'
];

function isGreeting(q){
  const l0 = String(q || '').trim().toLowerCase();
  return /^(hola|buenas?(\s+(tardes|noches))?|buenos?\s+d[ií]as|hey|saludos|qu[eé]\s+tal)\b/.test(l0)
    || /^(gracias|muchas gracias|perfecto|genial|excelente|ok|vale)\b/.test(l0);
}

function isHelp(q){
  const l = String(q || '').trim().toLowerCase();
  return /\b(ayuda|ay[uú]dame|qu[eé]\s+puedes\s+hacer|qu[eé]\s+haces|c[oó]mo\s+(funciona|us[aeo]r|trabaja)|funcionamiento|manual\s*de\s*uso)\b/.test(l);
}

function greetingAnswer(q, docs){
  const proc = docs.filter(d => d.status === 'procesado');
  const single = proc.length === 1;
  const suggestions = single ? DOC_SUGGESTIONS : GENERAL_SUGGESTIONS;
  return {
    type:'answer', intent:'saludo', conf:1, q, terms: [],
    sources: [],
    html:
      `<p>¡Hola! 👋 Soy el asistente IA de <b>SIGAD</b>. ${single
        ? `Ahora mismo consulto <b>${esc(proc[0].name)}</b> y responderé SOLO con su contenido.`
        : `Tengo <b>${proc.length}</b> documento(s) procesado(s) en el repositorio.`}</p>` +
      `<div class="ans-lead">Intenta con algo como:</div><ul class="ans-list">` +
      suggestions.map(s => `<li>${esc(s)}</li>`).join('') + `</ul>` +
      `<p class="dim">💡 Usa el selector de arriba para elegir <b>un documento concreto</b> o volver a <b>todos los documentos</b>.</p>`
  };
}

function helpAnswer(q, docs){
  const proc = docs.filter(d => d.status === 'procesado');
  const single = proc.length === 1;
  return {
    type:'answer', intent:'help', conf:1, q, terms: [],
    sources: [],
    html:
      `<div class="ans-lead">¿Qué puedo hacer? Estas son mis capacidades:</div>` +
      `<ul class="ans-list">` +
      `<li>📚 <b>Catálogo:</b> "¿cuáles documentos son facturas?" o "lista los informes".</li>` +
      `<li>💰 <b>Valores:</b> "¿cuánto suman los pagos?" o "total de la factura FE-003".</li>` +
      `<li>📅 <b>Fechas:</b> "¿qué fechas de vencimiento aparecen?".</li>` +
      `<li>🏢 <b>Entidades:</b> "¿quién emitió las facturas?".</li>` +
      `<li>ℹ️ <b>Contenido:</b> "¿hay algo sobre retiro de mercancía?".</li>` +
      `<li>🔢 <b>Conteo:</b> "¿cuántos documentos hay en el repositorio?".</li>` +
      `</ul>` +
      (single
        ? `<p class="dim">Como consulto <b>${esc(proc[0].name)}</b>, responderé solo con su contenido. Pide el <b>resumen</b> para empezar.</p>`
        : `<p class="dim">💡 Para consultar <b>un solo documento</b>, selecciónalo en el selector de arriba.</p>`)
  };
}

function noneAnswer({ q, terms = [], conf = 0, intent = 'what', note = '', suggestions = [] }){
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '');
  const uniq = suggestions.filter(s => norm(s) !== norm(q));
  return {
    type:'none', intent, q, terms, conf, sources: [],
    html: note +
      (uniq.length
        ? `<div class="ans-lead">Prueba con algo como:</div><ul class="ans-list">` + uniq.map(s => `<li>${esc(s)}</li>`).join('') + `</ul>`
        : '')
  };
}

/* --- Respuesta acotada a un documento --- */
async function scopedAnswer(q, terms, d){
  if (String(q).trim().length <= 55 && isGreeting(q)) return greetingAnswer(q, [d]);
  if (isHelp(q)) return helpAnswer(q, [d]);
  const intent = detectIntent(q);
  const src = { id: d.id, name: d.name, category: d.category || null, score: 1, snippets: Index.bestSnippets(d.id, q, 4) || [] };
  const conf = 0.82;
  const docLabel = '<b>' + esc(d.name) + '</b>';

  const lq = q.toLowerCase();

  /* Resumen del documento */
  if (/(resum|de qu[eé]\s+trata|sinte|tema\s+principal|conclu|cu[ée]ntame)/.test(lq)){
    let sum = d.summary;
    if (typeof sum === 'string') try { sum = JSON.parse(sum); } catch(e){ sum = null; }
    if (Array.isArray(sum) && sum.length){
      return await buildDocAnswer(q, 'what', terms, [src],
        `<p class="ans-lead">Resumen de ${docLabel}:</p><ul class="ans-list">` +
        sum.map(s => `<li>• ${esc(s)}</li>`).join('') + '</ul>');
    }
    return await buildDocAnswer(q, 'what', terms, src.snippets.length ? [src] : [],
      src.snippets.length
        ? `<p class="ans-lead">Fragmentos relevantes de ${docLabel}:</p><ul class="ans-list">${src.snippets.map(s => `<li>${highlight(s, terms)}</li>`).join('')}</ul>`
        : `<p>No hay un resumen generado para ${docLabel}. Prueba a reformular tu pregunta o usa la vista de detalles para ver su contenido procesado.</p>`);
  }

  const ents = extractEntities(String(d.text || ''));
  const rows = [];

  if (intent === 'money'){
    const flat = ents.montos.slice(0, 6);
    if (flat.length){
      const total = flat.reduce((a, v) => a + toNum(v), 0);
      rows.push(...flat.map(v => `<li><b>Valor:</b> <span class="mono">${esc(v)}</span></li>`).join(''));
      return await buildDocAnswer(q, intent, terms, [src],
        `<p class="ans-lead">Valores encontrados en ${docLabel}:</p><ul class="ans-list">${flat.map(v => `<li><b>Valor:</b> <span class="mono">${esc(v)}</span></li>`).join('')}</ul>` +
        `<div class="ans-total">Σ ${flat.length} valor(es): $${total.toLocaleString('es-CO')}</div>`);
    }
  } else if (intent === 'date'){
    const flat = ents.fechas.slice(0, 6);
    if (flat.length) return await buildDocAnswer(q, intent, terms, [src],
      `<p class="ans-lead">Fechas mencionadas en ${docLabel}:</p><ul class="ans-list">${flat.map(v => `<li><span class="mono">${esc(v)}</span></li>`).join('')}</ul>`);
  } else if (intent === 'who'){
    const actors = [...ents.personas.slice(0, 4), ...ents.organizaciones.slice(0, 4)];
    if (actors.length) return await buildDocAnswer(q, intent, terms, [src],
      `<p class="ans-lead">Actores / personas en ${docLabel}:</p><ul class="ans-list">${actors.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`);
  }

  /* Respuesta extractiva genérica */
  if (src.snippets.length){
    return await buildDocAnswer(q, intent, terms, [src],
      `<p class="ans-lead">Según ${docLabel}:</p><ul class="ans-list">` +
      src.snippets.map(s => `<li>${highlight(s, terms)}</li>`).join('') + '</ul>');
  }

  return noneAnswer({ q, terms, intent, note: `<p>No encontré información directa sobre eso dentro de ${docLabel}.</p>`, suggestions: DOC_SUGGESTIONS });
}

/* --- Punto de entrada --- */
let listDocsForAsk = async () => [];

export function setDocsLoader(fn){ listDocsForAsk = fn; }

export async function ask(q, opts){
  const docId = opts?.docId || null;
  const docs = await listDocsForAsk();
  const byId = new Map(docs.map(d => [d.id, d]));

  /* Consulta acotada a un documento */
  if (docId){
    const d = byId.get(docId);
    if (!d) return { ...noneAnswer({ q, terms: expand(q).map(x => x.t), intent: 'none', note: '<p>El documento seleccionado ya no existe en el repositorio.</p>' }), docId, docName: null };
    if (d.status !== 'procesado'){
      return { ...noneAnswer({ q, terms: expand(q).map(x => x.t), intent: 'none',
        note: '<p>Este documento <b>aún no ha sido procesado</b> con IA. Dirígete a su detalle y pulsa <b>"Procesar con IA"</b> para poder consultarlo en el chat.</p>',
        suggestions: DOC_SUGGESTIONS.slice(0, 3) }), docId, docName: d.name };
    }
    const ans = await scopedAnswer(q, expand(q).filter(x => x.t.length >= 4).map(x => x.t), d);
    ans.docId = docId;
    ans.docName = d.name;
    return ans;
  }

  if (String(q).trim().length <= 55 && isGreeting(q)) return greetingAnswer(q, docs);
  if (isHelp(q)) return helpAnswer(q, docs);

  const intent = detectIntent(q);
  const terms = expand(q).filter(x => x.t.length >= 4).map(x => x.t);

  /* Catálogo: "¿cuáles documentos son X?" */
  if (intent === 'cat'){
    const catAns = catalogAnswer(q, docs);
    if (catAns) return catAns;
  }

  /* Conteo: "¿cuántos documentos hay en total?" — responde sobre TODOS los documentos cargados */
  if (intent === 'count') return countAnswer(q, docs);

  /* Respuestas sobre "todos los documentos": se agregan TODOS los documentos cargados
     y procesados (no solo los mejor puntuados por TF-IDF) usando sus entidades. */
  if (intent === 'money'){
    const agg = moneyAnswer(q, docs);
    if (agg) return augmentWithLlm(agg, q);
  } else if (intent === 'date'){
    const agg = dateAnswer(q, docs);
    if (agg) return agg;
  } else if (intent === 'who'){
    const agg = whoAnswer(q, docs);
    if (agg) return agg;
  }

  const ranked = Index.scoreQuery(q).slice(0, 4);

  if (!ranked.length || ranked[0].score < 0.015){
    return noneAnswer({ q, terms, note: '<p>No encontré documentos relacionados con tu pregunta.</p>', suggestions: GENERAL_SUGGESTIONS });
  }

  const sources = ranked.map(r => ({
    id: r.id,
    name: (byId.get(r.id) ? byId.get(r.id).name : '—'),
    score: r.score,
    snippets: Index.bestSnippets(r.id, q, 2)
  })).filter(s => s.snippets.length);

  if (!sources.length){
    return noneAnswer({ q, terms, note: '<p>Encontré documentos, pero ninguno parece responder tu pregunta.</p>', suggestions: GENERAL_SUGGESTIONS });
  }

  const conf = Math.min(1, ranked[0].score * 2.2);
  let body = '';
  const pendingPhrase = /(pendientes?\s+de\s+pago|pago\s+pendiente|por\s+pagar|sin\s+pagar)/i.test(q);

  /* "¿Qué documentos están pendientes de pago?" → listar los documentos que lo mencionan */
  if (intent === 'pending' || (intent === 'money' && pendingPhrase)){
    const rows = sources.map(s => ({ s, snip: s.snippets.find(x => /pago|pendiente|saldo|vencimiento|abono/i.test(x)) || s.snippets[0] })).filter(r => r.snip);
    if (rows.length){
      return augmentWithLlm({
        type:'answer', intent:'pending', conf:0.85, terms, sources,
        html:
          `<p class="ans-lead">Documentos con menciones de <b>pagos pendientes</b> en el repositorio:</p><ul class="ans-list">` +
          rows.map(r => `<li><b>${esc(r.s.name)}</b> ${cited(sources, r.s)}<br><span class="dim">${highlight(r.snip, terms)}</span></li>`).join('') +
          `</ul>`
      }, q);
    }
  }

  if (intent === 'money'){
    let total = 0, n = 0;
    const rows = sources.map(s => {
      const ents = extractEntities(s.snippets.join(' '));
      if (!ents.montos.length) return '';
      ents.montos.forEach(v => { total += toNum(v); n++; });
      return '<li><b>' + esc(s.name) + '</b> — ' + ents.montos.map(v => '<span class="mono">' + esc(v) + '</span>').join(' · ') + ' ' + cited(sources, s) + '</li>';
    }).filter(Boolean).join('');
    if (rows){
      body = '<p class="ans-lead">Encontré ' + n + ' menciones de valores en ' + sources.length + ' documento(s):</p><ul class="ans-list">' + rows + '</ul>' +
        (n > 1 ? '<div class="ans-total">Σ Valores detectados: $' + total.toLocaleString('es-CO') + '</div>' : '');
    } else {
      body = askBody(sources, terms);
    }
  } else if (intent === 'date'){
    const rows = sources.map(s => {
      const ents = extractEntities(s.snippets.join(' '));
      if (!ents.fechas.length) return '';
      return '<li><b>' + esc(s.name) + '</b> — ' + ents.fechas.map(v => '<span class="mono">' + esc(v) + '</span>').join(' · ') + ' ' + cited(sources, s) + '</li>';
    }).filter(Boolean).join('');
    if (rows){
      body = '<p class="ans-lead">Fechas relevantes encontradas en el repositorio:</p><ul class="ans-list">' + rows + '</ul>';
    } else {
      body = askBody(sources, terms);
    }
  } else if (intent === 'who'){
    const rows = sources.map(s => {
      const ents = extractEntities(s.snippets.join(' '));
      const all = [...ents.personas.slice(0, 3), ...ents.organizaciones.slice(0, 2)];
      if (!all.length) return '';
      return '<li><b>' + esc(s.name) + '</b> — ' + all.map(v => esc(v)).join(' · ') + ' ' + cited(sources, s) + '</li>';
    }).filter(Boolean).join('');
    if (rows){
      body = '<p class="ans-lead">Actores identificados en los documentos más relevantes:</p><ul class="ans-list">' + rows + '</ul>';
    } else {
      body = askBody(sources, terms);
    }
  } else {
    body = askBody(sources, terms);
  }

  return augmentWithLlm({ type:'answer', intent, conf, terms, sources, html: body }, q);
}