import fs from 'node:fs';
import path from 'node:path';
import { db, uid, now } from '../db.js';
import { hashPassword, logEvent, DEFAULT_REPO_ID } from '../middleware.js';
import { config } from '../config.js';
import { DocService } from './docService.js';
import { processDocument } from './pipelineService.js';
import { RepoService } from './repoService.js';

export function seedUser(id, username, name, role, password){
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(id) ||
                 db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return;
  const salt = uid();
  db.prepare('INSERT INTO users (id, username, name, role, salt, hash, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, username, name, role || 'analista', salt, hashPassword(password || 'sigad2024', salt), now());
}

export function ensureDefaults(){
  seedUser('admin', 'admin', 'Administrador', 'admin', 'sigad2024');
  seedUser('analista', 'analista', 'Analista de Prueba', 'analista', 'analista2024');
  if (!db.prepare('SELECT 1 FROM repos WHERE id = ?').get(DEFAULT_REPO_ID)){
    db.prepare('INSERT INTO repos (id, name, desc, ownerId, created) VALUES (?, ?, ?, ?, ?)')
      .run(DEFAULT_REPO_ID, 'General', 'Repositorio por defecto del sistema', 'system', now());
  }
}

/* Importa y procesa los archivos del corpus de prueba. */
export async function importCorpus(dir, opts = {}){
  if (!fs.existsSync(dir)) throw new Error('Directorio de corpus no encontrado: ' + dir);
  const files = fs.readdirSync(dir).filter(f => /\.(pdf|docx|txt)$/i.test(f));
  const actor = { id: 'admin', username: 'admin', name: 'Administrador', role: 'admin' };
  const repoId = DEFAULT_REPO_ID;
  let ok = 0, dup = 0, failed = 0;

  const step = opts.onStep || (() => {});
  for (let i = 0; i < files.length; i++){
    const fname = files[i];
    const full = path.join(dir, fname);
    step(`${i + 1}/${files.length} — ${fname}`);
    const ext = fname.split('.').pop().toLowerCase();
    const stat = fs.statSync(full);
    const existing = DocService.byName(fname);
    if (existing) { dup++; continue; }

    /* Copia física a uploads para que el documento sea independiente del corpus */
    fs.mkdirSync(config.uploadsDir, { recursive: true });
    const storePath = path.join(config.uploadsDir, uid() + '_' + fname);
    fs.copyFileSync(full, storePath);

    const rec = {
      originalname: fname,
      size: stat.size,
      path: storePath
    };
    const created = DocService.create(actor, rec, repoId);
    const res = await processDocument(created.id, actor);
    res.error ? failed++ : ok++;
  }

  logEvent('INFO', 'Seed', `Corpus importado desde ${dir}: ${ok} procesados, ${dup} duplicados saltados, ${failed} con error.`, 'admin');
  return { total: files.length, ok, dup, failed };
}

export function listCorpus(dir){
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(pdf|docx|txt)$/i.test(f)).sort();
}