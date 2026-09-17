import { Index } from './tfidf.js';
import { expand } from './tokenizer.js';
import { extractEntities, toNum } from './entities.js';
import { config } from '../config.js';

/* ---------- RAG extractivo (consulta en lenguaje natural) ----------
   Flujo: pregunta -> intención -> expansión léxica -> recuperación TF-IDF
   (documentos + fragmentos) -> composición de respuesta con citas [n].
   Soporta modo docId para acotar la consulta a un solo documento.
*/

function detectIntent(q){
  const l = q.toLowerCase();
  if (/(cuanto|cuánto|valor|total|monto|precio|costo|suma|pagar|pago|recaudo|saldo)/.test(l)) return 'money';
  if (/(cuando|cuándo|fecha|plazo|vence|vencimiento|vigencia|hasta)/.test(l)) return 'date';
  if (/(quien|quién|quienes|quiénes|responsable|empresa|persona|emisor|remitente|parte|contratante)/.test(l)) return 'who';
  if (/(cu[aá]les|qu[eé]\s+documentos?|list[aá]|enum[ée]ra|menciona|documentos?\s+son|categor)/.test(l)) return 'cat';
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
  const single = docs.length === 1;
  const suggestions = single ? DOC_SUGGESTIONS : GENERAL_SUGGESTIONS;
  return {
    type:'answer', intent:'saludo', conf:1, q, terms: [],
    sources: [],
    html:
      `<p>¡Hola! 👋 Soy el asistente IA de <b>SIGAD</b>. ${single
        ? `Ahora mismo consulto <b>${esc(docs[0].name)}</b> y responderé SOLO con su contenido.`
        : `Tengo <b>${docs.length}</b> documento(s) procesado(s) en el repositorio.`}</p>` +
      `<div class="ans-lead">Intenta con algo como:</div><ul class="ans-list">` +
      suggestions.map(s => `<li>${esc(s)}</li>`).join('') + `</ul>` +
      `<p class="dim">💡 Usa el selector de arriba para elegir <b>un documento concreto</b> o volver a <b>todos los documentos</b>.</p>`
  };
}

function helpAnswer(q, docs){
  const single = docs.length === 1;
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
      `</ul>` +
      (single
        ? `<p class="dim">Como consulto <b>${esc(docs[0].name)}</b>, responderé solo con su contenido. Pide el <b>resumen</b> para empezar.</p>`
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

  /* Catálogo: ¿qué documentos son X? */
  if (detectIntent(q) === 'cat'){
    const catAns = catalogAnswer(q, docs);
    if (catAns) return catAns;
  }

  const ranked = Index.scoreQuery(q).slice(0, 4);
  const terms = expand(q).filter(x => x.t.length >= 4).map(x => x.t);

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
  const intent = detectIntent(q);
  let body = '';

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
      return askGeneric(sources, terms);
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
      return askGeneric(sources, terms);
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
      return askGeneric(sources, terms);
    }
  } else {
    body = askBody(sources, terms);
  }

  return augmentWithLlm({ type:'answer', intent, conf, terms, sources, html: body }, q);
}