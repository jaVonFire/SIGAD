import { tokenizar, sentences, expand } from './tokenizer.js';

/* ---------- Índice TF-IDF en memoria ----------
   Índice invertido de documentos procesados (frecuencias por documento,
   frecuencia documental, fragmentos por oración). Se reconstruye al
   arrancar desde la tabla `docs` y se actualiza incrementalmente.
*/

const docsTf = new Map();   // id -> Map(term -> tf)
const df = new Map();       // term -> número de docs que lo contienen
const docsSents = new Map();// id -> [{text, terms:Set}]

function add(id, text){
  remove(id);
  const tf = new Map();
  tokenizar(text).forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
  docsTf.set(id, tf);
  for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  docsSents.set(id, sentences(text)
    .filter(s => s.split(/\s+/).length >= 4)
    .map(s => ({ text: s.trim(), terms: new Set(tokenizar(s)) })));
}

function remove(id){
  const tf = docsTf.get(id);
  if (tf){
    for (const t of tf.keys()){
      const n = (df.get(t) || 1) - 1;
      n <= 0 ? df.delete(t) : df.set(t, n);
    }
    docsTf.delete(id);
    docsSents.delete(id);
  }
}

export const Index = {
  add,
  remove,
  rebuild(processedDocs){
    docsTf.clear(); df.clear(); docsSents.clear();
    processedDocs.forEach(d => add(d.id, d.text));
  },
  stats(){
    let f = 0;
    docsSents.forEach(v => f += v.length);
    return { docs: docsTf.size, fragments: f, vocab: df.size };
  },
  scoreQuery(q){
    const qt = expand(q);
    const res = [];
    docsTf.forEach((tf, id) => {
      let s = 0, hits = 0;
      qt.forEach(({ t, w }) => {
        const f = tf.get(t);
        if (f){ hits++; s += w * (1 + Math.log(f)) * Math.log(1 + docsTf.size / (df.get(t) || 1)); }
      });
      if (hits) res.push({ id, score: s / Math.sqrt(tf.size + 1) });
    });
    return res.sort((a, b) => b.score - a.score);
  },
  bestSnippets(id, q, n = 2){
    const qt = expand(q).map(x => x.t);
    return (docsSents.get(id) || [])
      .map((s, i) => {
        let sc = 0;
        qt.forEach(t => { if (s.terms.has(t)) sc++; });
        return { text: s.text, sc, i };
      })
      .filter(x => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, n)
      .map(x => x.text);
  }
};