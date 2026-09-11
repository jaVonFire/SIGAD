import fs from 'node:fs';
import path from 'node:path';
import { DocService as docService } from './docService.js';
import { config } from '../config.js';
import { logEvent } from '../middleware.js';
import { tokenizar, countWords } from '../nlp/tokenizer.js';
import { classify } from '../nlp/classifier.js';
import { summarize } from '../nlp/summarizer.js';
import { analyzeSummary } from '../nlp/analyst.js';
import { extractEntities } from '../nlp/entities.js';
import { Index } from '../nlp/tfidf.js';
import { Embedder } from '../nlp/embeddings.js';

/* Lazy import de extractores pesados */
let pdfjs = null;
let pdfStandardFontsUrl = '';
async function getPdfjs(){
  if (!pdfjs){
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist'));
  }
  return pdfjs;
}
async function resolveFontUrl(){
  /* Intenta localizar el directorio standard_fonts del paquete pdfjs-dist */
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  try {
    const pkgPath = require.resolve('pdfjs-dist/package.json');
    const pkgDir = path.dirname(pkgPath);
    const fonts = path.join(pkgDir, 'standard_fonts');
    if (fs.existsSync(fonts)) return fonts + path.sep;
  } catch (e) { /* no localizado */ }
  return '';
}

let mammoth = null;
async function getMammoth(){ if (!mammoth) mammoth = await import('mammoth'); return mammoth; }

export async function extractText(filePath, ext){
  if (ext === 'pdf'){
    const lib = await getPdfjs();
    const data = new Uint8Array(fs.readFileSync(filePath));
    const opts = { data };
    const fontsUrl = await resolveFontUrl();
    if (fontsUrl) opts.standardFontDataUrl = fontsUrl;
    const pdf = await lib.getDocument(opts).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++){
      const pg = await pdf.getPage(p);
      const tc = await pg.getTextContent();
      pages.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return { text: pages.join('\n'), pages: pdf.numPages };
  }
  if (ext === 'docx'){
    const lib = await getMammoth();
    const r = await lib.extractRawText({ path: filePath });
    return { text: r.value, pages: null };
  }
  return { text: fs.readFileSync(filePath, 'utf8'), pages: null };
}

/* ---------- Pasos del pipeline (ID definidos para la UI) ---------- */
export const PIPELINE_STEPS = [
  { k: 'extract', t: 'Extracción de contenido', d: 'pdf.js (PDF) · mammoth (DOCX) · fs (TXT)' },
  { k: 'token',   t: 'Tokenización y limpieza', d: 'Normalización, stopwords ES, stemming ligero' },
  { k: 'class',   t: 'Clasificación automática', d: 'Naive Bayes multinomial · corpus interno · Laplace' },
  { k: 'sum',     t: 'Resumen extractivo', d: 'Puntuación de oraciones por frecuencia (TF)' },
  { k: 'ner',     t: 'Extracción de entidades', d: '7 tipos: fechas, montos, correos, teléfonos, IDs, personas, organizaciones' },
  { k: 'index',   t: 'Indexado TF-IDF + RAG', d: 'Índice invertido para búsqueda y consulta' }
];

export async function processDocument(docId, actor){
  const rec = docService.getFull(docId);
  if (!rec) throw new Error('Documento no encontrado.');
  if (!rec.filePath || !fs.existsSync(rec.filePath)) {
    docService.update(docId, { status: 'error', error: 'Archivo físico ausente en el almacenamiento.' });
    throw new Error('Archivo físico ausente.');
  }

  docService.update(docId, { status: 'procesando', error: null });
  const step = { extract: {}, token: {}, class: {}, sum: {}, ner: {}, index: {} };
  try {
    step.extract = await extractText(rec.filePath, rec.ext);
    const text = step.extract.text || '';
    if (!text || text.replace(/\s+/g, '').length < 20){
      throw new Error('Sin contenido legible (posible documento escaneado: requeriría OCR en producción).');
    }

    const raw = countWords(text);
    step.token = { toks: tokenizar(text) };

    step.class = classify(text);
    step.sum = analyzeSummary(text, { name: rec.name, category: step.class[0].cat });
    step.ner = extractEntities(text);

    const finalText = text.length > config.maxTextChars ? text.slice(0, config.maxTextChars) : text;
    const updated = docService.update(docId, {
      status: 'procesado',
      text: finalText,
      pages: step.extract.pages || null,
      wordCount: raw,
      category: step.class[0].cat,
      categoryProbs: step.class,
      summary: step.sum,
      entities: step.ner,
      analysisAt: Date.now()
    });
    Index.add(docId, finalText);
    try { Embedder.train(docService.processedForIndex()); } catch (e){ /* semántica no bloqueante */ }

    logEvent('INFO', 'Pipeline',
      `Documento "${rec.name}" procesado — ${step.class[0].cat} (${(step.class[0].p * 100).toFixed(0)}%).`,
      actor ? actor.username : 'sistema');
    return { doc: publicize(updated), steps: step };
  } catch (err){
    const msg = String(err?.message || err);
    docService.update(docId, { status: 'error', error: msg.slice(0, 400) });
    logEvent('ERROR', 'Pipeline', `Fallo al procesar "${rec.name}": ${msg}`, actor ? actor.username : 'sistema');
    return { doc: publicize(docService.getFull(docId)), steps: step, error: msg };
  }
}

/* Documento plano para la respuesta (sin campos internos del motor) */
function publicize(d){
  return {
    id: d.id, name: d.name, ext: d.ext, size: d.size, repoId: d.repoId,
    ownerId: d.ownerId, ownerName: d.ownerName, uploadedAt: d.uploadedAt,
    status: d.status, error: d.error, pages: d.pages, wordCount: d.wordCount,
    category: d.category, categoryProbs: JSON.parse(d.categoryProbs || 'null'),
    summary: JSON.parse(d.summary || 'null'), entities: JSON.parse(d.entities || 'null'),
    analysisAt: d.analysisAt
  };
}