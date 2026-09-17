# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Documento de Diseño (Arquitectura de Software y Modelado)

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Documento de Diseño |
| **Fecha** | Septiembre de 2026 |
| **Carta de replicabilidad** | Patrón arquitectónico implementado en `src/server` y `src/public` |

---

## Tabla de contenido

1. Arquitectura general de la solución
2. Arquitectura de componentes
3. Diseño de modelos y datos
4. Diseño de APIs y servicios
5. Flujo de procesamiento documental e integración de IA
6. Decisiones tecnológicas y justificación
7. Diseño de seguridad y prototipos de interfaz
8. Diagramas de la solución
9. Referencias

---

## 1. Arquitectura general de la solución

### 1.1 Patrón arquitectónico adoptado: Arquitectura limpia modular con capas y SPA

SIGAD adopta un **patrón de arquitectura por capas (layered architecture) con matices de arquitectura limpia (clean architecture)** organizado en dos ámbitos complementarios y desplegados por el mismo servidor Express:

1. **Backend** (`src/server/`): capa de transporte HTTP (rutas), capa de aplicación (servicios), capa de dominio inteligente (NLP) y capa de infraestructura (persistencia SQLite y sistema de archivos).
2. **Frontend** (`src/public/`): aplicación de una sola página (SPA) construida con JavaScript vanilla modular (ES Modules), sin frameworks de UI, que consume la API REST mediante `fetch`.

Las dependencias fluyen **de afuera hacia adentro**: las rutas dependen de los servicios; los servicios dependen de los módulos NLP y de la persistencia; los módulos NLP son **agnósticos del transporte HTTP** (no importan Express ni el árbol de rutas), lo que permite probarlos de forma unitaria y reemplazarlos sin afectar el resto del sistema. Este criterio reproduce el principio de dependencias de la arquitectura limpia: las reglas de negocio (clasificación, resumen, RAG) no conocen al framework web.

Además, se aplican los siguientes patrones de diseño complementarios:

- **Middleware chain (Express):** autenticación, autorización por rol, parseo de cuerpo y manejo global de errores se implementan como middleware encadenado (`authRequired`, `adminOnly`, `asyncWrap`, manejador de errores 404/500).
- **Repository/Service pattern:** el acceso a datos se encapsula en servicios (`DocService`, `RepoService`, `UserService`, `ChatService`, `BackupService`, `DashboardService`) que exponen operaciones de dominio y dejan la sintaxis SQL aislada del resto.
- **Dependency injection manual:** el motor RAG recibe sus fuentes de documentos mediante un inyector (`setDocsLoader`), lo que permite conmutar entre la base real y conjuntos sintéticos en las pruebas.
- **Singleton de estado:** el índice TF-IDF, el modelo Naive Bayes y el espacio semántico LSA se materializan en módulos singleton en memoria, reconstruibles en el arranque y actualizables incrementalmente.
- **Facade del asistente:** `rag.ask(q, opts)` actúa como fachada que orquesta detección de intención, agregación, recuperación, composición de HTML y (opcional) aumento con LLM.

### 1.2 Vista lógica de paquetes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              NAVEGADOR (SPA)                               │
│  public/index.html · main.js · router.js · api.js · ui.js · views/*.js     │
│  (dashboard, docs, detail, chat, repos, log, users, backup, login)         │
└───────────────▲───────────────────────────────────────────────▲────────────┘
                │ HTTP/JSON (REST) · Authorization: Bearer       │ estáticos
┌───────────────┴───────────────────────────────────────────────┴────────────┐
│                            SERVIDOR EXPRESS                                 │
│  index.js: middlewares, montaje de rutas, estáticos, error handler          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ RUTAS (routes/*.js) — auth · users · repos · docs · ask · system       │  │
│  │   - authRequired / adminOnly / upload (multer) / asyncWrap              │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ SERVICIOS (services/*.js) — Auth · User · Repo · Doc · Chat · Dashboard│  │
│  │  · Backup · Seed  (acceso a datos + reglas de aplicación)            │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ MOTOR DE IA / NLP (nlp/*.js) — tokenizer · classifier · summarizer ·   │  │
│  │   analyst · entities · tfidf · embeddings (LSA) · rag (RAG)           │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ INFRAESTRUCTURA — config (env) · db (node:sqlite, WAL) · middleware    │  │
│  │   archivos: uploads/* (pdf/docx/txt)                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Justificación de la arquitectura

La elección responde a tres restricciones del contexto académico-empresarial: (1) **simplicidad de despliegue** — un solo proceso Node sirve API y frontend, sin orquestación adicional; (2) **separación de intereses para la evaluación** — cada capa es verificable por separado (tests unitarios del NLP, tests de integración por rutas, smoke E2E); (3) **evolución controlada** — la capa NLP está aislada para permitir la sustitución futura del embeddings local por embeddings remotas o de una base vectorial dedicada sin modificar la API.

---

## 2. Arquitectura de componentes

### 2.1 Frontend (SPA)

| Componente | Archivos | Responsabilidad |
|---|---|---|
| Bootstrap | `public/index.html`, `public/js/main.js` | Punto de entrada; construye navegación por rol; despacha la vista según `location.hash`. |
| Router | `public/js/router.js` | Registro de rutas (`#/panel`, `#/docs`, `#/chat`, `#/repos`, `#/log`, `#/users`, `#/backup`), parseo de hash, control de rutas admin. |
| Cliente API | `public/js/api.js` | `fetch` con token Bearer, serialización JSON/FormData, manejo 401 (logout), sesión en `localStorage`, descarga de blob. |
| Utilidades UI | `public/js/ui.js` | escape HTML, chips/badges, formato de fechas/bytes, toasts, estado "ocupado". |
| Vistas | `views/login.js`, `dashboard.js`, `docs.js`, `detail.js`, `chat.js`, `repos.js`, `log.js`, `users.js`, `backup.js` | Render por vista; cada vista consume la API y actualiza el DOM. |
| Estilos | `public/css/app.css` | Tema visual (paleta, tarjetas, barras, tablas, chat, responsividad). |

No se utilizan frameworks de interfaz: el DOM estatal y los eventos se gestionan con JavaScript nativo, lo que elimina dependencias de compilación, minimiza el tamaño y facilita la revisión académica del código.

### 2.2 Backend — capas

**Rutas (`routes/`).** Definen contratos HTTP y orquestan con los servicios:
- `auth.routes.js` → `/api/auth/*` (register, login, logout, me).
- `users.routes.js` → `/api/users/*` (adminOnly: list, role, delete, reset).
- `repos.routes.js` → `/api/repos/*` (list, create, delete).
- `docs.routes.js` → `/api/docs/*` (list/create con multer, get, process/reprocess, download, delete).
- `ask.routes.js` → `/api/search`, `/api/ask`, `/api/chat` (get/delete).
- `system.routes.js` → `/api/dashboard`, `/api/events`, `/api/backup`, `/api/backup/restore`, `/api/seed/corpus`, `/api/system/info`.

**Servicios (`services/`).** Encapsulan reglas de aplicación y persistencia:
- `AuthService`: registro, login, logout, sesión (hash del token, TTL), `me`.
- `UserService`: listado con conteo de documentos, cambio de rol, eliminación, reseteo de contraseña.
- `RepoService`: CRUD de repositorios, protección del repo `general`, reasignación de documentos.
- `DocService`: creación con validación, consultas (get/getFull/list), descarga, eliminación con permiso por propiedad, actualización de campos IA, selección de documentos para índice/chat, ayuda de formato de bytes y nombre seguro.
- `ChatService`: historial por usuario/ámbito, limitación a 200 mensajes, limpieza.
- `DashboardService`: agregación de KPIs a partir de `docs` y `events`.
- `BackupService`: exportación/restauración JSON (sin hashes de contraseñas).
- `SeedService`: creación de usuarios/repositorio por defecto e importación del corpus.

**Motor de IA/NLP (`nlp/`).** Componentes funcionales puros (ver sección 5 para el flujo detallado):
- `tokenizer.js`: normalización (NFD, minúsculas), stopwords en español, stemming ligero por sufijos, entrecortado de oraciones, conteo de palabras y expansión léxica por sinónimos de dominio.
- `classifier.js`: Naive Bayes multinomial con suavizado de Laplace, escala logarítmica, 4 categorías y vocabulario de dominio colombiano.
- `summarizer.js`: resumen extractivo por frecuencia (TF), penalización de oraciones largas, premio a oraciones concretas (montos/fechas/NIT), deduplicación por solapamiento.
- `analyst.js`: análisis descriptivo que compone oraciones con tipo, título, objeto, partes, cifras y fechas; soporte extractivo para completar.
- `entities.js`: NER por patrones (fechas, montos con COP/USD/EUR, correos, teléfonos, NIT/CC/CE, personas, organizaciones) y conversor `toNum`.
- `tfidf.js`: índice invertido en memoria con TF-IDF, fragmentos por oración, `bestSnippets`.
- `embeddings.js`: LSA con SVD truncado aleatorizado (multiplicación de potencias + QR + autovalores de Jacobi) sobre la matriz TF-IDF; vectores de documento y consulta; similitud coseno.
- `rag.js`: orquestador de consulta (intención, agregados, recuperación, composición, aumento opcional con LLM).

**Infraestructura (`src/` base):** `config.js` (variables de entorno), `db.js` (DatabaseSync + migraciones + helpers `uid/now/parseJson`), `middleware.js` (hash scrypt, tokens, multer, errores, logEvent).

### 2.3 Capa de datos y almacenamiento

- **Base de datos relacional:** SQLite (módulo nativo `node:sqlite`) en el archivo `data/sigad.sqlite`, con modo WAL.
- **Almacenamiento de archivos:** sistema de archivos local en `uploads/` con nombres únicos (`<uuid>_<nombre>`); los documentos del corpus se copian físicamente a `uploads/` al importar.
- **Estado en memoria (caché de índices):** índice TF-IDF y espacio LSA reconstruidos en el arranque. No se persisten vectores; se vuelven a aprender del texto `docs.text` (diseño determinista y reproducible).

### 2.4 Motor de IA (vista de componentes)

```
            ┌──────────────────────────────────────────────┐
            │                 rag.js  (RAG)                 │
            │  ask(q,{docId}) → intent → agregado → ranked  │
            └───────┬──────────────┬───────────────┬────────┘
                    │              │               │
       ┌────────────▼───────┐ ┌────▼───────────┐ ┌─▼──────────────┐
       │ agregados (entidades│ │ tfidf.js       │ │ embeddings.js  │
       │  count/money/date/ │ │ scoreQuery     │ │ LSA · score()  │
       │  who/pending/cat)  │ │ bestSnippets   │ │ queryVec       │
       └─────────┬──────────┘ └────┬───────────┘ └─┬──────────────┘
                 │                 │               │
                 └─────────────────┴───────────────┴──► tokenizer.js (base)
                                          ▲
        classifier.js · summarizer.js · analyst.js · entities.js  (otras etapas)
```

---

## 3. Diseño de modelos y datos

### 3.1 Modelo Entidad-Relación (MER)

El modelo se compone de seis entidades relacionales: `users`, `repos`, `docs`, `sessions`, `events` y `chat`. Además, los componentes de IA mantienen **estructuras derivadas en memoria** (índice TF-IDF, modelo Bayes y espacio LSA) que no son entidades persistentes sino proyecciones de `docs.text`.

**Relaciones:**
- `users` 1—N `repos` (ownerId) — un usuario puede crear varios repositorios.
- `users` 1—N `docs` (ownerId) — un usuario puede cargar varios documentos.
- `repos` 1—N `docs` (repoId) — un repositorio agrupa documentos.
- `users` 1—N `sessions` (userId) — una cuenta puede tener varias sesiones.
- `users` 1—N `events` (user, name del usuario) — bitácora referida por nombre de usuario.
- `users` 1—N `chat` (userId) — historial de conversación por cuenta.
- `docs` 1—N `chat` (docId) — el chat puede acotarse a un documento.

### 3.2 Esquema relacional (DDL real)

```sql
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
```

Los campos `categoryProbs`, `summary`, `entities`, `terms` y `sources` se almacenan como **JSON en texto** (columnas `TEXT`). Concretamente: `categoryProbs` es un arreglo `[{cat, p}]`; `summary` es un arreglo de oraciones; `entities` es un objeto `{fechas[], montos[], correos[], telefonos[], identificaciones[], personas[], organizaciones[]}`; `terms` es el arreglo de términos expandidos; `sources` es el arreglo de fuentes `[{n|id|name|category}]`. El helper `parseJson` (db.js) desanida codificaciones anidadas legadas (JSON dentro de JSON) con un bucle de hasta 8 iteraciones.

### 3.3 Diccionario de datos

#### Tabla `users`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | TEXT (UUID) | No | Identificador primario. |
| username | TEXT | No, único | Nombre de usuario en minúsculas. |
| name | TEXT | No | Nombre completo del usuario. |
| role | TEXT | No | Rol: `admin`/`analista` (CHECK). |
| salt | TEXT | No | Sal aleatoria por usuario (UUID). |
| hash | TEXT | No | Hash scrypt (64 bytes hex) de la contraseña. |
| created | INTEGER | No | Marca temporal (epoch ms). |

#### Tabla `repos`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | TEXT (UUID) | No | Identificador primario. |
| name | TEXT | No | Nombre del repositorio. |
| desc | TEXT | No | Descripción (por defecto ''). |
| ownerId | TEXT | No | Usuario creador. |
| created | INTEGER | No | Marca temporal. |

#### Tabla `docs`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | TEXT (UUID) | No | Identificador primario. |
| name | TEXT | No | Nombre original del archivo. |
| ext | TEXT | No | Extensión normalizada: pdf/docx/txt. |
| size | INTEGER | No | Tamaño en bytes. |
| repoId | TEXT | No | Repositorio contenedor (FK → repos). |
| ownerId | TEXT | No | Usuario que cargó (FK → users). |
| ownerName | TEXT | No | Nombre del propietario (denormalizado). |
| uploadedAt | INTEGER | No | Marca de carga. |
| status | TEXT | No | `pendiente`/`procesando`/`procesado`/`error`. |
| filePath | TEXT | No | Ruta física en `uploads/`. |
| error | TEXT | Sí | Razón del error de procesamiento (≤400). |
| text | TEXT | Sí | Texto limpio extraído (truncado a MAX_TEXT_CHARS). |
| pages | INTEGER | Sí | Número de páginas (PDF). |
| wordCount | INTEGER | Sí | Conteo de palabras sin recorte. |
| category | TEXT | Sí | Categoría asignada por IA. |
| categoryProbs | TEXT (JSON) | Sí | Probabilidades por categoría. |
| summary | TEXT (JSON) | Sí | Arreglo de oraciones del análisis. |
| entities | TEXT (JSON) | Sí | Entidades extraídas por tipo. |
| analysisAt | INTEGER | Sí | Marca de procesamiento. |

#### Tabla `sessions`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| tokenHash | TEXT | No | SHA-256 del token (PK). |
| userId | TEXT | No | Usuario de la sesión. |
| created | INTEGER | No | Creación de la sesión. |
| expires | INTEGER | No | Expiración = created + TTL. |

#### Tabla `events`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | TEXT (UUID) | No | Identificador primario. |
| ts | INTEGER | No | Marca del evento. |
| level | TEXT | No | INFO/WARN/ERROR (CHECK). |
| comp | TEXT | No | Componente fuente (autenticación, pipeline, etc.). |
| msg | TEXT | No | Mensaje (≤500). |
| user | TEXT | No | Nombre de usuario o 'sistema'. |

#### Tabla `chat`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | TEXT (UUID) | No | Identificador primario. |
| userId | TEXT | No | Dueño de la conversación. |
| role | TEXT | No | `user`/`ai`. |
| ts | INTEGER | No | Marca del mensaje. |
| q | TEXT | Sí | Pregunta (rol user) o pregunta asociada (rol ai). |
| type | TEXT | Sí | `answer`/`none` (respuestas IA). |
| intent | TEXT | Sí | Intención detectada. |
| conf | REAL | Sí | Confianza 0–1. |
| terms | TEXT (JSON) | Sí | Términos expandidos. |
| sources | TEXT (JSON) | Sí | Fuentes citadas. |
| html | TEXT | Sí | HTML de la respuesta. |
| docId | TEXT | Sí | Ámbito del documento (si aplica). |
| docName | TEXT | Sí | Nombre del documento del ámbito. |

### 3.4 Consideraciones sobre el "esquema vectorial"

El proyecto no persiste vectores en disco: el **espacio semántico (matriz U de LSA) y los vectores de documento** se almacenan en memoria y se recalculan al arrancar o tras cada procesamiento (`Embedder.train(docsProcesados)`). Esta decisión —documentada como `EMBED_DIMS`/`EMBED_MINDF` configurables— permite reentrenamiento barato sobre corpus pequeños y garantiza que la búsqueda semántica **siempre** refleje el estado actual del repositorio. El diseño de la capa `embeddings.js` expone una interfaz única (`train`, `score`, `queryVec`, `stats`) que podrá sustituirse por una base vectorial dedicada (es decir, SQLite-vec, FAISS o un servicio externo) sin cambiar los consumidores.

---

## 4. Diseño de APIs y servicios

### 4.1 Convenciones

- Formato de respuesta: `{ ok: true, data }` en éxito; `{ ok: false, error: { code, message } }` en fallo.
- Autenticación: cabecera `Authorization: Bearer <token>`.
- Codificación JSON; multipart (`file`) para carga; límite de cuerpo 2 MB (excepto multer para archivos).
- Códigos: 200/201 éxitos; 400 validación (`VAL`); 401 autenticación (`AUTH`); 403 permisos (`PERM`); 404 no encontrado; 413 archivo demasiado grande (`LIMIT_FILE_SIZE`); 500 interno.

### 4.2 Especificación de endpoints

#### Autenticación — `/api/auth`
| Método | Ruta | Auth | Entrada | Respuesta `data` |
|---|---|---|---|---|
| POST | `/register` | — | `{username, name, password}` | `{user, token}` (201) |
| POST | `/login` | — | `{username, password}` | `{user, token}` |
| POST | `/logout` | Sí | — | `{message}` |
| GET | `/me` | Sí | — | `{id, username, name, role, created}` |

#### Usuarios — `/api/users` (admin)
| Método | Ruta | Entrada | Respuesta `data` |
|---|---|---|---|
| GET | `/` | — | `[{id, username, name, role, created, docs}]` |
| PATCH | `/:id/role` | `{role}` | `{message}` |
| DELETE | `/:id` | — | `{message}` |
| POST | `/:id/reset` | `{password?}` | `{message}` |

#### Repositorios — `/api/repos`
| Método | Ruta | Entrada | Respuesta `data` |
|---|---|---|---|
| GET | `/` | — | `[{id, name, desc, ownerId, created}]` |
| POST | `/` | `{name, desc?}` | repo (201) |
| DELETE | `/:id` | — | `{message}` |

#### Documentos — `/api/docs`
| Método | Ruta | Entrada | Respuesta `data` |
|---|---|---|---|
| GET | `/` | `{q?, cat?, fmt?, repo?, sort?}` | `[doc]` (con fields IA serializados) |
| POST | `/` | multipart `file` + `repoId?` | doc (201) |
| GET | `/:id` | — | doc |
| POST | `/:id/process` | — | `{doc, steps, error?}` |
| POST | `/:id/reprocess` | — | `{doc, steps, error?}` |
| GET | `/:id/download` | — | binario con `Content-Disposition` |
| DELETE | `/:id` | — | `{message}` |

Ejemplo de documento serializado:
```json
{
  "id": "c7cd4e3f-…", "name": "FE-001.txt", "ext": "txt", "size": 676,
  "repoId": "general", "repoName": "General", "ownerId": "admin",
  "ownerName": "Administrador", "uploadedAt": 1726000000000,
  "status": "procesado", "pages": null, "wordCount": 98,
  "category": "Factura",
  "categoryProbs": [{ "cat": "Factura", "p": 0.97 }],
  "summary": ["El documento «Factura…» es una factura comercial…"],
  "entities": { "fechas": ["5 de enero de 2024"], "montos": ["COP $535,500"], "correos": [], "telefonos": [], "identificaciones": ["NIT 901.234.567-8"], "personas": [], "organizaciones": ["Servicios Contables Andes S.A.S."] },
  "analysisAt": 1726000200000, "error": null, "wordSnippet": null
}
```

#### Búsqueda y chat — `/api`
| Método | Ruta | Parámetros | Respuesta `data` |
|---|---|---|---|
| GET | `/search` | `{q, semantic?=1, docId?}` | `[{id, name, score, cos?, blend?, mode?, category?, ext?, snippets[]}]` |
| POST | `/ask` | `{q, docId?}` | `{type, intent, conf, terms, sources, html, docId?, docName?, llm?}` |
| GET | `/chat` | — | `[{id, role, ts, docId, docName, text|q, type, intent, conf, terms, sources, html}]` |
| DELETE | `/chat` | `{docId?}` | `{message}` |

#### Sistema — `/api`
| Método | Ruta | Auth | Respuesta `data` |
|---|---|---|---|
| GET | `/dashboard` | Sí | KPIs consolidados (sección 4.3) |
| GET | `/events` | Sí | `[{id, ts, level, comp, msg, user}]` (filtrado por rol) |
| DELETE | `/events` | admin | `{message}` |
| GET | `/backup` | Sí | `{app, version, exportedAt, users, repos, docs, events}` |
| POST | `/backup/restore` | admin | `{repos, docs}` |
| POST | `/seed/corpus` | admin | `{total, ok, dup, failed}` |
| GET | `/system/info` | pública | `{app, version, node, corpusDir, embeddings}` |

### 4.3 Contrato del dashboard (`GET /api/dashboard`)

```json
{
  "docs": 37, "processed": 37, "pendientes": 0, "procesando": 0, "errores": 0,
  "words": 5231, "entities": 412,
  "index": { "docs": 37, "fragments": 720, "vocab": 1180 },
  "categories": [ { "label": "Contrato", "value": 9, "color": "#8C5A2B" }, … ],
  "formats": [ { "ext": "PDF", "value": 13 }, … ],
  "totalByFmt": 37, "perCategory": { "Factura": 11, … },
  "activity": [ { "label": 4, "count": 12 }, … (14 días) ],
  "recent": [ { "id", "name", "category", "status", "uploadedAt", "ext" } ],
  "events": [ { "ts", "level", "comp", "msg", "user" } ]
}
```

---

## 5. Flujo de procesamiento documental e integración de IA

### 5.1 Pipeline de ingesta (processDocument)

El flujo real está implementado en `pipelineService.js` y consta de las siguientes etapas con identificadores expuestos a la UI (`PIPELINE_STEPS`):

1. **Extracción de contenido** (`extract`): según la extensión:
   - **PDF**: `pdfjs-dist` (legacy build) lee `data` como `Uint8Array`, recorre páginas con `getPage`/`getTextContent` y recompone el texto con saltos de línea; resuelve `standard_fonts` automáticamente.
   - **DOCX**: `mammoth.extractRawText({ path })` produce texto plano del ZIP OOXML.
   - **TXT**: lectura UTF-8 directa con `fs.readFileSync`.
   - Validación: si el texto significativo (sin espacios) es menor a 20 caracteres, el documento se marca `error` con la razón "posible documento escaneado".
2. **Tokenización y limpieza** (`token`): `tokenizar()` normaliza (NFD + minúsculas), filtra stopwords en español y aplica stemming ligero por sufijos (p. ej., `aciones`, `amiento`, `ciones`, `mente`, `idad`, …); `countWords` cuenta palabras.
3. **Clasificación automática** (`class`): Naive Bayes multinomial. Para cada token se acumula `log(((count(t,cat)+1)/(total_cat+V+1)))` (suavizado de Laplace) y se normalizan exponenciales para obtener probabilidades por categoría; la categoría de mayor p se asigna a `category`.
4. **Resumen analítico** (`sum`): `analyzeSummary()` compone oraciones descriptivas (tipo y título, objeto por plantilla según género documental, partes intervinientes deduplicadas, cifras únicas (con tolerancia de 1 %), fechas clave y hechos por tipo de documento) y completa con soporte extractivo de `summarize()` evitando duplicados por solapamiento de tokens ≥ 0.6.
5. **Extracción de entidades (NER)** (`ner`): `extractEntities()` con patrones regex por tipo (momentos, montos, correos, teléfonos con 7–11 dígitos, NIT/CC/CE, personas con tratamiento, organizaciones SAS/Ltda/SA y sustantivos de organización), máx. 12 por tipo.
6. **Indexado TF-IDF y RAG** (`index`): `Index.add(id, text)` descompone en fragmentos por oraciones (≥ 4 palabras) y actualiza frecuencias; `Embedder.train(...)` re-entrena el espacio LSA (véase 5.3).
7. **Persistencia**: se actualiza la fila con `status=procesado`, `text` (truncado), `pages`, `wordCount`, `category`, `categoryProbs`, `summary`, `entities`, `analysisAt`. Si alguna etapa falla, se persiste `status=error` + motivo y se registra `logEvent('ERROR', 'Pipeline', …)`.

### 5.2 Flujo de consulta RAG (ask)

1. El cliente envía `{q, docId?}`.
2. El motor carga los documentos mediante el loader (`DocService.allForChat()` para el alcance general; la fila específica si `docId`).
3. Si `docId` está presente y el documento no está procesado, se responde con aviso dirigido a procesarlo. Si sí está procesado, se ejecuta `scopedAnswer`: saludo/ayuda, resumen, intención con entidades del propio texto y fragmentos, o respuesta none.
4. Para el alcance general: se detecta intención (`detectIntent`): `count` → agregado global (total, procesados, pendientes, errores, chips por categoría, extra por categoría/formato); `pending` → listar documentos con menciones de pago; `cat` → catálogo con chips; `money`/`date`/`who` → agregación sobre **todos** los documentos procesados usando entidades almacenadas (gather); `what` → recuperación TF-IDF.
5. Recuperación: `Index.scoreQuery(q)` puntúa documentos (TF × IDF con log, normalizado por raíz de términos); se toman los 4 mejores; por cada uno, `bestSnippets(q,2)` elige los fragmentos más relevantes por conjunción de términos.
6. Composición: `askBody` selecciona hasta 3 fuentes con su primer fragmento, resalta términos (`highlight` con regex tolerante a acentos) y cita `[n]`.
7. Aumento opcional con LLM: si `AI_API_BASE`/`AI_API_KEY` existen, se llama a `POST {base}/chat/completions` con el contexto de fuentes y el prompt restrictivo; si la llamada falla, se conserva la respuesta extractiva (degradación controlada).
8. Persistencia del historial en `chat` y respuesta JSON con `intent`, `conf`, `sources` y `html`.

### 5.3 Embeddings locales (LSA)

`Embedder.train()`:
1. Toma los documentos procesados, los tokeniza y calcula `df` (frecuencia documental).
2. Selecciona términos con `df ≥ MIN_DF` (2) y un tope de 3 000; si hay menos de 6 términos o menos de 2 documentos, no entrena (sin espacio semántico).
3. Construye la matriz A (términos × documentos) con peso `(1 + ln tf)·ln(1+N/df)`.
4. Calcula **SVD truncado aleatorizado**: `Y = A·Ω`; dos iteraciones de potencia `Y = Aᵀ·(A·Y)`; factorización QR de Y; autovalores de la matriz simétrica reducida con el método de Jacobi cíclico; se obtiene U (m×k) con k = min(EMBED_DIMS, m, N−1) (por defecto 40, máx. 64).
5. Los vectores de documento son sumas de filas de U por término del documento, normalizados a norma unitaria.
6. `score(q)` vectoriza la consulta (suma de filas de U) y devuelve documentos con coseno > 0.05 ordenados descendentemente.

Esta implementación —sin dependencias externas de álgebra lineal— demuestra la viabilidad de embeddings pedagógicos en un proyecto empresarial de pregrado y es sustituible por librerías especializadas en producción.

---

## 6. Decisiones tecnológicas y justificación

| Decisión | Justificación técnica | Alternativas descartadas |
|---|---|---|
| **Node.js ≥ 22.5 + `node:sqlite`** | Módulo nativo de SQLite (DatabaseSync) sin librerías externas: instalación simple, cero binarios adicionales, transacciones y WAL. Ejecución verificada en Node v24.19.0. | SQLite3/better-sqlite3 (compilación nativa), MySQL/PostgreSQL (requieren servidor) |
| **Express 4.22** | Estándar de facto para APIs REST en Node; middleware chain y manejo de errores; *multer* integrado. | Fastify, Koa (menor ecosistema de middleware del alcance) |
| **Frontend vanilla ES Modules (SPA)** | Sin framework ni build step: lección de ingeniería pura, dominio del DOM/eventos, carga directa del navegador, revisión académica sencilla. | React/Vue/Svelte (agregan toolchain y limitan la comprensión del alumno) |
| **pdfjs-dist 4.10.38** | Parseo PDF en el servidor sin herramientas externas; exposición oficial de opciones de fuente; DevTools de texto. | OCR Tesseract (solo imagenes), pdftotext (binario externo) |
| **mammoth 1.12** | Extracción de texto DOCX (OOXML) vía ZIP nativo; salida rawText idónea para NLP. | docx/libreoffice conversion (peso mayor) |
| **Naive Bayes multinomial a medida** | Mediana exactitud con corpus pequeño, entrenamiento instantáneo, probabilidades auditables y pedagógicamente transparente. | Redes neuronales/transformers (requieren datos y cómputo) |
| **TF-IDF propio + LSA propia** | Recuperación determinista y explicable; embeddings sin servicios externos, respetando la confidencialidad (nada sale del equipo). | OpenAI embeddings (costo y privacidad), FAISS (externa) |
| **RAG extractivo con citas + LLM opcional** | Garantiza verificabilidad de toda respuesta y funciona sin claves; el LLM se ofrece como capa de síntesis prescindible. | Chat puramente generativo (riesgo de alucinación) |
| **SQLite en modo WAL** | Concurrencia lector/escritor adecuada a la escala; archivo único respaldable. | Servidor de BD dedicado (sobredimensionado) |
| **Git + scripts de prueba `node --test`** | Control de versiones local e integración continua conceptual con 0 dependencias de CI. | Jest/Vitest (dependencias extras) |

---

## 7. Diseño de seguridad y prototipos de interfaz

### 7.1 Mecanismos de seguridad

1. **Contraseñas**: `hashPassword(pass, salt) = scryptSync(pass, salt, 64)` en hex. Cada usuario tiene sal UUID. Nunca se devuelve el hash.
2. **Sesiones**: se genera un token aleatorio de 32 bytes (`newToken`), se almacena únicamente su **SHA-256** (`hashToken`), con `created` y `expires` (TTL por defecto 7 días configurable por `SESSION_TTL_DAYS`). Las sesiones vencidas se limpian en cada petición autenticada (`cleanSessions`).
3. **Autorización por rol**: `usersRoutes` y las rutas de limpieza/restauración/corpus usan `adminOnly`; el resto usa `authRequired`. La eliminación de documentos verifica propiedad (`admin` o `ownerId`).
4. **Protección XSS**: toda interpolación de datos de usuario en el frontend pasa por `esc()` y el backend escapa en `rag.js` (`esc`) y sanea nombres de descarga (`sanitizeFilename`).
5. **Variables de entorno**: `config.js` lee `dotenv`; las llaves de IA (`AI_API_KEY`) y rutas viven en `.env` (no versionado). `express.json({limit:'2mb'})` y límite multer 10 MB. `trust proxy` configurado para despliegues detrás de proxy.
6. **Bitácora de seguridad**: login/register/logout, carga, procesamiento con error y reseteos de contraseña quedan en `events` con usuario.

### 7.2 Prototipos conceptuales de las interfaces principales

**a) Vista de acceso (Login).** Formulario central centrado con campos usuario/contraseña; al autenticarse se muestra el panel.

**b) Dashboard (Panel).** Cabecera con botón "Actualizar"; fila de tarjetas KPI (Documentos, Procesados IA, Pendientes, Errores, Palabras indexadas, Entidades); dos tarjetas de barras ("Clasificación IA por categoría" con porcentajes; "Documentos por formato" con extensión); gráfico de actividad de 14 días; tablas "Documentos recientes" y "Última actividad".

**c) Visor de documento (Detalle).** Cabecera con estado (badge), acciones (Procesar con IA / Reprocesar / Descargar / Consultar en el chat / Eliminar); tarjetas de metadatos (Categoría IA, Palabras, Formato, Tamaño, Páginas, Repositorio, Procesado con IA); panel de "Resumen ejecutivo (IA)" con viñetas; panel de "Clasificación automática" con barras de probabilidad por categoría (0–100 %) y tabla de "Entidades extraídas".

**d) Chat de IA.** Selector de ámbito ("Todos los documentos" o documento específico), lucernario de ámbitos, chips de preguntas sugeridas según ámbito, lista de mensajes con metainformación (chips de intención y confianza), pie con campo de pregunta y botón Enviar, y botón "Limpiar conversación". Las respuestas muestran fragmentos citados `[n]` y un pie de fuentes con enlaces al detalle.

**e) Bitácora y Respaldo (admin).** Bitácora con filtro por nivel y limpieza; Respaldo con exportación del JSON y restauración.

---

## 8. Diagramas de la solución

Los siguientes diagramas fueron generados con la utilidad `src/tools/diagrams.py` (Pillow) y se almacenan en `Documentacion/02_Diseno/imagenes/`.

### 8.1 Arquitectura general

![Arquitectura general de la solución SIGAD](imagenes/arquitectura.png)

### 8.2 Casos de uso

![Diagrama de casos de uso de SIGAD](imagenes/casos_uso.png)

### 8.3 Componentes

![Diagrama de componentes del backend](imagenes/componentes.png)

### 8.4 Despliegue

![Diagrama de despliegue de SIGAD](imagenes/despliegue.png)

### 8.5 Secuencia — procesamiento documental (IA)

![Diagrama de secuencia del procesamiento de un documento](imagenes/secuencia_proceso.png)

### 8.6 Secuencia — consulta en lenguaje natural (RAG)

![Diagrama de secuencia de la consulta RAG](imagenes/secuencia_rag.png)

### 8.7 Modelo Entidad-Relación

![Modelo entidad-relación de SIGAD](imagenes/mer.png)

### 8.8 Flujo de procesamiento documental

![Flujo de procesamiento documental](imagenes/flujo.png)

### 8.9 Secuencia RAG — representación textual

```
Usuario   SPA (chat.js)      API /api/ask        rag.ask           NLP
  │  pregunta │                  │                 │                 │
  │──────────▶│ POST {q,docId}   │                 │                 │
  │           │─────────────────▶│  ask(q,opts)    │                 │
  │           │                  │───────────────▶ │  detectIntent   │
  │           │                  │                 │───► tokenizer   │
  │           │                  │                 │  (expand)       │
  │           │                  │                 │                 │
  │           │                  │                 │  count/money/…  │
  │           │                  │                 │  ▸ gather(ent)  │
  │           │                  │                 │  scoreQuery     │
  │           │                  │                 │  bestSnippets   │
  │           │                  │                 │  compose cita[n]│
  │           │                  │                 │  ChatService.push│
  │           │  data {intent,   │                 │                 │
  │           │  conf, sources,  │◀────────────────│                 │
  │           │  html}           │                 │                 │
  │◀──────────│──────────────────│                 │                 │
```

---

## 9. Referencias

1. Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.
2. Bass, L., Clements, P., Kazman, R. (2021). *Software Architecture in Practice*. Addison-Wesley.
3. Express.js — Documentación oficial (rutas, middleware, plantillas) (2026).
4. Node.js — Documentación oficial `node:sqlite` (DatabaseSync) (2026).
5. pdf.js / pdfjs-dist — Documentación oficial (2026); mammoth — Documentación oficial (2026).
6. Lewis et al. (2020). *Retrieval-Augmented Generation…* NeurIPS.
7. Eckart, C., Mosier, R. (2016). *Truncated SVD and dimensionality reduction*. (Fundamentos de LSA).

---

*Fin del Documento de Diseño — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*