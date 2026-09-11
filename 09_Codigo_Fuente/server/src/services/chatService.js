import { db, uid, now, parseJson } from '../db.js';

export const ChatService = {
  history(userId){
    return db.prepare('SELECT * FROM chat WHERE userId = ? ORDER BY ts ASC LIMIT 200').all(userId)
.map(row => {
      const m = { id: row.id, role: row.role, ts: row.ts, docId: row.docId || null, docName: row.docName || null };
      if (row.role === 'user') m.text = row.q;
      else {
          m.type = row.type; m.intent = row.intent; m.conf = row.conf;
          m.q = row.q;
          m.terms = parseJson(row.terms, []);
          m.sources = parseJson(row.sources, []);
          m.html = row.html;
        }
        return m;
      });
  },
  clear(userId, docId){
    if (docId) db.prepare('DELETE FROM chat WHERE userId = ? AND docId = ?').run(userId, docId);
    else db.prepare('DELETE FROM chat WHERE userId = ?').run(userId);
  },
  push(userId, msg){
    const row = {
      id: uid(), userId, ts: now(),
      role: msg.role,
      q: msg.role === 'user' ? msg.text : msg.q,
      type: msg.type || null,
      intent: msg.intent || null,
      conf: msg.conf ?? null,
      terms: msg.terms ? JSON.stringify(msg.terms) : null,
      sources: msg.sources ? JSON.stringify(msg.sources) : null,
      html: msg.html || null,
      docId: msg.docId || null,
      docName: msg.docName || null
    };
    db.prepare(`INSERT INTO chat (id, userId, role, ts, q, type, intent, conf, terms, sources, html, docId, docName)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(row.id, row.userId, row.ts, row.role, row.q, row.type, row.intent, row.conf, row.terms, row.sources, row.html, row.docId, row.docName);
    /* Solo conserva las últimas 200 por usuario */
    db.prepare(`DELETE FROM chat WHERE userId = ? AND id NOT IN
                (SELECT id FROM chat WHERE userId = ? ORDER BY ts DESC LIMIT 200)`)
      .run(userId, userId);
  }
};