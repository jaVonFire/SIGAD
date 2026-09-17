import { db, uid, now } from '../db.js';
import { fail, logEvent, DEFAULT_REPO_ID } from '../middleware.js';

export const RepoService = {
  list(){
    return db.prepare('SELECT * FROM repos ORDER BY name COLLATE NOCASE ASC').all();
  },
  create(actor, name, desc){
    if (!name || name.trim().length < 3) fail('VAL', 'El nombre debe tener al menos 3 caracteres.');
    const r = { id: uid(), name: name.trim(), desc: (desc || '').trim(), ownerId: actor.id, created: now() };
    db.prepare('INSERT INTO repos (id, name, desc, ownerId, created) VALUES (?, ?, ?, ?, ?)')
      .run(r.id, r.name, r.desc, r.ownerId, r.created);
    logEvent('INFO', 'Repositorios', `Repositorio "${r.name}" creado.`, actor.username);
    return r;
  },
  delete(actor, repoId){
    if (repoId === DEFAULT_REPO_ID) fail('VAL', 'El repositorio "General" no puede eliminarse.');
    const r = db.prepare('SELECT * FROM repos WHERE id = ?').get(repoId);
    if (!r) return;
    const moved = db.prepare('SELECT COUNT(*) AS n FROM docs WHERE repoId = ?').get(repoId).n;
    db.prepare('UPDATE docs SET repoId = ? WHERE repoId = ?').run(DEFAULT_REPO_ID, repoId);
    db.prepare('DELETE FROM repos WHERE id = ?').run(repoId);
    logEvent('WARN', 'Repositorios', `Repositorio "${r.name}" eliminado; ${moved} documento(s) movidos a General.`, actor.username);
  }
};