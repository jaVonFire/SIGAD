-- ============================================================
--  SIGAD — Sistema Inteligente de Gestión y Análisis Documental
--  Base de datos: SQLite
--
--  Esquema generado para el entregable académico del proyecto
--  integrador (UTS — VI semestre). Corresponde al esquema que el
--  servidor crea automáticamente en src/server/src/db.js.
--
--  Mario Javier Andrés Núñez Sánchez — Septiembre de 2026
--  Versión 1.0
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
--  Tabla: users
--  Cuentas de acceso al sistema.
--  role: 'admin' | 'analista'
--  hash: scrypt(pass, salt, 64) en hexadecimal
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  username  TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'analista'
            CHECK (role IN ('admin','analista')),
  salt      TEXT NOT NULL,
  hash      TEXT NOT NULL,
  created   INTEGER NOT NULL
);

-- ------------------------------------------------------------
--  Tabla: repos
--  Repositorios que agrupan documentos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repos (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  desc      TEXT NOT NULL DEFAULT '',
  ownerId   TEXT NOT NULL,
  created   INTEGER NOT NULL
);

-- ------------------------------------------------------------
--  Tabla: docs
--  Documentos cargados + metadatos + campos generados por IA.
--
--  status: pendiente | procesando | procesado | error
--  categoryProbs: JSON [{cat, p}]
--  summary:       JSON [oraciones]
--  entities:      JSON {fechas[], montos[], correos[],
--                       telefonos[], identificaciones[],
--                       personas[], organizaciones[]}
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS docs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  ext           TEXT NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  repoId        TEXT NOT NULL,
  ownerId       TEXT NOT NULL,
  ownerName     TEXT NOT NULL DEFAULT '',
  uploadedAt    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente','procesando','procesado','error')),
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

-- ------------------------------------------------------------
--  Tabla: sessions
--  Sesiones autenticadas. Solo se guarda el SHA-256 del token.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  tokenHash TEXT PRIMARY KEY,
  userId    TEXT NOT NULL,
  created   INTEGER NOT NULL,
  expires   INTEGER NOT NULL
);

-- ------------------------------------------------------------
--  Tabla: events
--  Bitácora de eventos del sistema.
--  level: INFO | WARN | ERROR
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id      TEXT PRIMARY KEY,
  ts      INTEGER NOT NULL,
  level   TEXT NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),
  comp    TEXT NOT NULL,
  msg     TEXT NOT NULL,
  user    TEXT NOT NULL DEFAULT 'sistema'
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts DESC);

-- ------------------------------------------------------------
--  Tabla: chat
--  Historial de conversación del asistente IA.
--  role: 'user' | 'ai'
--  terms:   JSON [términos expandidos]
--  sources: JSON [{n, id, name, category}]
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
--  Nota de migración: en bases creadas por versiones anteriores,
--  el servidor (src/server/src/db.js) aplica de forma condicional:
--    ALTER TABLE chat ADD COLUMN docId   TEXT;
--    ALTER TABLE chat ADD COLUMN docName TEXT;
--  En este script no se incluyen porque las columnas ya existen
--  en el CREATE TABLE (se evitaría error "duplicate column name").
-- ------------------------------------------------------------