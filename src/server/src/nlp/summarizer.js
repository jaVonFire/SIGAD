import { sentences, tokenizar } from './tokenizer.js';

/* ---------- Resumen extractivo basado en TF + entidades ----------
   Puntúa oraciones por frecuencia de términos (TF normalizada), penaliza
   oraciones excesivamente largas y favorece la apertura del documento.
   Además premia las oraciones "concretas": que mencionan montos, fechas,
   números, emails o identificadores, para que el resumen sea útil y no
   genérico. Devuelve oraciones textuales del documento (verificables).
*/

const CONCRETO = /\$\s?\d|COP|USD|EUR|\d{1,2}[\/\-]\d{1,2}|NIT|CC|@|[a-z]{2,10}\s+\d{1,3}[.,]?\d*/i;

export function summarize(text, max = 8){
  const sents = sentences(text).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 5);
  if (sents.length <= 3) return sents;

  const freq = new Map();
  const tokS = sents.map(s => tokenizar(s));
  const setS = tokS.map(ts => new Set(ts));
  setS.forEach(ts => ts.forEach(t => freq.set(t, (freq.get(t) || 0) + 1)));
  const maxF = Math.max(...freq.values(), 1);

  const scored = sents.map((s, i) => {
    let sc = 0;
    setS[i].forEach(t => sc += (freq.get(t) || 0) / maxF);
    const len = s.split(/\s+/).length;
    if (len > 45) sc *= 0.55;
    if (i === 0) sc *= 1.3;
    if (CONCRETO.test(s)) sc *= 1.6;
    if (!setS[i].size) sc = 0;
    return { s, i, sc };
  });

  const n = Math.min(max, Math.max(5, Math.round(sents.length * 0.25)));
  const picked = scored.sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i);

  /* Elimina oraciones casi duplicadas (solapamiento de tokens) */
  const out = [];
  const overlap = (a, b) => {
    const sa = new Set(tokenizar(a));
    const sb = new Set(tokenizar(b));
    if (!sa.size || !sb.size) return 0;
    let hit = 0;
    sa.forEach(t => { if (sb.has(t)) hit++; });
    return hit / Math.min(sa.size, sb.size);
  };
  for (const p of picked){
    if (out.some(o => overlap(o, p.s) >= 0.6)) continue;
    out.push(p.s);
  }
  return out.length ? out : picked.map(p => p.s);
}