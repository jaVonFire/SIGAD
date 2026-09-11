import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/* Raíz del proyecto (donde vive package.json y public/): subimos de server/src a la base. */
export const PROJECT_ROOT = path.resolve(__dirname, '../..');

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.resolve(PROJECT_ROOT, process.env.DB_PATH || 'data/sigad.sqlite');
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, process.env.UPLOADS_DIR || 'uploads');
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS || 300000);

/* Integración LLM opcional (se documenta en el entregable de IA).
   Si AI_API_KEY y AI_API_BASE existen, el motor puede consultar un LLM
   compatible con la API de OpenAI para componer respuestas; en su
   defecto el sistema usa RAG extractivo 100% local (nada se inventa). */
const AI = {
  base: process.env.AI_API_BASE || null,
  key: process.env.AI_API_KEY || null,
  model: process.env.AI_MODEL || null,
};

export const config = {
  port: PORT,
  dbPath: DB_PATH,
  uploadsDir: UPLOADS_DIR,
  sessionTtlDays: SESSION_TTL_DAYS,
  maxUploadMb: MAX_UPLOAD_MB,
  maxTextChars: MAX_TEXT_CHARS,
  ai: AI,
};