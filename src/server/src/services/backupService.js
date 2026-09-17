import { db } from '../db.js';
import { fail, logEvent } from '../middleware.js';
import { config } from '../config.js';
import { seedUser } from './seedService.js';

/* ---------- Respaldo/restauración ---------- */
export const BackupService = {
  export(actor){
    const users = db.prepare('SELECT id, username, name, role, created FROM users').all();
    const repos = db.prepare('SELECT * FROM repos').all();
    const docs = db.prepare('SELECT id, name, ext, size, repoId, ownerId, ownerName, uploadedAt, status, pages, wordCount, category, categoryProbs, summary, entities, analysisAt, error FROM docs').all();
    const events = db.prepare('SELECT * FROM events ORDER BY ts DESC LIMIT 500').all();
    logEvent('INFO', 'Respaldo', 'Respaldo JSON exportado (sin archivos binarios).', actor.username);
    return {
      app: 'SIGAD', version: '1.0',
      exportedAt: new Date().toISOString(),
      users, repos, docs, events
    };
  },

  restore(actor, data){
    if (!data || !Array.isArray(data.users) || !Array.isArray(data.repos) || !Array.isArray(data.docs)) {
      fail('VAL', 'Estructura de respaldo no válida.');
    }
    for (const r of data.repos) {
      db.prepare('INSERT OR REPLACE INTO repos (id, name, desc, ownerId, created) VALUES (?, ?, ?, ?, ?)')
        .run(r.id, r.name, r.desc || '', r.ownerId, r.created || Date.now());
    }
    for (const u of data.users) {
      /* No restaura hashes de contraseñas (seguridad): re-crea credencial por defecto si falta. */
      const exists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(u.id);
      if (!exists){
        seedUser(u.id, u.username, u.name, u.role, 'sigad2024');
      } else {
        try {
          db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(u.name, u.role, u.id);
        } catch (e) { /* usuario con id duplicado */ }
      }
    }
    /* Los documentos requieren archivo físico; solo se marcan como referencias. */
    let ok = 0;
    for (const d of data.docs) {
      try {
        db.prepare(`INSERT OR IGNORE INTO docs (id, name, ext, size, repoId, ownerId, ownerName, uploadedAt, status, filePath, pages, wordCount, category, categoryProbs, summary, entities, analysisAt, error)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'error', '', ?, ?, ?, ?, ?, ?, ?, 'Archivo pendiente de re-carga tras restauración')`)
          .run(
            d.id, d.name, d.ext, d.size || 0, d.repoId || 'general', d.ownerId || actor.id,
            d.ownerName || '', d.uploadedAt || Date.now(),
            d.pages, d.wordCount, d.category,
            d.categoryProbs ? JSON.stringify(d.categoryProbs) : null,
            d.summary ? JSON.stringify(d.summary) : null,
            d.entities ? JSON.stringify(d.entities) : null,
            d.analysisAt
          );
        ok++;
      } catch (e) { /* fila duplicada o inválida */ }
    }
    logEvent('INFO', 'Respaldo', `Respaldo restaurado: ${data.repos.length} repos, ${ok} docs referenciados.`, actor.username);
    return { repos: data.repos.length, docs: ok };
  }
};