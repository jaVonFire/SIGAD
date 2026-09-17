import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, PROJECT_ROOT } from './src/config.js';
import { db } from './src/db.js';
import { ensureDefaults } from './src/services/seedService.js';
import { DocService } from './src/services/docService.js';
import { Index } from './src/nlp/tfidf.js';
import { Embedder } from './src/nlp/embeddings.js';
import { setDocsLoader } from './src/nlp/rag.js';
import { ApiError } from './src/middleware.js';
import { authRoutes } from './src/routes/auth.routes.js';
import { usersRoutes } from './src/routes/users.routes.js';
import { reposRoutes } from './src/routes/repos.routes.js';
import { docsRoutes } from './src/routes/docs.routes.js';
import { askRoutes } from './src/routes/ask.routes.js';
import { systemRoutes } from './src/routes/system.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');

/* ----- Estado inicial ------ */
ensureDefaults();
Index.rebuild(DocService.processedForIndex());
try { Embedder.train(DocService.processedForIndex()); }
catch (e){ console.error('[SIGAD] No se pudieron construir los embeddings LSA:', e.message); }
setDocsLoader(async () => DocService.allForChat());

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ----- API ----- */
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/repos', reposRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api', askRoutes);
app.use('/api', systemRoutes);

/* ----- API 404 ----- */
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOTFOUND', message: 'Ruta no encontrada.' } });
});

/* ----- Frontend estático ----- */
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

/* ----- Error handler ----- */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err instanceof ApiError ? err.status : (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const code = err.code || 'INTERNAL';
  const message = status === 500 ? (config.nodeEnv === 'test' ? String(err.message || err) : 'Error interno del servidor.') :
    (err.message || 'Error inesperado.');
  if (status === 500) console.error('[error]', err);
  res.status(status).json({ ok: false, error: { code, message } });
});

app.listen(config.port, () => {
  console.log(`[SIGAD] Servidor listo en http://localhost:${config.port}`);
  console.log(`[SIGAD] Base de datos: ${config.dbPath}`);
  console.log(`[SIGAD] Uploads: ${config.uploadsDir}`);
});