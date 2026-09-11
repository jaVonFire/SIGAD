import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  username  TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'analista' CHECK (role IN ('admin','analista')),
  salt      TEXT NOT NULL,
  hash      TEXT NOT NULL,
  created   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS repos (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  desc      TEXT NOT NULL DEFAULT '',
  ownerId   TEXT NOT NULL,
  created   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS docs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  ext           TEXT NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  repoId        TEXT NOT NULL,
  ownerId       TEXT NOT NULL,
  ownerName     TEXT NOT NULL DEFAULT '',
  uploadedAt    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendiente',
  filePath      TEXT NOT NULL,
  error         TEXT,
  text          TEXT,
  pages         INTEGER,
  wordCount     INTEGER,
  category      TEXT,
  categoryProbs TEXT,
  summary       TEXT,
  entities      TEXT,
  analysisAt    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_docs_repo  ON docs (repoId);
CREATE INDEX IF NOT EXISTS idx_docs_status ON docs (status);
CREATE INDEX IF NOT EXISTS idx_docs_owner  ON docs (ownerId);

CREATE TABLE IF NOT EXISTS sessions (
  tokenHash TEXT PRIMARY KEY,
  userId    TEXT NOT NULL,
  created   INTEGER NOT NULL,
  expires   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id      TEXT PRIMARY KEY,
  ts      INTEGER NOT NULL,
  level   TEXT NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),
  comp    TEXT NOT NULL,
  msg     TEXT NOT NULL,
  user    TEXT NOT NULL DEFAULT 'sistema'
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts DESC);

CREATE TABLE IF NOT EXISTS chat (
  id      TEXT PRIMARY KEY,
  userId  TEXT NOT NULL,
  role    TEXT NOT NULL,
  ts      INTEGER NOT NULL,
  q       TEXT,
  type    TEXT,
  intent  TEXT,
  conf    REAL,
  terms   TEXT,
  sources TEXT,
  html    TEXT,
  docId   TEXT,
  docName TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat (userId);
`;

db.exec(MIGRATIONS);

/* Migraciones incrementales para bases existentes */
const cols = db.prepare("PRAGMA table_info('chat')").all().map(c => c.name);
if (!cols.includes('docId')){
  try { db.exec('ALTER TABLE chat ADD COLUMN docId TEXT'); } catch (e) { }
}
if (!cols.includes('docName')){
  try { db.exec('ALTER TABLE chat ADD COLUMN docName TEXT'); } catch (e) { }
}

export const now = () => Date.now();
export const uid = () => crypto.randomUUID();
export const parseJson = (s, fallback = null) => {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};