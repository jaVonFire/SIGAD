import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, uid, now } from './db.js';
import { config } from './config.js';

/* ---------- Errores de negocio ---------- */
export class ApiError extends Error {
  constructor(code, message, status = 400){
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const fail = (code, message, status) => { throw new ApiError(code, message, status); };

/* ---------- Helper async para routes ---------- */
export const asyncWrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ---------- Hashing de contraseñas (scrypt, sin dependencias) ---------- */
export function hashPassword(password, salt){
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

/* ---------- Tokens de sesión (se almacena SHA-256 del token) ---------- */
export const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex');

function cleanSessions(){
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(now());
}

/* ---------- Autenticación ---------- */
export function authRequired(req, res, next){
  cleanSessions();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError('AUTH', 'Autenticación requerida.', 401));
  const row = db.prepare('SELECT s.userId, u.username, u.name, u.role, u.id FROM sessions s JOIN users u ON u.id = s.userId WHERE s.tokenHash = ?')
    .get(hashToken(token));
  if (!row) return next(new ApiError('AUTH', 'Sesión no válida o expirada.', 401));
  if (db.prepare('SELECT 1 FROM sessions WHERE tokenHash = ? AND expires < ?').get(hashToken(token), now())){
    return next(new ApiError('AUTH', 'Sesión expirada.', 401));
  }
  req.user = { id: row.id, username: row.username, name: row.name, role: row.role };
  req.token = token;
  next();
}

export function adminOnly(req, res, next){
  if (req.user?.role !== 'admin') return next(new ApiError('PERM', 'Solo el administrador puede realizar esta acción.', 403));
  next();
}

/* ---------- Multer (carga de archivos) ---------- */
fs.mkdirSync(config.uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadsDir),
  filename: (req, file, cb) => cb(null, uid() + '_' + path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_'))
});
export const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 }
});

/* ---------- Eventos/bitácora ---------- */
export function logEvent(level, comp, msg, user = 'sistema'){
  db.prepare('INSERT INTO events (id, ts, level, comp, msg, user) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid(), now(), level, comp, String(msg).slice(0, 500), user);
}

/* ---------- Respuestas del servidor ---------- */
export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });

export const DEFAULT_REPO_ID = 'general';