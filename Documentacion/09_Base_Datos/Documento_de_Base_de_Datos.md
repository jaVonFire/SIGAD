# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Documento de Base de Datos

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Documento de Base de Datos |
| **Fecha** | Septiembre de 2026 |
| **Motor** | SQLite (nativo `node:sqlite`, modo WAL) |

---

## Tabla de contenido

1. Introducción y decisiones técnicas
2. Script de creación del esquema (DDL)
3. Diccionario de datos — tabla `users`
4. Diccionario de datos — tabla `repos`
5. Diccionario de datos — tabla `docs`
6. Diccionario de datos — tabla `sessions`
7. Diccionario de datos — tabla `events`
8. Diccionario de datos — tabla `chat`
9. Índices y restricciones
10. Migraciones incrementales
11. Diagrama Entidad-Relación (texto)
12. Consideraciones de respaldo y recuperación

---

## 1. Introducción y decisiones técnicas

SIGAD utiliza **SQLite** como motor de persistencia, accesible mediante el módulo nativo `node:sqlite` (DatabaseSync) introducido en Node.js 22.5.0. Esta decisión elimina la necesidad de instalar un servidor de base de datos separado, reduciendo la complejidad de despliegue a un solo archivo (`data/sigad.sqlite`) que se crea automáticamente al iniciar el servidor.

**Configuración activada:**
- `PRAGMA journal_mode = WAL` — permite concurrencia lector/escritor (lectores no bloqueados por escrituras).
- `PRAGMA foreign_keys = ON` — integridad referencial entre `repos`→`docs`, `users`→`docs`, `users`→`sessions`, `users`→`chat`.

**Campos JSON en texto:** Las columnas `categoryProbs`, `summary`, `entities`, `terms` y `sources` almacenan JSON serializado en columnas `TEXT`. El helper `parseJson` (db.js) desanida codificaciones anidadas legadas (JSON dentro de JSON, hasta 8 niveles).

---

## 2. Script de creación del esquema (DDL)

```sql
-- ============================================================
-- SIGAD — Script de creación del esquema relacional
-- Motor: SQLite (node:sqlite, WAL mode)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- Tabla: users
-- Propósito: Almacena las cuentas de acceso al sistema.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,                     -- UUID v4
  username  TEXT NOT NULL UNIQUE,                 -- nombre de usuario (minúsculas)
  name      TEXT NOT NULL,                        -- nombre completo
  role      TEXT NOT NULL DEFAULT 'analista'      -- rol: 'admin' o 'analista'
            CHECK (role IN ('admin','analista')),
  salt      TEXT NOT NULL,                        -- sal UUID para scrypt
  hash      TEXT NOT NULL,                        -- hash scrypt (64 bytes hex)
  created   INTEGER NOT NULL                      -- marca temporal (epoch ms)
);

-- ------------------------------------------------------------
-- Tabla: repos
-- Propósito: Repositorios que agrupan documentos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repos (
  id        TEXT PRIMARY KEY,                     -- UUID v4
  name      TEXT NOT NULL,                        -- nombre del repositorio
  desc      TEXT NOT NULL DEFAULT '',             -- descripción
  ownerId   TEXT NOT NULL,                        -- usuario creador (FK users)
  created   INTEGER NOT NULL                      -- marca temporal
);

-- ------------------------------------------------------------
-- Tabla: docs
-- Propósito: Documentos cargados y sus metadatos + campos IA.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS docs (
  id            TEXT PRIMARY KEY,                 -- UUID v4
  name          TEXT NOT NULL,                    -- nombre original del archivo
  ext           TEXT NOT NULL,                    -- extensión: pdf/docx/txt
  size          INTEGER NOT NULL DEFAULT 0,       -- tamaño en bytes
  repoId        TEXT NOT NULL,                    -- repositorio contenedor (FK repos)
  ownerId       TEXT NOT NULL,                    -- usuario que cargó (FK users)
  ownerName     TEXT NOT NULL DEFAULT '',         -- nombre del propietario (denormalizado)
  uploadedAt    INTEGER NOT NULL,                 -- marca de carga
  status        TEXT NOT NULL DEFAULT 'pendiente' -- pendiente/procesando/procesado/error
                CHECK (status IN ('pendiente','procesando','procesado','error')),
  filePath      TEXT NOT NULL,                    -- ruta física en uploads/
  error         TEXT,                             -- razón del error (≤400 chars)
  text          TEXT,                             -- texto limpio extraído (truncado)
  pages         INTEGER,                          -- páginas (PDF)
  wordCount     INTEGER,                          -- conteo de palabras
  category      TEXT,                             -- categoría IA asignada
  categoryProbs TEXT,                             -- JSON: [{cat, p}]
  summary       TEXT,                             -- JSON: [oraciones]
  entities      TEXT,                             -- JSON: {fechas[], montos[], ...}
  analysisAt    INTEGER                           -- marca de procesamiento IA
);

-- ------------------------------------------------------------
-- Tabla: sessions
-- Propósito: Sesiones autenticadas (solo hash del token).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  tokenHash TEXT PRIMARY KEY,                     -- SHA-256 del token
  userId    TEXT NOT NULL,                        -- usuario (FK users)
  created   INTEGER NOT NULL,                     -- creación
  expires   INTEGER NOT NULL                      -- expiración = created + TTL
);

-- ------------------------------------------------------------
-- Tabla: events
-- Propósito: Bitácora de eventos del sistema.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id      TEXT PRIMARY KEY,                       -- UUID v4
  ts      INTEGER NOT NULL,                       -- marca temporal
  level   TEXT NOT NULL                           -- INFO/WARN/ERROR
          CHECK (level IN ('INFO','WARN','ERROR')),
  comp    TEXT NOT NULL,                          -- componente fuente
  msg     TEXT NOT NULL,                          -- mensaje (≤500 chars)
  user    TEXT NOT NULL DEFAULT 'sistema'         -- nombre de usuario o 'sistema'
);

-- ------------------------------------------------------------
-- Tabla: chat
-- Propósito: Historial de conversación del asistente IA.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat (
  id      TEXT PRIMARY KEY,                       -- UUID v4
  userId  TEXT NOT NULL,                          -- usuario (FK users)
  role    TEXT NOT NULL,                          -- 'user' o 'ai'
  ts      INTEGER NOT NULL,                       -- marca del mensaje
  q       TEXT,                                   -- pregunta del usuario (o asociada)
  type    TEXT,                                   -- 'answer'/'none' (respuestas IA)
  intent  TEXT,                                   -- intención detectada
  conf    REAL,                                   -- confianza 0-1
  terms   TEXT,                                   -- JSON: términos expandidos
  sources TEXT,                                   -- JSON: [{n, id, name, category}]
  html    TEXT,                                   -- HTML de la respuesta
  docId   TEXT,                                   -- ámbito del documento (si aplica)
  docName TEXT                                    -- nombre del documento del ámbito
);
```

---

## 3. Diccionario de datos — tabla `users`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `id` | TEXT | No | PK | Identificador único del usuario | UUID v4 generado por `crypto.randomUUID()` |
| `username` | TEXT | No | UNIQUE | Nombre de usuario para login | Minúsculas, sin espacios, único |
| `name` | TEXT | No | — | Nombre completo visible | Cualquier cadena (p. ej. "Administrador") |
| `role` | TEXT | No | CHECK | Rol de autorización | `'admin'` o `'analista'` (default: `'analista'`) |
| `salt` | TEXT | No | — | Sal para hashing de contraseña | UUID v4 generado al crear el usuario |
| `hash` | TEXT | No | — | Hash de la contraseña | `scryptSync(pass, salt, 64)` en hex (128 chars) |
| `created` | INTEGER | No | — | Fecha de creación | Epoch milliseconds (`Date.now()`) |

**Semillas por defecto:**

| id | username | name | role | hash (sha256 del token) |
|---|---|---|---|---|
| `admin` | `admin` | Administrador | admin | scrypt de `sigad2024` |
| `analista` | `analista` | Analista de Prueba | analista | scrypt de `analista2024` |

---

## 4. Diccionario de datos — tabla `repos`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `id` | TEXT | No | PK | Identificador único del repositorio | UUID v4 |
| `name` | TEXT | No | — | Nombre del repositorio | Cualquier cadena |
| `desc` | TEXT | No | — | Descripción del repositorio | Default `''` |
| `ownerId` | TEXT | No | FK → users | Usuario creador | Debe existir en `users` |
| `created` | INTEGER | No | — | Fecha de creación | Epoch milliseconds |

**Repositorio por defecto:** `id='general'`, `name='General'`, `desc='Repositorio por defecto del sistema'`, `ownerId='system'`. No puede eliminarse.

---

## 5. Diccionario de datos — tabla `docs`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `id` | TEXT | No | PK | Identificador único del documento | UUID v4 |
| `name` | TEXT | No | — | Nombre original del archivo | Conservado al cargar |
| `ext` | TEXT | No | — | Extensión normalizada | `'pdf'`, `'docx'` o `'txt'` |
| `size` | INTEGER | No | — | Tamaño del archivo original | En bytes |
| `repoId` | TEXT | No | FK → repos | Repositorio contenedor | Debe existir en `repos` |
| `ownerId` | TEXT | No | FK → users | Usuario que cargó | Debe existir en `users` |
| `ownerName` | TEXT | No | — | Nombre del propietario | Denormalizado al cargar |
| `uploadedAt` | INTEGER | No | — | Fecha y hora de carga | Epoch milliseconds |
| `status` | TEXT | No | CHECK | Estado del procesamiento | `'pendiente'` → `'procesando'` → `'procesado'` / `'error'` |
| `filePath` | TEXT | No | — | Ruta física del archivo | `uploads/<uuid>_<nombre>` |
| `error` | TEXT | Sí | — | Razón del error de procesamiento | ≤ 400 caracteres; `NULL` si no hay error |
| `text` | TEXT | Sí | — | Texto limpio extraído | Truncado a `MAX_TEXT_CHARS` (300000) |
| `pages` | INTEGER | Sí | — | Número de páginas | Solo para PDF; `NULL` en DOCX/TXT |
| `wordCount` | INTEGER | Sí | — | Conteo total de palabras | Incluye todas las palabras del texto original |
| `category` | TEXT | Sí | — | Categoría asignada por IA | `'Contrato'`, `'Factura'`, `'Correspondencia'`, `'Informe'` |
| `categoryProbs` | TEXT (JSON) | Sí | — | Probabilidades por categoría | `[{"cat":"Factura","p":0.97},...]` ordenado desc |
| `summary` | TEXT (JSON) | Sí | — | Oraciones del resumen analítico | `["Oración 1.","Oración 2.",...]` (≤7 oraciones) |
| `entities` | TEXT (JSON) | Sí | — | Entidades extraídas por tipo | `{"fechas":[],"montos":[],"correos":[],"telefonos":[],"identificaciones":[],"personas":[],"organizaciones":[]}` |
| `analysisAt` | INTEGER | Sí | — | Marca de último procesamiento IA | Epoch milliseconds |

---

## 6. Diccionario de datos — tabla `sessions`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `tokenHash` | TEXT | No | PK | Hash SHA-256 del token de sesión | 64 caracteres hex |
| `userId` | TEXT | No | FK → users | Usuario propietario de la sesión | Debe existir en `users` |
| `created` | INTEGER | No | — | Fecha de creación de la sesión | Epoch milliseconds |
| `expires` | INTEGER | No | — | Fecha de expiración | `created + SESSION_TTL_DAYS * 86400000` |

**Notas de seguridad:**
- Nunca se almacena el token en texto plano, solo su SHA-256.
- Las sesiones vencidas se eliminan automáticamente en cada petición autenticada (`cleanSessions()`).
- El TTL es configurable mediante `SESSION_TTL_DAYS` (default 7 días).

---

## 7. Diccionario de datos — tabla `events`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `id` | TEXT | No | PK | Identificador del evento | UUID v4 |
| `ts` | INTEGER | No | — | Marca temporal del evento | Epoch milliseconds |
| `level` | TEXT | No | CHECK | Nivel de severidad | `'INFO'`, `'WARN'` o `'ERROR'` |
| `comp` | TEXT | No | — | Componente que generó el evento | `'Autenticación'`, `'Pipeline'`, `'Seed'`, etc. |
| `msg` | TEXT | No | — | Descripción del evento | Truncado a 500 caracteres |
| `user` | TEXT | No | — | Usuario que generó el evento | Nombre de usuario o `'sistema'` |

**Eventos registrados:**
- Login exitoso / fallido (WARN).
- Registro de usuario.
- Carga de documento.
- Procesamiento exitoso / fallido (ERROR).
- Reset de contraseña.
- Importación de corpus.

---

## 8. Diccionario de datos — tabla `chat`

| Campo | Tipo | Nulo | PK/FK | Descripción | Valores / Restricciones |
|---|---|---|---|---|---|
| `id` | TEXT | No | PK | Identificador del mensaje | UUID v4 |
| `userId` | TEXT | No | FK → users | Usuario propietario de la conversación | Debe existir en `users` |
| `role` | TEXT | No | — | Rol del mensaje | `'user'` (pregunta) o `'ai'` (respuesta) |
| `ts` | INTEGER | No | — | Marca temporal del mensaje | Epoch milliseconds |
| `q` | TEXT | Sí | — | Texto de la pregunta | Presente en ambos roles (en `ai` es la pregunta asociada) |
| `type` | TEXT | Sí | — | Tipo de respuesta IA | `'answer'` (con fuentes) o `'none'` (sin información) |
| `intent` | TEXT | Sí | — | Intención detectada por RAG | `'count'`, `'cat'`, `'money'`, `'date'`, `'who'`, `'what'`, `'pending'`, `'saludo'`, `'help'`, `'none'` |
| `conf` | REAL | Sí | — | Confianza de la respuesta | 0.0 a 1.0 |
| `terms` | TEXT (JSON) | Sí | — | Términos de la consulta expandidos | `["pago","factura","valor",...]` |
| `sources` | TEXT (JSON) | Sí | — | Fuentes citadas en la respuesta | `[{"n":1,"id":"...","name":"...","category":"..."}]` |
| `html` | TEXT | Sí | — | HTML formateado de la respuesta | Incluye `<p>`, `<ul>`, `<li>`, `<mark>`, `[n]` |
| `docId` | TEXT | Sí | — | Ámbito del documento | `NULL` si es consulta general; UUID si es acotada |
| `docName` | TEXT | Sí | — | Nombre del documento del ámbito | `NULL` si es general |

**Límite de historial:** 200 mensajes por usuario (se eliminan los más antiguos tras cada inserción).

---

## 9. Índices y restricciones

```sql
-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_docs_repo   ON docs (repoId);
CREATE INDEX IF NOT EXISTS idx_docs_status ON docs (status);
CREATE INDEX IF NOT EXISTS idx_docs_owner  ON docs (ownerId);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user   ON chat (userId);

-- Restricciones CHECK
-- users: role IN ('admin','analista')
-- docs:  status IN ('pendiente','procesando','procesado','error')
-- events: level IN ('INFO','WARN','ERROR')

-- Restricción UNIQUE
-- users: username UNIQUE
```

**Propósito de cada índice:**
- `idx_docs_repo`: acelerar listados por repositorio (filtros del frontend).
- `idx_docs_status`: filtrar documentos por estado (panel de pendientes/procesados).
- `idx_docs_owner`: verificar propiedad al eliminar documentos.
- `idx_events_ts`: ordenar eventos por fecha (bitácora más reciente primero).
- `idx_chat_user`: recuperar historial de conversación por usuario.

---

## 10. Migraciones incrementales

Para bases de datos existentes (creadas antes de la funcionalidad de chat acotado), se aplican migraciones condicionales al iniciar:

```sql
-- Añadir soporte de chat acotado a documento
ALTER TABLE chat ADD COLUMN docId   TEXT;
ALTER TABLE chat ADD COLUMN docName TEXT;
```

Estas migraciones se ejecutan en `db.js` de forma condicional (verifican si las columnas ya existen mediante `PRAGMA table_info('chat')`). El patrón `try/catch` silencioso permite que la migración se ejecute múltiples veces sin error si la columna ya fue añadida.

---

## 11. Diagrama Entidad-Relación (texto)

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  users   │ 1────N │  repos   │ 1────N │   docs   │
│          │         │          │         │          │
│ id (PK)  │         │ id (PK)  │         │ id (PK)  │
│ username │         │ name     │         │ name     │
│ role     │         │ desc     │         │ ext      │
│ salt     │         │ ownerId  │──→ users│ size     │
│ hash     │         │ created  │         │ repoId   │──→ repos
│ created  │         └──────────┘         │ ownerId  │──→ users
│          │                              │ status   │
│          │ 1────N ┌──────────┐          │ text     │
│          │         │ sessions │          │ category │
│          │         │          │          │ summary  │
│          │         │ tokenHash│          │ entities │
│          │         │ userId   │──→ users │ ...      │
│          │         │ expires  │          └──────────┘
│          │         └──────────┘
│          │ 1────N ┌──────────┐
│          │         │  events  │
│          │         │          │
│          │         │ id (PK)  │
│          │         │ ts       │
│          │         │ level    │
│          │         │ comp     │
│          │         │ msg      │
│          │         │ user     │
│          │         └──────────┘
│          │ 1────N ┌──────────┐
│          │         │   chat   │
│          │         │          │
│          │         │ id (PK)  │
│          │         │ userId   │──→ users
│          │         │ role     │
│          │         │ q        │
│          │         │ intent   │
│          │         │ sources  │
│          │         │ html     │
│          │         │ docId    │──→ docs (opcional)
│          │         └──────────┘
└──────────┘
```

---

## 12. Consideraciones de respaldo y recuperación

### 12.1 Respaldo del archivo SQLite
```bash
# Detener el servicio primero (o copiar en modo WAL consistente)
copy src\data\sigad.sqlite      backup\sigad_YYYYMMDD.sqlite
copy src\data\sigad.sqlite-wal  backup\sigad_YYYYMMDD.sqlite-wal
copy src\data\sigad.sqlite-shm  backup\sigad_YYYYMMDD.sqlite-shm
copy src\uploads\               backup\uploads_YYYYMMDD\ /E /I
```

### 12.2 Restauración
1. Detener el servicio.
2. Reemplazar `data/sigad.sqlite` y `uploads/` con los respaldos.
3. Reiniciar; los índices TF-IDF y el espacio LSA se reconstruyen automáticamente desde `docs.text`.

### 12.3 Respaldo lógico (JSON)
La API `GET /api/backup` exporta usuarios (sin hashes), repositorios, documentos y eventos en un JSON. La función `POST /api/backup/restore` re-crea repositorios y documentos a partir de ese JSON.

### 12.4 Integridad
- `PRAGMA foreign_keys = ON` garantiza que no existan documentos huérfanos.
- Las migraciones son idempotentes (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` condicional).
- El modo WAL permite recuperación automática tras un corte inesperado de energía.

---

*Fin del Documento de Base de Datos — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*