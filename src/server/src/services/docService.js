import fs from 'node:fs';
import path from 'node:path';
import { db, uid, now, parseJson } from '../db.js';
import { fail, logEvent } from '../middleware.js';
import { Index } from '../nlp/tfidf.js';
import { Embedder } from '../nlp/embeddings.js';

export const EXT_OK = ['pdf', 'docx', 'txt'];
const MAX_SIZE = 10 * 1024 * 1024;

const pub = d => {
  const repo = db.prepare('SELECT name FROM repos WHERE id = ?').get(d.repoId);
  return {
    id: d.id, name: d.name, ext: d.ext, size: d.size, repoId: d.repoId, repoName: repo ? repo.name : d.repoId,
    ownerId: d.ownerId, ownerName: d.ownerName, uploadedAt: d.uploadedAt,
    status: d.status, pages: d.pages, wordCount: d.wordCount,
    category: d.category, categoryProbs: parseJson(d.categoryProbs, null),
    summary: parseJson(d.summary, null), entities: parseJson(d.entities, null),
    analysisAt: d.analysisAt, error: d.error,
    wordSnippet: null
  };
};

export const DocService = {
  create(actor, file, repoId){
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!EXT_OK.includes(ext)) fail('VAL', `Formato .${ext} no soportado — solo PDF, DOCX y TXT.`);
    if (file.size > MAX_SIZE) fail('VAL', 'El archivo supera el límite de 10 MB.');
    if (!db.prepare('SELECT 1 FROM repos WHERE id = ?').get(repoId)) {
      repoId = 'general';
      if (!db.prepare('SELECT 1 FROM repos WHERE id = ?').get('general')) repoId = null;
    }
    if (!repoId) fail('VAL', 'Repositorio destino no válido.');
    const rec = {
      id: uid(), name: file.originalname, ext, size: file.size, repoId,
      ownerId: actor.id, ownerName: actor.name, uploadedAt: now(),
      status: 'pendiente', filePath: file.path
    };
    db.prepare(`INSERT INTO docs (id, name, ext, size, repoId, ownerId, ownerName, uploadedAt, status, filePath)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(rec.id, rec.name, rec.ext, rec.size, rec.repoId, rec.ownerId, rec.ownerName, rec.uploadedAt, rec.status, rec.filePath);
    logEvent('INFO', 'Repositorios', `Documento "${rec.name}" cargado (${fmtBytes(rec.size)}).`, actor.username);
    return this.get(rec.id);
  },

  get(id){
    const d = db.prepare('SELECT * FROM docs WHERE id = ?').get(id);
    if (!d) fail('VAL', 'Documento no encontrado.', 404);
    return pub(d);
  },

  getFull(id){
    const d = db.prepare('SELECT * FROM docs WHERE id = ?').get(id);
    if (!d) fail('VAL', 'Documento no encontrado.', 404);
    return d;
  },

  list(actor, q, cat, fmt, repo, sort){
    let rows = db.prepare('SELECT * FROM docs').all().map(pub);
    if (cat) rows = rows.filter(d => d.category === cat);
    if (fmt) rows = rows.filter(d => d.ext === fmt);
    if (repo) rows = rows.filter(d => d.repoId === repo);
    const ql = (q || '').trim().toLowerCase();
    if (ql){
      const scores = ql.length >= 3 ? Object.fromEntries(Index.scoreQuery(q).map(r => [r.id, r.score])) : {};
      rows = rows.filter(d => d.name.toLowerCase().includes(ql) || scores[d.id])
        .map(d => d === null ? d : ({ ...d, score: scores[d.id] || 0 }));
      rows.sort((a, b) => (b.score || 0) - (a.score || 0) || b.uploadedAt - a.uploadedAt);
    } else {
      if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === 'words') rows.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
      else rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }
    return rows;
  },

  downloadPath(id){
    const d = db.prepare('SELECT filePath, name FROM docs WHERE id = ?').get(id);
    if (!d) fail('VAL', 'Documento no encontrado.', 404);
    return d;
  },

  delete(actor, id){
    const d = db.prepare('SELECT * FROM docs WHERE id = ?').get(id);
    if (!d) fail('VAL', 'Documento no encontrado.', 404);
    const canDel = actor.role === 'admin' || d.ownerId === actor.id;
    if (!canDel) fail('PERM', 'Solo el propietario o un administrador puede eliminar este documento.', 403);
    db.prepare('DELETE FROM docs WHERE id = ?').run(id);
    try { if (d.filePath) fs.unlinkSync(d.filePath); } catch (e) { /* archivo ausente */ }
    Index.remove(id);
    try { Embedder.train(this.processedForIndex()); } catch (e){ /* semántica no bloqueante */ }
    logEvent('WARN', 'Repositorios', `Documento "${d.name}" eliminado por ${actor.username}.`, actor.username);
  },

  update(id, fields){
    const d = this.getFull(id);
    const allowed = ['status', 'error', 'text', 'pages', 'wordCount', 'category', 'categoryProbs', 'summary', 'entities', 'analysisAt', 'repoId'];
    const next = { ...d };
    for (const k of allowed) if (k in fields) next[k] = fields[k];
    db.prepare(`UPDATE docs SET status=?, error=?, text=?, pages=?, wordCount=?, category=?, categoryProbs=?, summary=?, entities=?, analysisAt=?, repoId=? WHERE id=?`)
      .run(
        next.status, next.error, next.text, next.pages, next.wordCount, next.category,
        next.categoryProbs ? JSON.stringify(next.categoryProbs) : null,
        next.summary ? JSON.stringify(next.summary) : null,
        next.entities ? JSON.stringify(next.entities) : null,
        next.analysisAt, next.repoId, id
      );
    return this.getFull(id);
  },

  processedForIndex(){
    return db.prepare('SELECT * FROM docs WHERE status = ? AND text IS NOT NULL').all('procesado');
  },

  /* Para el chat: TODOS los documentos (incluye pendientes/errores, para poder responder
     "¿cuántos documentos hay en total?" contabilizando todo lo cargado). */
  allForChat(){
    return db.prepare('SELECT * FROM docs ORDER BY uploadedAt ASC').all();
  },

  byName(name){
    return db.prepare('SELECT id FROM docs WHERE name = ?').get(name);
  }
};

export function serializeDocForFrontend(d){
  return d;
}

export function fmtBytes(n){
  n = Number(n) || 0;
  return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
}

export const sanitizeFilename = name => path.basename(String(name || '')).replace(/[^a-zA-Z0-9._\- ]/g, '_');