import { Router } from 'express';
import { db } from '../db.js';
import { DashboardService } from '../services/dashboardService.js';
import { BackupService } from '../services/backupService.js';
import { importCorpus } from '../services/seedService.js';
import { Embedder } from '../nlp/embeddings.js';
import { authRequired, adminOnly, asyncWrap, ok, logEvent } from '../middleware.js';
import { PROJECT_ROOT } from '../config.js';
import path from 'node:path';

export const CORPUS_DIR = path.resolve(PROJECT_ROOT, '../Documentacion/10_Documentos_Prueba');

export const systemRoutes = Router();

systemRoutes.get('/dashboard', authRequired, asyncWrap((req, res) => {
  ok(res, DashboardService.all());
}));

systemRoutes.get('/events', authRequired, asyncWrap((req, res) => {
  const { level, limit = 150 } = req.query;
  const rows = level
    ? db.prepare('SELECT * FROM events WHERE level = ? ORDER BY ts DESC LIMIT ?').all(level, Number(limit))
    : db.prepare('SELECT * FROM events ORDER BY ts DESC LIMIT ?').all(Number(limit));
  const list = req.user.role === 'admin' ? rows : rows.filter(e => e.user === req.user.username);
  ok(res, list);
}));

systemRoutes.delete('/events', authRequired, adminOnly, asyncWrap((req, res) => {
  db.prepare('DELETE FROM events').run();
  logEvent('INFO', 'Registro', 'Bitácora limpiada por el administrador.', req.user.username);
  ok(res, { message: 'Registro limpiado' });
}));

systemRoutes.get('/backup', authRequired, asyncWrap((req, res) => {
  ok(res, BackupService.export(req.user));
}));

systemRoutes.post('/backup/restore', authRequired, adminOnly, asyncWrap(async (req, res) => {
  const data = req.body?.data || req.body;
  const result = await BackupService.restore(req.user, data);
  ok(res, result);
}));

systemRoutes.post('/seed/corpus', authRequired, adminOnly, asyncWrap(async (req, res) => {
  const result = await importCorpus(CORPUS_DIR);
  ok(res, result);
}));

systemRoutes.get('/system/info', asyncWrap((req, res) => {
  ok(res, {
    app: 'SIGAD', version: '1.0.0', node: process.version,
    corpusDir: CORPUS_DIR,
    embeddings: Embedder.stats()
  });
}));