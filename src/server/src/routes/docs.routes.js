import { Router } from 'express';
import path from 'node:path';
import { DocService, sanitizeFilename } from '../services/docService.js';
import { processDocument } from '../services/pipelineService.js';
import { authRequired, upload, asyncWrap, ok } from '../middleware.js';

export const docsRoutes = Router();

docsRoutes.use(authRequired);

docsRoutes.get('/', asyncWrap((req, res) => {
  const { q, cat, fmt, repo, sort } = req.query;
  ok(res, DocService.list(req.user, q, cat, fmt, repo, sort));
}));

docsRoutes.post('/', upload.single('file'), asyncWrap((req, res) => {
  if (!req.file) { res.status(400).json({ ok: false, error: { code: 'VAL', message: 'Archivo requerido.' } }); return; }
  const doc = DocService.create(req.user, req.file, req.body.repoId || 'general');
  ok(res, doc, 201);
}));

docsRoutes.get('/:id', asyncWrap((req, res) => {
  ok(res, DocService.get(req.params.id));
}));

docsRoutes.post('/:id/process', asyncWrap(async (req, res) => {
  const result = await processDocument(req.params.id, req.user);
  ok(res, result);
}));

docsRoutes.post('/:id/reprocess', asyncWrap(async (req, res) => {
  const result = await processDocument(req.params.id, req.user);
  ok(res, result);
}));

docsRoutes.get('/:id/download', asyncWrap((req, res) => {
  const d = DocService.downloadPath(req.params.id);
  const isPdf = d.name.toLowerCase().endsWith('.pdf');
  const isDocx = d.name.toLowerCase().endsWith('.docx');
  res.setHeader('Content-Type', isPdf ? 'application/pdf' : isDocx
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + sanitizeFilename(d.name) + '"');
  res.sendFile(path.resolve(d.filePath));
}));

docsRoutes.delete('/:id', asyncWrap((req, res) => {
  DocService.delete(req.user, req.params.id);
  ok(res, { message: 'Documento eliminado' });
}));