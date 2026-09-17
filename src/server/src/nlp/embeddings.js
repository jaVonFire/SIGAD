/* ---------- Embeddings locales: LSA (Análisis Semántico Latente) ----------
   Técnica: sobre la matriz términos×documentos ponderada con TF-IDF se
   calcula un SVD truncado (aleatorizado con iteración de potencias) para
   obtener un espacio semántico de K dimensiones (term-vectors).
   - Cada término queda "embebido" en el espacio (K dims).
   - Cada documento = suma ponderada (TF-IDF) de los vectores de sus términos.
   - Búsqueda semántica = similitud coseno entre consulta y documentos.
   Sin dependencias externas, 100 % local: los vectores se aprenden del
   propio repositorio (no se envían datos a servicios externos).
*/

import { tokenizar } from './tokenizer.js';

const K = Math.min(64, Math.max(8, Number(process.env.EMBED_DIMS || 40)));
const MIN_DF = Math.max(2, Number(process.env.EMBED_MINDF || 2));
const MAX_TERMS = 3000;

function randn(n){
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 2){
    let u = 0, v = 0, s = 0;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    out[i] = u * m;
    if (i + 1 < n) out[i + 1] = v * m;
  }
  return out;
}

function mul(A, B, m, n, p){
  const C = new Float64Array(m * p);
  for (let i = 0; i < m; i++){
    for (let j = 0; j < n; j++){
      const aij = A[i * n + j];
      if (!aij) continue;
      for (let k = 0; k < p; k++) C[i * p + k] += aij * B[j * p + k];
    }
  }
  return C;
}

function transpose(A, m, n){
  const T = new Float64Array(n * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j * m + i] = A[i * n + j];
  return T;
}

function qr(A, m, n){
  const Q = new Float64Array(m * n);      // m×n ortonormal
  for (let col = 0; col < n; col++){
    for (let i = 0; i < m; i++) Q[i * n + col] = A[i * n + col];
    for (let pc = 0; pc < col; pc++){
      let dot = 0;
      for (let i = 0; i < m; i++) dot += Q[i * n + pc] * Q[i * n + col];
      for (let i = 0; i < m; i++) Q[i * n + col] -= dot * Q[i * n + pc];
    }
    let nrm = 0;
    for (let i = 0; i < m; i++) nrm += Q[i * n + col] * Q[i * n + col];
    nrm = Math.sqrt(nrm) || 1;
    for (let i = 0; i < m; i++) Q[i * n + col] /= nrm;
  }
  return Q;
}

/* Jacobi cíclico para matrices simétricas (k×k). */
function symEig(seed, k){
  const A = new Float64Array(seed);
  const V = new Float64Array(k * k);
  for (let i = 0; i < k; i++) V[i * k + i] = 1;
  let off = 0;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) off += A[i * k + j] * A[i * k + j];
  for (let it = 0; it < 40 && off > 1e-14; it++){
    off = 0;
    for (let p = 0; p < k; p++){
      for (let q = p + 1; q < k; q++){
        const apq = A[p * k + q];
        off += apq * apq;
        if (Math.abs(apq) < 1e-15) continue;
        const app = A[p * k + p], aqq = A[q * k + q];
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let i = 0; i < k; i++){
          const aip = A[i * k + p], aiq = A[i * k + q];
          A[i * k + p] = c * aip - s * aiq;
          A[i * k + q] = s * aip + c * aiq;
        }
        for (let i = 0; i < k; i++){
          const api = A[p * k + i], aqi = A[q * k + i];
          A[p * k + i] = c * api - s * aqi;
          A[q * k + i] = s * api + c * aqi;
        }
        for (let i = 0; i < k; i++){
          const vip = V[i * k + p], viq = V[i * k + q];
          V[i * k + p] = c * vip - s * viq;
          V[i * k + q] = s * vip + c * viq;
        }
      }
    }
  }
  const idx = [...Array(k).keys()].sort((a, b) => A[b * k + b] - A[a * k + a]);
  const E = new Float64Array(k), U = new Float64Array(k * k);
  idx.forEach((e2i, pos) => {
    E[pos] = A[e2i * k + e2i];
    for (let i = 0; i < k; i++) U[i * k + pos] = V[i * k + e2i];
  });
  return { E, U };
}

/* SVD truncado aleatorizado: A (m×n) -> componente U (m×k) con A ≈ U·S·Vᵀ. */
function svdTrunc(A, m, n, k){
  const At = transpose(A, m, n);
  let Y = mul(A, randn(n * k), m, n, k);
  for (let power = 0; power < 2; power++){
    Y = mul(At, mul(A, Y, m, n, k), n, m, k);
  }
  const Q = qr(Y, m, k);
  const B = mul(transpose(Q, m, k), A, k, m, n);
  const S = mul(B, transpose(B, k, n), k, n, k);
  const { U: Vb } = symEig(S, k);
  const U = mul(Q, Vb, m, k, k);
  return U;
}

const state = {
  ready: false,
  dims: K,
  vocab: 0,
  docs: 0,
  term2idx: new Map(),  // termo -> fila en U
  U: null,              // termo×K
  idf: new Float64Array(0),
  docVecs: new Map(),   // id -> vector (K) normalizado
  docNames: new Map()
};

function normalize(v, k){
  let n = 0;
  for (let i = 0; i < k; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  if (!n) return null;
  for (let i = 0; i < k; i++) v[i] /= n;
  return v;
}

function cosine(a, b, k){
  let d = 0;
  for (let i = 0; i < k; i++) d += a[i] * b[i];
  return d;
}

export const Embedder = {
  train(processedDocs){
    state.term2idx.clear();
    state.docVecs.clear();
    state.docNames.clear();
    state.U = null;
    state.ready = false;
    state.vocab = 0;
    state.docs = 0;

    const texts = processedDocs.map(d => ({ id: d.id, name: d.name || d.id, toks: tokenizar(d.text), n: processedDocs.length }));
    const df = new Map();
    texts.forEach(doc => {
      new Set(doc.toks).forEach(t => df.set(t, (df.get(t) || 0) + 1));
    });
    const terms = [...df.entries()]
      .filter(([t, f]) => f >= MIN_DF)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TERMS)
      .map(([t]) => t);
    if (terms.length < 6 || texts.length < 2) return; // sin corpus mínimo no hay espacio semántico

    const m = terms.length, n = texts.length, k = Math.min(K, m, n - 1);
    if (k < 2) return;
    state.dims = k;

    terms.forEach((t, i) => state.term2idx.set(t, i));
    const A = new Float64Array(m * n);
    const idf = new Float64Array(m);
    const nF = texts.length;
    texts.forEach((doc, j) => {
      const tf = new Map();
      doc.toks.forEach(t => { if (state.term2idx.has(t)) tf.set(t, (tf.get(t) || 0) + 1); });
      tf.forEach((f, t) => {
        const i = state.term2idx.get(t);
        const idfVal = Math.log(1 + nF / df.get(t));
        idf[i] = idfVal;
        A[i * n + j] = (1 + Math.log(f)) * idfVal;
      });
    });

    const U = svdTrunc(A, m, n, k);
    state.U = U;
    state.idf = idf;
    state.vocab = m;

    const row = i => U.subarray(i * k, i * k + k);
    texts.forEach(doc => {
      const v = new Float64Array(k);
      doc.toks.forEach(t => {
        const i = state.term2idx.get(t);
        if (i === undefined) return;
        const r = row(i);
        for (let j = 0; j < k; j++) v[j] += r[j]; // sin idf: peso uniforme de contexto
      });
      if (normalize(v, k)){
        state.docVecs.set(doc.id, v);
        state.docNames.set(doc.id, doc.name);
        state.docs++;
      }
    });

    state.ready = state.docs > 0;
  },

  queryVec(q){
    const v = new Float64Array(state.dims);
    let hits = 0;
    tokenizar(q).forEach(t => {
      const i = state.term2idx.get(t);
      if (i === undefined) return;
      const r = state.U.subarray(i * state.dims, i * state.dims + state.dims);
      for (let j = 0; j < state.dims; j++) v[j] += r[j];
      hits++;
    });
    if (!hits || !normalize(v, state.dims)) return null;
    return v;
  },

  score(q, top = 20){
    if (!state.ready) return [];
    const v = this.queryVec(q);
    if (!v) return [];
    const out = [];
    state.docVecs.forEach((doc, id) => {
      const c = cosine(v, doc, state.dims);
      if (c > 0.05) out.push({ id, name: state.docNames.get(id), cos: c });
    });
    return out.sort((a, b) => b.cos - a.cos).slice(0, top);
  },

  stats(){
    return {
      ready: state.ready,
      tecnica: 'LSA (SVD truncado) sobre matriz TF-IDF — embeddings locales en memoria',
      dims: state.ready ? state.dims : 0,
      vocabulario: state.ready ? state.vocab : 0,
      docs: state.docs,
      minimoDf: MIN_DF
    };
  }
};