import { Router } from 'express';
import { ask, highlight } from '../nlp/rag.js';
import { Index } from '../nlp/tfidf.js';
import { Embedder } from '../nlp/embeddings.js';
import { expand } from '../nlp/tokenizer.js';
import { DocService } from '../services/docService.js';
import { ChatService } from '../services/chatService.js';
import { authRequired, asyncWrap, ok } from '../middleware.js';

export const askRoutes = Router();

askRoutes.get('/search', authRequired, asyncWrap((req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, []);
  const semantic = req.query.semantic === '1';
  const docId = String(req.query.docId || '').trim() || null;

  let cand;
  if (semantic && Embedder.stats().ready){
    const lex = Index.scoreQuery(q).slice(0, 10);
    const lexMap = new Map(lex.map(r => [r.id, r.score]));
    const maxLex = lex.length ? Math.max(...lex.map(r => r.score)) : 0;
    const sem = Embedder.score(q, 15);
    const semMap = new Map(sem.map(r => [r.id, r.cos]));
    const ids = [...new Set([...lexMap.keys(), ...semMap.keys()])];
    cand = ids.map(id => ({
      id,
      score: lexMap.get(id) || 0,
      cos: semMap.get(id) || 0,
      blend: maxLex > 0 && semMap.get(id)
        ? 0.5 * (lexMap.get(id) / maxLex) + 0.5 * (semMap.get(id))
        : (semMap.get(id) ? 0.5 + 0.5 * (semMap.get(id) / (semMap.size ? Math.max(...semMap.values()) : 1)) : 0)
    })).sort((a, b) => b.blend - a.blend).slice(0, 10);
    if (docId) cand = cand.filter(c => c.id === docId);
  } else {
    cand = Index.scoreQuery(q).slice(0, 10).map(r => ({ id: r.id, score: r.score, cos: null, blend: null }));
    if (docId) cand = cand.filter(c => c.id === docId);
    else if (semantic) cand = cand.map(c => ({ ...c, semantic: false }));
  }

  const docs = new Map(DocService.list(req.user, '', '', '', '', 'recent').map(d => [d.id, d]));
  const terms = expand(q).filter(t => t.t.length >= 4).map(t => t.t);
  const out = cand.map(r => {
    const d = docs.get(r.id);
    return {
      id: r.id, name: d ? d.name : '—', score: r.score,
      ...(r.cos !== null ? { cos: r.cos, blend: r.blend, mode: 'semantica' } : r.semantic ? {} : { mode: 'lexica' }),
      category: d?.category || null, ext: d?.ext || null,
      snippets: Index.bestSnippets(r.id, q, 2).map(s => highlight(s, terms))
    };
  }).filter(x => x.snippets.length);
  ok(res, out);
}));

askRoutes.post('/ask', authRequired, asyncWrap(async (req, res) => {
  const q = String(req.body.q || '').trim();
  const docId = String(req.body.docId || '').trim() || null;
  if (!q){ res.status(400).json({ ok: false, error: { code: 'VAL', message: 'Escriba una pregunta.' } }); return; }
  const answer = await ask(q, { docId });
  ChatService.push(req.user.id, {
    role: 'user', text: q,
    docId: answer.docId || docId || null,
    docName: answer.docName || null
  });
  ChatService.push(req.user.id, {
    role: 'ai', q, type: answer.type || 'none', intent: answer.intent,
    conf: answer.conf, terms: answer.terms, sources: answer.sources, html: answer.html,
    docId: answer.docId || docId || null,
    docName: answer.docName || null
  });
  ok(res, answer);
}));

askRoutes.get('/chat', authRequired, asyncWrap((req, res) => {
  ok(res, ChatService.history(req.user.id));
}));

askRoutes.delete('/chat', authRequired, asyncWrap((req, res) => {
  const docId = String(req.query.docId || '').trim() || null;
  ChatService.clear(req.user.id, docId);
  ok(res, { message: 'Conversación limpiada', docId });
}));