/* ---------- Resumen analítico ----------
   Redacta un resumen que describe QUÉ es el documento y qué contiene,
   a partir de entidades y secciones reales del texto (nada se inventa):
   tipo + título, objeto/tema, partes, cifras, fechas y datos clave por
   tipo de documento. El resultado es una lista de oraciones (viñetas)
   con base analítica, no un simple copiado de fragmentos. */

import { sentences } from './tokenizer.js';
import { summarize } from './summarizer.js';
import { extractEntities, toNum } from './entities.js';

const cap = s => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
const clean = s => String(s || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const cleanVal = s => {
  let v = clean(s).replace(/\n/g, ' ');
  const cut = v.match(/^(.+?)(?:\s+[-–—]\s+)/);
  if (cut) v = cut[1];
  return v.replace(/[.,;:¿¡]+$/g, '').trim();
};
const punct = s => { let v = clean(s); if (!/[.!?]$/.test(v)) v += '.'; return v; };
const normKey = s => s.toLowerCase().replace(/\W+/g, '');
const LABELS_RX = /^(temauobjeto|resumenejecutivo|conclusion|recomendacion|totalapagar|formadepago|plazoacordado|garantia|terminacion|asunto|intervienen|cifrasrelevantes|fechasclave)/;
const stripLabel = k => k.replace(LABELS_RX, '');
const HEADER_RX = /^(resumen\s+ejecutivo|conclus|recomendac|hallazg|metodolog|indicadores|objeto|a[á]sunto|cl[aá]usul|total\s+a\s+pagar|forma\s+de\s+pago|plazo|garant|terminaci)/i;

function dedupByContain(arr){
  const key = s => s.toLowerCase().replace(/\./g, ' ').trim();
  const out = [];
  for (const it of arr.slice().sort((a, b) => b.length - a.length)){
    const k = key(it);
    if (out.some(o => key(o).includes(k))) continue;
    out.push(it);
  }
  return out;
}

const cleanActor = s => s
  .replace(/^(?:entre|de|del|el|la|los|las|y|e)\s+/i, '')
  .replace(/\s+(?:para|de|por|entre|atentamente|dirigido)\s*$/i, '')
  .trim();

const MONTHS = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const DATE_RX = new RegExp(`^([^,\\n]{0,40},\\s*)?\\d{1,2}\\s+de\\s+(?:${MONTHS})\\s+de\\s+\\d{4}`, 'i');
const isMetaLine = s => /^(el documento|cl[aá]usul|firmad|resumen\s+ejecutivo|empresa\b|contacto|de:|para:|memo\.|elaborado|fechado|nit\b|identificaci|direcci[oó]n|telefono|correo\s*[: ])/i.test(s)
  || DATE_RX.test(s);

function grabAfter(text, rx){
  const m = String(text || '').match(rx);
  return m && m[1] ? cleanVal(m[1]) : null;
}

function documentKind(text, category){
  const lc = text.toLowerCase();
  const defs = [
    { k: 'factura', rx: /(factura|iva\b|subtotal|total a pagar|precio unitario|forma de pago)/g },
    { k: 'informe', rx: /(informe|resumen ejecutivo|metodolog[ií]a|hallazg|recomendaciones?|conclusiones?)/g },
    { k: 'contrato', rx: /(contrato|cl[aá]usul|entre las partes|prestaci[oó]n de servicios|terminaci[oó]n del contrato)/g },
    { k: 'correspondencia', rx: /(carta\b|oficio\b|comunicad|asunto\s*:|atentamente|\batt\.)/g }
  ];
  let best = null, bestN = 0;
  for (const d of defs){
    const n = (lc.match(d.rx) || []).length;
    if (n > bestN){ best = d.k; bestN = n; }
  }
  if (best) return best;
  return { Factura: 'factura', Contrato: 'contrato', Informe: 'informe', Correspondencia: 'correspondencia' }[category] || 'documento';
}

const KIND_PHRASE = {
  'contrato': 'un contrato que fija las condiciones pactadas entre las partes',
  'factura': 'una factura comercial que registra el cobro de una transacción',
  'informe': 'un informe que presenta análisis, indicadores y conclusiones',
  'correspondencia': 'una comunicación escrita oficial',
  'documento': 'un documento del repositorio'
};

function pickTitle(sents, name){
  for (const s of sents){
    const w = s.split(/[ \t]+/).filter(Boolean).length;
    if (w >= 3 && w <= 14 && s.length <= 90 && !isMetaLine(s)){
      return cap(s.replace(/^asunto\s*:?\s*/i, '').replace(/[.:;]+$/, '').trim());
    }
  }
  return String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() || 'el documento';
}

function mainPoint(text, kind){
  if (kind === 'contrato') return grabAfter(text, /objeto\s*[:–-]?\s*([^\n]{3,90})/i);
  if (kind === 'informe') return grabAfter(text, /resumen\s+ejecutivo\s*[:–-]?\s*([^\n]{3,150})/i);
  if (kind === 'factura') return grabAfter(text, /(?:concepto|detalle)\s*[:–-]?\s*([^\n]{3,90})/i);
  return null;
}

function keyFacts(text, kind){
  const facts = [];
  if (kind === 'factura'){
    const t = grabAfter(text, /total\s+a\s+pagar\s*[:–-]?\s*([^\n]{2,70})/i); if (t) facts.push('Total a pagar: ' + t);
    const f = grabAfter(text, /forma\s+de\s+pago\s*[:–-]?\s*([^\n]{2,70})/i); if (f) facts.push('Forma de pago: ' + cap(f));
  }
  if (kind === 'contrato'){
    const p = grabAfter(text, /plazo\s*[:–-]?\s*([^\n]{4,110})/i); if (p) facts.push('Plazo acordado: ' + cap(p));
    const g = grabAfter(text, /garant[ií]a\s*[:–-]?\s*([^\n]{4,110})/i); if (g) facts.push('Garantía: ' + cap(g));
    const term = grabAfter(text, /terminaci[oó]n\s*[:–-]?\s*([^\n]{4,110})/i); if (term) facts.push('Terminación: ' + cap(term));
  }
  if (kind === 'informe'){
    const r = grabAfter(text, /recomendaciones?\s*[:–-]?\s*([^\n]{4,140})/i); if (r) facts.push('Recomendaciones: ' + cap(r));
    const c = grabAfter(text, /conclusiones?\s*[:–-]?\s*([^\n]{4,150})/i); if (c) facts.push('Conclusión: ' + cap(c));
  }
  return facts;
}

export function analyzeSummary(text, { name = '', category = '' } = {}){
  const sents = clean(text).split('\n').map(s => s.trim()).concat(sentences(text).map(s => s.trim())).filter(Boolean);
  const ents = extractEntities(text);
  const kind = documentKind(text, category);

  const out = [];

  let intro = `El documento «${pickTitle(sents, name)}» es ${KIND_PHRASE[kind] || KIND_PHRASE['documento']}`;
  const firma = grabAfter(text, /firmad\w*\s+en\s*([^\n]{3,80})/i);
  if (firma) intro += ' y fue firmado en ' + cap(firma);
  out.push(punct(intro + '.'));

  const main = mainPoint(text, kind);
  if (main) out.push(punct('Tema u objeto: ' + cap(main)));

  const actors = dedupByContain([...ents.organizaciones, ...ents.personas].map(cleanActor)).slice(0, 4);
  if (actors.length) out.push(punct('Intervienen: ' + actors.join(' · ')));

  const montosU = [];
  for (const m of ents.montos){
    const n = toNum(m);
    if (!montosU.some(x => Math.abs(toNum(x) - n) < (n * 0.01 + 1))) montosU.push(m);
  }
  if (montosU.length) out.push(punct('Cifras relevantes: ' + montosU.slice(0, 5).join(', ')));

  if (ents.fechas.length) out.push(punct('Fechas clave: ' + ents.fechas.slice(0, 5).join(', ')));

  for (const f of keyFacts(text, kind)) out.push(punct(cap(f)));

  /* Soporte extractivo concreto, solo para completar contexto */
  let room = Math.max(0, 7 - out.length);
  if (room > 0){
    const existingN = out.map(s => stripLabel(normKey(s)));
    for (const s of summarize(text, 10).map(s => s.trim())){
      if (room <= 0) break;
      if (HEADER_RX.test(s) || DATE_RX.test(s)) continue;
      const k = normKey(s), kk = stripLabel(k);
      if (k.length <= 10 || kk.length === 0) continue;
      if (existingN.some(x => x.includes(kk) || kk.includes(x))) continue;
      out.push(punct(s)); existingN.push(kk); room--;
    }
  }

  return out.slice(0, 7).map(s => cap(punct(s)));
}