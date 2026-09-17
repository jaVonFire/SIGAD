# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Documento de Desarrollo Técnico (Implementación del Código)

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Documento de Desarrollo Técnico |
| **Fecha** | Septiembre de 2026 |
| **Repositorio del código** | `src/` (raíz del software) · `Documentacion/` (evidencias) |

---

## Tabla de contenido

1. Configuración del entorno y dependencias
2. Estructura del proyecto
3. Secuencia de arranque del servidor
4. Capa de datos (persistencia relacional)
5. Capa de transporte: rutas y middleware
6. Autenticación y sesiones
7. Servicios de aplicación
8. Motor de IA y PLN (módulos)
9. Aplicación web de una sola página (SPA)
10. Pruebas automatizadas
11. Verificación de ejecución de la iteración de mejora RAG
12. Soporte de la solución (semillas y corpus)
13. Referencias

---

## 1. Configuración del entorno y dependencias

### 1.1 Manifiesto del paquete (`src/package.json`)

El proyecto es un paquete Node.js de tipo **ES Module** (`"type": "module"`). Define los siguientes comandos:

```json
"scripts": {
  "start":  "node server/index.js",
  "dev":    "node server/index.js",
  "seed":   "node server/seed.js",
  "corpus": "node server/seed.js --corpus-only",
  "test":   "node --test \"server/test/*.test.mjs\""
}
```

- `npm.cmd start` → inicia el servidor en `http://localhost:3000`.
- `npm.cmd run seed` → crea usuarios/repositorio por defecto y procesa el corpus de la carpeta `Documentacion/10_Documentos_Prueba`.
- `npm.cmd run corpus` → solo importa el corpus (sin forzar la creación de usuarios).
- `npm.cmd test` → ejecuta la batería de pruebas automatizadas con el *runner* nativo `node --test`.

**Dependencias de producción** (verificadas en `package-lock.json` y por ejecución):

| Dependencia | Versión instalada | Propósito |
|---|---|---|
| `express` | 4.22.2 | Framework HTTP: rutas, middleware, estáticos y errores. |
| `pdfjs-dist` | 4.10.38 | Extracción de texto desde PDF (build legacy). |
| `mammoth` | 1.12.2 | Extracción de texto desde DOCX (OOXML). |
| `multer` | 1.4.5-lts.2 | Carga (multipart) de archivos al servidor. |
| `dotenv` | 16.6.1 | Lectura de variables de entorno desde `.env`. |

**Motor de ejecución:** Node.js **≥ 22.5.0** (declarado en `engines`), requerido por el módulo nativo `node:sqlite` (DatabaseSync). La solución se ejecutó y verificó con **Node v24.19.0** y **Git 2.53.0.windows.2**.

### 1.2 Variables de entorno (`src/.env.example` → `src/.env`)

La configuración se centraliza en `src/server/src/config.js`, que resuelve rutas desde la raíz del proyecto (`src/`):

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP del servidor. |
| `DB_PATH` | `data/sigad.sqlite` | Ruta del archivo SQLite (relativa al proyecto). |
| `UPLOADS_DIR` | `uploads` | Directorio físico de los documentos. |
| `SESSION_TTL_DAYS` | `7` | Duración de las sesiones (días). |
| `MAX_UPLOAD_MB` | `10` | Tamaño máximo de archivo cargado. |
| `MAX_TEXT_CHARS` | `300000` | Truncado del texto indexado por documento. |
| `AI_API_BASE` | (vacío) | URL base de un LLM compatible con `/chat/completions`. |
| `AI_API_KEY` | (vacío) | Llave del LLM opcional. |
| `AI_MODEL` | (vacío) | Modelo del LLM opcional. |
| `EMBED_DIMS` | `40` | Dimensionalidad del espacio LSA (máx. 64). |
| `EMBED_MINDF` | `2` | Frecuencia documental mínima de un término para entrar al vocabulario LSA. |

La integración LLM es **opcional y degradable**: si no existen `AI_API_BASE`/`AI_API_KEY`, el sistema responde con **RAG 100 % extractivo y local** (nada se inventa); si existen, se añade una capa de síntesis que cita las mismas fuentes.

### 1.3 Requisitos de instalación

```
cd src
npm install      # instala express, pdfjs-dist, mammoth, multer, dotenv
npm run seed     # asegura usuario admin y repo "general", e importa el corpus
npm.cmd start    # http://localhost:3000
```

---

## 2. Estructura del proyecto

```
src/
├── package.json / package-lock.json / .env / .env.example
├── data/                         # base SQLite (sigad.sqlite, modo WAL)
├── uploads/                      # documentos cargados (uuid_nombre)
├── public/                       # frontend SPA (estático)
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── main.js  router.js  api.js  ui.js
│       └── views/  login.js  dashboard.js  docs.js  detail.js
│                    chat.js  repos.js  log.js  users.js  backup.js
├── tools/
│   └── diagrams.py               # genera diagramas Mermaid del diseño
└── server/
    ├── index.js                  # bootstrap Express
    ├── seed.js                   # importador de corpus / semillas
    └── src/
        ├── config.js             # variables de entorno
        ├── db.js                 # DatabaseSync + migraciones + helpers
        ├── middleware.js         # scrypt, tokens, multer, bitácora, ApiError
        ├── routes/               # auth · users · repos · docs · ask · system
        ├── services/             # authUser · user · repo · doc · chat
        │                         # dashboard · backup · seed · pipeline
        ├── nlp/                  # tokenizer · classifier · summarizer
        │                         # analyst · entities · tfidf · embeddings · rag
        └── test/                 # rag.test.mjs · analyst.test.mjs
                                  # router.test.mjs · smoke.mjs
```

---

## 3. Secuencia de arranque del servidor

`src/server/index.js` define el ciclo de vida del proceso:

1. `ensureDefaults()` (seedService): crea actor `admin/sigad2024` y `analista/analista2024` si no existen, y el repositorio `general`.
2. `Index.rebuild(processedDocs)`: reconstruye el índice TF-IDF en memoria desde la tabla `docs` (solo `status='procesado'`).
3. `Embedder.train(processedDocs)`: reentrena el espacio LSA (protegido con `try/catch` — un fallo semántico no impide arrancar).
4. `setDocsLoader(async () => DocService.allForChat())`: inyecta al motor RAG la fuente de documentos para consultas generales.
5. Montaje de routers con prefijos de dominio:
   - `/api/auth`, `/api/users`, `/api/repos`, `/api/docs` → routers dedicados.
   - `/api` → router de preguntas (`ask`) y de sistema (`system`).
6. **404 de API** (antes que estáticos): toda ruta `/api` no registrada responde `{ ok:false, error:{code:'NOTFOUND'} }`.
7. **Estáticos**: `express.static(PUBLIC_DIR)` y *fallback* de SPA (`sendFile(index.html)`) para las demás rutas.
8. **Error handler central**: los `ApiError` mapean su `status`/`code`; el error de multer `LIMIT_FILE_SIZE` → 413; cualquier `500` oculta detalles en producción (los registra `console.error`) y los expone solo cuando `NODE_ENV=test`.

```js
app.listen(config.port, () => {
  console.log(`[SIGAD] Servidor listo en http://localhost:${config.port}`);
  console.log(`[SIGAD] Base de datos: ${config.dbPath}`);
  console.log(`[SIGAD] Uploads: ${config.uploadsDir}`);
});
```

Los modos WAL (`PRAGMA journal_mode = WAL`) y claves foráneas (`PRAGMA foreign_keys = ON`) se activan en `db.js` en la apertura.

---

## 4. Capa de datos (persistencia relacional)

### 4.1 Motor `node:sqlite` (DatabaseSync)

`src/server/src/db.js` abre la base con el módulo nativo (sin binarios externos ni dependencias de compilación), crea el directorio `data/` si no existe y ejecuta las migraciones:

```js
import { DatabaseSync } from 'node:sqlite';
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
```

### 4.2 Migraciones y evolución de esquema

El bloque `MIGRATIONS` crea las seis tablas documentadas en el Bloque 2 (`users`, `repos`, `docs`, `sessions`, `events`, `chat`) con `CREATE TABLE IF NOT EXISTS` e índices sobre `repoId`, `status`, `ownerId`, `ts` y `userId`. Además, se aplican **migraciones incrementales** a bases existentes:

```js
const cols = db.prepare("PRAGMA table_info('chat')").all().map(c => c.name);
if (!cols.includes('docId'))  { try { db.exec('ALTER TABLE chat ADD COLUMN docId TEXT'); } catch (e) { } }
if (!cols.includes('docName')){ try { db.exec('ALTER TABLE chat ADD COLUMN docName TEXT'); } catch (e) { } }
```

Esta estrategia permitió añadir el soporte de **consultas acotadas a un documento** (campos `docId`/`docName` en `chat`) sin recrear la base ni perder datos.

### 4.3 Helpers de la capa de datos

- `now()` → `Date.now()` (marcas temporales integrales).
- `uid()` → `crypto.randomUUID()` (identificadores textuales).
- `parseJson(s, fallback)` → **desanida JSON anidado**: este helper fue clave para la iteración RAG, porque los datos legados quedaron *triplemente codificados* (JSON dentro de JSON dentro de JSON). El bucle intenta `JSON.parse` hasta 8 veces o hasta que el valor deje de ser cadena:

```js
export const parseJson = (s, fallback = null) => {
  if (!s) return fallback;
  let cur = s, parsed = false;
  for (let i = 0; i < 8 && typeof cur === 'string'; i++){
    try { cur = JSON.parse(cur); parsed = true; } catch { break; }
  }
  return parsed ? cur : fallback;
};
```

### 4.4 Serialización de campos IA

Las columnas `categoryProbs`, `summary`, `entities`, `terms` y `sources` almacenan JSON en texto. El servicio de documentos utiliza `JSON.parse` en la "publicización" de respuestas y un **round-trip protector**: si un campo viene como objeto, se serializa a texto antes de guardar; si plantilla ya es una cadena, se usa tal cual. Gracias a `parseJson`, el frontend y el motor nunca dependen del nivel exacto de codificación.

---

## 5. Capa de transporte: rutas y middleware

### 5.1 Errores de negocio (`middleware.js`)

```js
export class ApiError extends Error {
  constructor(code, message, status = 400){
    super(message); this.code = code; this.status = status;
  }
}
export const fail = (code, message, status) => { throw new ApiError(code, message, status); };
```

Cada controlador valida con `fail('VAL', '…', 400)`, `fail('AUTH', '…', 401)`, etc. El manejador central traduce estos errores a la respuesta JSON uniforme.

### 5.2 Envoltorio asíncrono

```js
export const asyncWrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

Permite escribir controladores `async` sin bloques `try/catch`, delegando los rechazos al error handler.

### 5.3 Multer (carga de archivos)

```js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadsDir),
  filename: (req, file, cb) => cb(null, uid() + '_' + path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_'))
});
export const upload = multer({ storage, limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 } });
```

El nombre físico combina un UUID con un nombre saneado, garantizando unicidad y eliminando caracteres de control del nombre original. El error `LIMIT_FILE_SIZE` se traduce a HTTP 413 en el error handler.

### 5.4 Bitácora de eventos

```js
export function logEvent(level, comp, msg, user = 'sistema'){
  db.prepare('INSERT INTO events (id, ts, level, comp, msg, user) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uid(), now(), level, comp, String(msg).slice(0, 500), user);
}
```

Los niveles se restringen por `CHECK (level IN ('INFO','WARN','ERROR'))`. Se registran inicios de sesión, cierres, registros, cargas, procesamientos (éxito o fallo) y reseteos de contraseña.

### 5.5 Contratos de las rutas implementadas

| Router | Método/Ruta | Autenticación | Comportamiento |
|---|---|---|---|
| `auth.routes.js` | `POST /api/auth/register` | pública | Alta de usuario + sesión. |
| | `POST /api/auth/login` | pública | Valida scrypt + crea sesión. |
| | `POST /api/auth/logout` | `authRequired` | Invalida sesión. |
| | `GET  /api/auth/me` | `authRequired` | Devuelve el usuario actual. |
| `users.routes.js` | `GET /api/users` | admin | Lista usuarios con conteo de documentos. |
| | `PATCH /api/users/:id/role` | admin | Cambia rol (`admin`/`analista`). |
| | `DELETE /api/users/:id` | admin | Elimina cuenta (protege `admin`). |
| | `POST /api/users/:id/reset` | admin | Regenera contraseña. |
| `repos.routes.js` | `GET/POST /api/repos` | `authRequired` | Lista / crea repositorios. |
| | `DELETE /api/repos/:id` | `authRequired` | Elimina repositorio (no `general`). |
| `docs.routes.js` | `GET/POST /api/docs` | `authRequired` | Lista documentos / carga con multer. |
| | `GET /api/docs/:id` | `authRequired` | Detalle con campos IA. |
| | `POST /api/docs/:id/process` y `/reprocess` | `authRequired` | Ejecuta el pipeline. |
| | `GET /api/docs/:id/download` | `authRequired` | Descarga binaria. |
| | `DELETE /api/docs/:id` | propietario/admin | Elimina registro y archivo. |
| `ask.routes.js` | `GET /api/search` | — | Búsqueda TF-IDF (+semántica). |
| | `POST /api/ask` | — | Pregunta RAG al repositorio. |
| | `GET/DELETE /api/chat` | `authRequired` | Historial / limpieza por usuario. |
| `system.routes.js` | `GET /api/dashboard` | `authRequired` | KPIs agregados. |
| | `GET /api/events`, `DELETE /api/events` | `authRequired`/admin | Bitácora. |
| | `GET /api/backup`, `POST /api/backup/restore` | `authRequired`/admin | Respaldo. |
| | `POST /api/seed/corpus` | admin | Importa el corpus. |
| | `GET /api/system/info` | pública | Versión, Node y estado del índice. |

---

## 6. Autenticación y sesiones

### 6.1 Hashing de contraseñas (scrypt)

```js
export function hashPassword(password, salt){
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}
```

Cada usuario tiene una sal UUID única almacenada en `users.salt`; el hash es de 64 bytes (hex). Ninguna API devuelve `salt` ni `hash`.

### 6.2 Tokens opacos con digest

```js
export const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex');
```

Se genera un token de 32 bytes alfanuméricos y en `sessions` solo se persiste su **SHA-256** (`tokenHash`): una filtración de la base no permite reutilizar sesiones.

### 6.3 Middleware de autenticación

```js
export function authRequired(req, res, next){
  cleanSessions();                              // purga vencidas
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null;
  if (!token) return next(new ApiError('AUTH', 'Autenticación requerida.', 401));
  const row = db.prepare(`SELECT s.userId, u.username, u.name, u.role, u.id
                          FROM sessions s JOIN users u ON u.id = s.userId
                          WHERE s.tokenHash = ?`).get(hashToken(token));
  if (!row) return next(new ApiError('AUTH', 'Sesión no válida o expirada.', 401));
  req.user = { id: row.id, username: row.username, name: row.name, role: row.role };
  req.token = token;
  next();
}
```

`adminOnly` complementa la autorización: las operaciones de administración (gestión de usuarios, restauración, importación masiva) exigen `role === 'admin'`.

### 6.4 Flujo de login (AuthService.)

1. `db.prepare('SELECT * FROM users WHERE username = ?').get(username)`.
2. Compara `hashPassword(input, user.salt)` contra `user.hash` (comparación constante en longitud para mitigar *timing attacks* en el campo de sesión).
3. Crea sesión (`tokenHash`, `created`, `expires = now + ttl*86400000`).
4. Registra en bitácora el inicio de sesión y devuelve `{ user, token }`.
5. En fallo, `logEvent('WARN', 'Autenticación', …)` con intentos inválidos y respuesta genérica.

---

## 7. Servicios de aplicación

Cada servicio encapsula las consultas SQL y las reglas de negocio de su dominio. Los principales:

### 7.1 `AuthService` (`authService.js`)
Encargado de registro, login, logout, `me` y gestión de sesiones (`hashToken`, expiración, `cleanSessions`). Valida campos: usuario sin espacios, nombre y contraseña ≥ 6 caracteres.

### 7.2 `UserService` (`userService.js`)
- `list()`: usuarios con `LEFT JOIN` para contar documentos cargados por cada uno.
- `setRole(id, role)`: reasigna rol (protege el último administrador).
- `remove(id)`: eliminación que protege cuentas con sesiones activas críticas y asigna documentos huérfanos al repo `general`.
- `resetPassword(id, password?)`: regenera hash, elimina sesiones vigentes del usuario y registra el evento.

### 7.3 `RepoService` (`repoService.js`)
CRUD de repositorios. Protege el repo `general` (no puede eliminarse). Al eliminar, reasigna sus documentos al repo `general`.

### 7.4 `DocService` (`docService.js`) — núcleo documental
- Validación de carga: extensión en `{pdf, docx, txt}`, inserción de registro en `pendiente`, persistencia del archivo.
- `getFull(id)`: fila completa (incluye texto crudo).
- `get(id)` / `list(filters)`: versión "pública" (campos IA deserializados con `JSON.parse` defensivo).
- Filtros de listado: `q` (nombre), `cat` (categoría), `fmt` (formato), `repo`, `sort` (`recent`/`name`/`oldest`), paginación.
- `processedForIndex()`: documentos `status='procesado'` con `id`, `name`, `text` (para reconstrucción del índice y LSA).
- `allForChat()`: entregada al motor RAG — incluye `id`, `name`, `category`, `status`, `ext`, `wordCount`, `entities` **en su serialización original**, de modo que `rag.js` puede aplicar `parseJson` sobre las entidades reales de la base.
- Eliminación con permiso: `req.user.role === 'admin' || ownerId === req.user.id`.
- `sanitizeFilename()` y `formatBytes()` para nombres y tamaños.

### 7.5 `ChatService` (`chatService.js`)
- `push(userId, role, m)`: inserta en `chat` (con `type`, `intent`, `conf`, `terms`, `sources`, `html`, `docId`, `docName`).
- `limit(userId)`: recorta el historial a los 200 registros más recientes.
- `byUser(userId, docId?)`: obtiene el historial plano (rol `user` → `text`; rol `ai` → `html` y metadatos de intención).
- `clear(userId, docId?)`: borra la conversación completa o la del ámbito elegido.

### 7.6 `DashboardService` (`dashboardService.js`)
Componen el `GET /api/dashboard` documentado en el Bloque 2: totales por estado, suma de palabras, total de entidades, estado del índice TF-IDF (`Index.stats()`), distribución por categoría/formato, actividad de los últimos 14 días y eventos recientes.

### 7.7 `BackupService` (`backupService.js`)
- `backup()`: extrae `users` (sin hashes/sales), `repos`, `docs` y `events` en un objeto serializable con `app`, `version` y `exportedAt`.
- `restore(payload)`: valida la forma, reinicia secuencias e inserta repositorios y documentos (no restaura credenciales para no sobreescribir cuentas).

### 7.8 `SeedService` (`seedService.js`)
- `ensureDefaults()`: usuarios por defecto (`admin/sigad2024`, `analista/analista2024` — documentados para la evaluación) y repositorio `general`.
- Importación del corpus: recorre `Documentacion/10_Documentos_Prueba`, detecta duplicados por nombre y carga los archivos; las cuentas generadas son los hashes scrypt correspondientes.

### 7.9 `PipelineService` (`pipelineService.js`) — el proceso IA
Ver sección 8.1 para el detalle por etapas.

---

## 8. Motor de IA y PLN (módulos)

Todo el procesamiento lingüístico vive en `src/server/src/nlp/`, 100 % local y en español, con foco en vocabulario empresarial colombiano.

### 8.1 Pipeline de ingesta (`processDocument`)

`pipelineService.processDocument(docId, actor)` ejecuta las etapas registradas como `PIPELINE_STEPS`:

```js
export const PIPELINE_STEPS = [
  { k: 'extract', t: 'Extracción de contenido',   d: 'pdf.js (PDF) · mammoth (DOCX) · fs (TXT)' },
  { k: 'token',   t: 'Tokenización y limpieza',   d: 'Normalización, stopwords ES, stemming ligero' },
  { k: 'class',   t: 'Clasificación automática',  d: 'Naive Bayes multinomial · corpus interno · Laplace' },
  { k: 'sum',     t: 'Resumen extractivo',        d: 'Puntuación de oraciones por frecuencia (TF)' },
  { k: 'ner',     t: 'Extracción de entidades',   d: '7 tipos: fechas, montos, correos, teléfonos, IDs, personas, organizaciones' },
  { k: 'index',   t: 'Indexado TF-IDF + RAG',     d: 'Índice invertido para búsqueda y consulta' }
];
```

**Extracción:**
- PDF: carga diferida (`getPdfjs`) de `pdfjs-dist/legacy/build/pdf.mjs`, lectura de `data` como `Uint8Array`, resolución automática de `standardFontDataUrl` (busca `standard_fonts` dentro del paquete) y recomposición del texto por páginas usando `it.str` + `it.hasEOL`.
- DOCX: `mammoth.extractRawText({ path })`.
- TXT: `fs.readFileSync(filePath, 'utf8')`.
- **Guardia de calidad**: si el texto sin espacios tiene menos de 20 caracteres, el documento pasa a `status='error'` con la razón *"posible documento escaneado"* (requeriría OCR).

**Secuencia de etapas:** se marca `procesando`, se extrae, se cuentan palabras (`countWords`), se tokeniza, se clasifica, se genera resumen analítico (`analyzeSummary`), se extraen entidades (`extractEntities`), se trunca el texto a `MAX_TEXT_CHARS`, y se persiste el estado `procesado` con todos los campos IA. Después se actualiza el índice TF-IDF (`Index.add`) y se reentrena el LSA `Embedder.train(...)` en un `try/catch` no bloqueante. Cualquier fallo de etapa deja el documento en `status='error'` con su motivo (≤ 400 caracteres) y registra `logEvent('ERROR', 'Pipeline', …)`.

```js
try {
  step.extract = await extractText(rec.filePath, rec.ext);
  ...
  const updated = docService.update(docId, { status: 'procesado', text: finalText,
    pages: step.extract.pages || null, wordCount: raw, category: step.class[0].cat,
    categoryProbs: step.class, summary: step.sum, entities: step.ner, analysisAt: Date.now() });
  Index.add(docId, finalText);
  try { Embedder.train(docService.processedForIndex()); } catch (e) { }
  logEvent('INFO', 'Pipeline', `Documento "${rec.name}" procesado — ...`);
  return { doc: publicize(updated), steps: step };
} catch (err){
  docService.update(docId, { status: 'error', error: String(err.message).slice(0, 400) });
  ...
}
```

### 8.2 Tokenización en español (`tokenizer.js`)

- `tokenizar(text)`: minúsculas, **desacentuación por NFD** (quita marca `\u0300-\u036f`), extrae tokens `[a-z0-9]{2,}` y filtra una lista de ~110 stopwords del español.
- `stemEs(w)`: **stemming ligero por sufijos** (`aciones`, `amiento`, `cion`, `mente`, `idad`, `ista`, `encia`, …) con condición de longitud mínima (base ≥ 4), más el recorte de las flexiones `es`/`s`.

```js
export function tokenizar(text){
  const raw = String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (raw.match(/[a-z0-9]{2,}/g) || []).filter(w => !STOPWORDS.has(w)).map(stemEs);
}
```

- `sentences(text)`: separa oraciones por párrafos y puntuación.
- `countWords(text)`: conteo bruto de palabras.
- `expand(q)`: **expansión léxica por grupos de sinónimos de dominio** (pago/factura/valor/saldo; contrato/cláusula/acuerdo; plazo/vence/fecha; empleado/nómina/salario; informe/análisis/resultado; servicio/honorario; arrendamiento/canon; reunión/acta; seguridad/política). Devuelve pares `{t, w}` donde los sinónimos reciben peso 0.7 y los tokens literales peso 1. Esto hace que "¿cuánto se adeuda?" encuentre "saldo"/"pendiente" aunque el documento no repita las palabras exactas de la pregunta.

### 8.3 Clasificador Naive Bayes multinomial (`classifier.js`)

Categorías: `['Contrato','Factura','Correspondencia','Informe']` (constante `CATEGORIES`). El modelo se entrena (perezosamente, `train()`) con un corpus interno de 10 frases por categoría que introduce el vocabulario formal colombiano (NIT, IVA, cláusulas, memorandos, informes ejecutivos). La clasificación aplica **suavizado de Laplace** y **escala logarítmica**:

```js
export function classify(text){
  if (!model) train();
  const toks = tokenizar(text);
  const entries = Object.entries(model.cats).map(([cat, m]) => {
    let s = 0;
    for (const t of toks) s += Math.log(((m.counts.get(t) || 0) + 1) / (m.total + model.V + 1));
    return { cat, log: s };
  });
  const mx = Math.max(...entries.map(e => e.log));
  const ex = entries.map(e => ({ cat: e.cat, p: Math.exp(e.log - mx) }));
  const sum = ex.reduce((a, b) => a + b.p, 0);
  return ex.map(e => ({ cat: e.cat, p: e.p / sum })).sort((a, b) => b.p - a.p);
}
```

Devuelve un arreglo ordenado `[{cat, p}]` normalizado (suma 1), que se guarda en `categoryProbs` y se muestra como barras de probabilidad en el detalle del documento.

### 8.4 Resumen extractivo (`summarizer.js`)

`summarize(text, max=8)` puntúa oraciones por:
- Frecuencia TF normalizada de sus términos.
- Penalización ×0.55 si superan 45 palabras; premio ×1.3 a la primera oración; **premio ×1.6 a oraciones "concretas"** (regex `CONCRETO`: montos `$`, `COP`, `USD`, `EUR`, fechas con `/`, `NIT`, `CC`, `@`, números asociados a contexto).

Luego toma `n = min(max, max(5, round(25%)))` oraciones ordenadas por puntaje (reordenadas por posición original) y las **deduplica por solapamiento de tokens ≥ 0.6** para evitar oraciones casi idénticas. El resumen resultante es *textual del documento* (verificable).

### 8.5 Resumen analítico (`analyst.js`)

`analyzeSummary(text, {name, category})` **redacta un análisis y no solo copia fragmentos**, con base exclusiva en lo detectado:

1. **Tipo y título**: `El documento «{título}» es {KIND_PHRASE[kind]}` (+"y fue firmado en …" si se captura `firmad\w* en`).
   - `documentKind()` decide el género por conteo de patrones (`factura`/`informe`/`contrato`/`correspondencia`) con fallback a la categoría del clasificador.
2. **Tema u objeto**: según el género (`objeto:`, `resumen ejecutivo:`, `concepto/detalle:`).
3. **Intervienen**: organizaciones + personas deduplicadas por contención, hasta 4.
4. **Cifras relevantes**: montos con **deduplicación por tolerancia 1 %** (`moMath.abs(toNum(x) - n) < n*0.01`).
5. **Fechas clave**: hasta 5.
6. **Hechos por tipo de documento**: factura → total a pagar y forma de pago; contrato → plazo, garantía, terminación; informe → recomendaciones y conclusión.
7. **Soporte extractivo** hasta 7 oraciones: descarta encabezados (`HEADER_RX`) y líneas de fecha, evita duplicados semánticos y aplica `cap()`/`punct()` para capitalizar y puntuar.

### 8.6 Extracción de entidades (NER, `entities.js`)

`extractEntities(text)` produce 7 categorías mediante patrones:

| Tipo | Patrón representativo |
|---|---|
| Fechas | `\d{1,2} de (mes) de \d{4}`; `\d{1,2}/\d{1,2}/\d{2,4}`; `YYYY-MM-DD` |
| Montos | `COP|USD|EUR \$?\d{1,3}([.,]\d{3})*...`; `$\d{1,3}(\.\d{3})+(,\d{2})?`; `\d{1,3}([.,]\d{3})* (pesos|dólares)` |
| Correos | patrón RFC simple |
| Teléfonos | 7–11 dígitos (con/sin prefijo `+` y separadores) |
| Identificaciones | `NIT/CC/CE` con dígitos y separadores |
| Personas | tratamiento (`Sr|Sra|Dr|Dra|Don|Doña|Ing|Abg`) + nombres capitalizados |
| Organizaciones | razón social (`S.A.S|Ltda|S.L|& Cía`) + diccionario institucional (`Fundación`, `Empresa`, `Banco`, `TecnoSuministros`, …) |

`toNum(v)` normaliza un monto textual a número: si hay coma decimal, quita puntos y usa coma como decimal; si son miles separados por puntos (`1.234.567`), los elimina. Hasta 12 valores por tipo (límite `push`).

### 8.7 Índice TF-IDF (`tfidf.js`)

Estructuras en memoria: `docsTf` (id → `Map(término → tf)`), `df` (término → nº de documentos), `docsSents` (id → fragmentos-oración con su `Set` de términos). API:

- `Index.add(id, text)` → actualiza; `Index.remove(id)` → decrementa `df` y elimina.
- `Index.rebuild(docs)` → reconstrucción completa al arranque.
- `Index.scoreQuery(q)` → para cada documento: `Σ w·(1+ln tf)·ln(1+N/df)` normalizado por `√(tf_size+1)`. El uso de `expand(q)` da peso 1 a términos literales y 0.7 a sinónimos.
- `Index.bestSnippets(id, q, n)` → elige los fragmentos con más términos de la consulta (solo `sc > 0`).

### 8.8 Embeddings locales — LSA (`embeddings.js`)

Implementación pedagógica del **Análisis Semántico Latente** sin dependencias de álgebra lineal:

1. **Selección de términos**: `df ≥ MIN_DF` (2) y top 3 000; si hay < 6 términos o < 2 documentos, no entrena.
2. **Matriz A** (términos × documentos) con peso `(1+ln tf)·ln(1+N/df)`.
3. **SVD truncado aleatorizado** (`svdTrunc`): `Y = A·Ω` (Ω gaussiana), 2 iteraciones de potencia `Y = Aᵀ(A·Y)`, factorización **QR** de Y (Gram-Schmidt), y **autovalores de Jacobi cíclico** sobre el núcleo simétrico k×k para obtener U (m×k), con `k = min(EMBED_DIMS, m, n-1)`.
4. **Vectores de documento**: suma de filas de U de sus términos, normalizados a norma unitaria (`normalize`).
5. `Embedder.score(q, top)` → vector de consulta (`queryVec`) y similitud coseno con los documentos (umbral 0.05), ordenado descendente.
6. `Embedder.stats()` expone `dims`, `vocabulario`, `docs`, `minimoDf` (consumido por `GET /api/system/info` y el dashboard).

Todo ocurre **localmente** (confidencialidad total); la interfaz permite sustituir la implementación por una base vectorial externa sin cambiar consumidores.

### 8.9 Motor RAG (`rag.js`) — consulta en lenguaje natural

Es la **fachada** del asistente. El flujo completo está descrito en el Bloque 2 (sección 5.2). Los detalles de implementación relevantes:

**Detección de intención (orden de precedencia):**

```js
function detectIntent(q){
  const l = norm(q);
  const cuentaCosas = /\bcu[aá]nt(os|as)\b/.test(l) || /\bcantidad de\b/.test(l) || /\bhay\s+en\s+total\b/.test(l);
  const cosasContables = /\b(documentos?|archivos?|facturas?|contratos?|informes?|correspondencias?|repositorios?|pdfs?|docx?|txts?|soportes?)\b/.test(l);
  if (cuentaCosas && cosasContables) return 'count';
  if (/\b(pendientes?\s+de\s+pago|pago\s+pendiente|por\s+pagar|sin\s+pagar)\b/.test(l) &&
      !/(suma|asciende|cu[aá]nto\s+(es|suma|asciende))/.test(l)) return 'pending';
  if (/\b(qu[eé]\s+(dice|habla|menciona|contiene|incluye)|hablan)\b/.test(l)) return 'what';
  const discurso = /\b(sobre|acerca de|relacionad|referente)\b/.test(l);
  const cantidadKw = /(cu[aá]nto|suma|total|valor|monto|saldo|precio|pagar|pago)/.test(l);
  if (discurso && !cantidadKw) return 'what';
  if (/(cuanto|valor|monto|precio|costo|suma|pagar|pago|recaudo|saldo)/.test(l)) return 'money';
  if (/(cuando|fecha|plazo|vence|vencimiento|vigencia|hasta)/.test(l)) return 'date';
  if (/(quien|quienes|responsable|empresa|persona|emisor|remitente|parte|contratante)/.test(l)) return 'who';
  if (/cu[aá]les\s+(documentos|son)|documentos?\s+(hay|existen|son|en\s+total|tiene)|(lista|enumera)\b/.test(l) && !discurso) return 'cat';
  return 'what';
}
```

**Lectura robusta de entidades almacenadas** — el cambio central de la iteración de mejora:

```js
function entFromDoc(d){
  return d && d.entities ? parseJson(d.entities) : null;
}
function gather(key, docs, cat){
  const pool = cat
    ? docs.filter(d => d.status === 'procesado' && d.category === cat)
    : docs.filter(d => d.status === 'procesado');
  const out = [];
  pool.forEach(d => {
    const e = entFromDoc(d);
    const vals = (e && e[key]) ? e[key].slice(0, 8) : [];
    if (vals.length) out.push({ doc: d, vals });
  });
  return out;
}
```

**Respuestas agregadas sobre TODOS los documentos** (`countAnswer`, `moneyAnswer`, `dateAnswer`, `whoAnswer`, `catalogAnswer`): preguntas generales como "¿cuánto suman las facturas?" ya no dependen de los 4 mejores documentos TF-IDF; en su lugar **agregan las entidades de todos los procesados** (con o sin filtro de categoría), acumulan totales con `toNum` y citan cada fuente con `[n]` (`citeFor`).

**Composición de HTML seguro:** `esc()` escapa HTML; `highlight()` resalta términos con `looseRegex` (variantes con/sin tilde) aplicando `<mark>`; `asked()` inserta citas `[n]`; `askBody()` lista hasta 3 fragmentos de las 3 mejores fuentes.

**Aumento LLM opcional `augmentWithLlm`:** si `config.ai.base`/`key` existen y la respuesta tiene fuentes, se llama a `POST {base}/chat/completions` con *temperature 0.3*, un system prompt restrictivo ("Responde SOLO con base en el contexto entregado… Cita las fuentes con [n]. No inventes datos") y el contexto serializado `[1] nombre\nfragmentos`. Si falla (red, clave, 4xx), **se conserva la respuesta extractiva** y se marca `llmError`.

**Modo acotado `scopedAnswer`:** con `docId`, responde solo con el contenido de ese documento: saludo/ayuda dirigidos, resumen (usa `d.summary` parseado), intención con entidades extraídas del propio `d.text` (montos/fechas/actores), o fragmentos de `Index.bestSnippets`. Si el documento no está procesado, devuelve aviso con sugerencias de acción.

**Banco de respuestas:** `isGreeting`/`isHelp` disparan `greetingAnswer`/`helpAnswer` con sugerencias adaptadas al ámbito (general vs. documento único); `noneAnswer` construye el mensaje de "no encontré" con sugerencias de reescritura.

**Persistencia:** `ask.routes.js` guarda el mensaje del usuario y la respuesta con `ChatService.push`, aplica `limit()` y responde `{ type, intent, conf, terms, sources, html, docId, docName, llm }`. La intención se muestra en el frontend como *chip* de metainformación.

---

## 9. Aplicación web de una sola página (SPA)

### 9.1 Base y módulos frontend

- `public/index.html`: cascarón que monta `main.js`.
- `main.js`: decide la vista por `location.hash` tras validar sesión; navbar con opciones según rol (admin ve además Usuarios, Bitácora y Respaldo).
- `router.js`: registro de rutas (`#/panel`, `#/docs`, `#/detail/:id`, `#/chat`, `#/repos`, `#/log`, `#/users`, `#/backup`), parseo de parámetros y re-render.
- `api.js`: `request()` centraliza `fetch` con `Authorization: Bearer`, manejo de `401` (cierra sesión), respuestas `{ok,data}` y errores con `toast`; `form()` para multipart y `download()` para blobs.
- `ui.js`: `h()` (nodos DOM), `esc()`, badges, `fmtNum`, `fmtDate`, `timeAgo`, `fmtBytes`, `KPI card`, `bar`, `toast`.
- `css/app.css`: tema (paleta azul/ámbar), tarjetas, tablas, barras de probabilidad, componentes del chat y layout responsivo.

### 9.2 Vistas principales y su lógica

| Vista | Archivo | Funcionalidad |
|---|---|---|
| Login | `views/login.js` | Autenticación y redirección según rol. |
| Panel | `views/dashboard.js` | KPIs, barras por categoría/formato, actividad 14 días, recientes y eventos. |
| Documentos | `views/docs.js` | Tabla con filtros (texto, categoría, formato), selección de repo, carga de archivos y acciones por fila. |
| Detalle | `views/detail.js` | Metadatos, resumen analítico, barras de probabilidad, entidades y acciones (procesar/reprocesar/descargar/consultar/eliminar). |
| Chat IA | `views/chat.js` | Selector de ámbito (todos/por documento), chips de preguntas sugeridas, historial con metainformación, campo de pregunta, renderizado seguro de `html`, limpieza. |
| Repositorios | `views/repos.js` | CRUD de repositorios. |
| Bitácora | `views/log.js` | Eventos con filtro por nivel y limpieza (admin). |
| Usuarios | `views/users.js` | Gestión admin: rol, reset y eliminación. |
| Respaldo | `views/backup.js` | Exportación/restauración JSON. |

Todas las vistas reaccionan a eventos del DOM y re-renderizan regiones específicas (no recargan la página), según el patrón de SPA impulsada por hash.

---

## 10. Pruebas automatizadas

El proyecto usa el runner nativo de Node (`node --test`) con los siguientes archivos:

| Archivo | Alcance | Nº de casos |
|---|---|---|
| `test/rag.test.mjs` | Detección de intención, respuestas agregadas (count/money/date/who/cat/pending), narrativa vs. catálogo, fuentes citadas, degradación LLM, modo `docId`. | 22 |
| `test/analyst.test.mjs` | `analyzeSummary`, ayuda de entidades, deduplicación de cifras, géneros. | 4 |
| `test/router.test.mjs` | Middleware `authRequired`/`adminOnly`, rutas de usuarios y repos, helpers (`hashPassword`, `hashToken`). | 10 |
| `test/smoke.mjs` | Verificación E2E mínima de login + `GET /api/system/info` (contra servidor en ejecución). | 2 |

**Total: 38/38 pruebas en verde** (verificado con `npm.cmd test`). Las pruebas de RAG preparan documentos sintéticos con `setDocsLoader` (inyección de dependencias), simulando entidades reales del corpus, incluidos los casos triple-codificados que reprodujeron el *bug* corregido en la iteración.

Un fragmento representativo de `rag.test.mjs` (respuestas sobre TODOS los documentos):

```js
test('conteo general responde al total de documentos', async () => {
  setDocsLoader(async () => docs);
  const a = await ask('¿Cuántos documentos hay en total?');
  assert.equal(a.intent, 'count');
  assert.ok(a.html.includes('En el repositorio hay'));
  assert.ok(a.html.includes('<b>37</b>') || a.html.includes('37'));
});
```

---

## 11. Verificación de ejecución de la iteración de mejora RAG

Durante el desarrollo se ejecutó y verificó en vivo (equipo del autor, Node v24.19.0), con la base real poblada:

1. **Arranque** → log limpio: `[SIGAD] Servidor listo en http://localhost:3000`.
2. **`npm.cmd test`** → 38/38 casos aprobados (incluidas las 2 regresiones añadidas: *contenido vs. catálogo* y *narrativa vs. montos*).
3. **API en vivo** (`POST /api/ask` con token Bearer de `admin/sigad2024`):

| Pregunta | Resultado esperado | Resultado verificado |
|---|---|---|
| `¿Cuántos documentos hay en total?` | intent `count`, total sobre todos los cargados | 37 documentos, chips por categoría |
| `¿cuánto suman los valores de las facturas?` | intent `money`, agregación por entidades | 9 documentos con Σ total |
| `¿qué documentos hablan sobre retiro de mercancía?` | intent `what`, fragmentos citados | 3 fragmentos de fuentes con `[n]` |

Este ciclo confirmó el objetivo de la mejora: el chat "TODOS LOS DOCUMENTOS" responde ahora con **sentido agregado** y no con los 4 mejores documentos aislados de una búsqueda léxica.

---

## 12. Soporte de la solución (semillas y corpus)

- `server/seed.js`: script CLI que (1) asegura usuarios y repo por defecto, (2) recorre e importa el corpus de `Documentacion/10_Documentos_Prueba` y (3) ejecuta el pipeline por documento importado. Soporta `--corpus-only` para reimportar sin tocar cuentas.
- `server/tools/diagrams.py` (ubicado en `src/tools/diagrams.py`): genera con Pillow las 8 imágenes de la fase de diseño (arquitectura, casos de uso, componentes, despliegue, dos secuencias, MER y flujo) en `Documentacion/02_Diseno/imagenes/`, manteniéndolas reproducibles desde el código con un solo comando.
- Bitácora de desarrollo: `Documentacion/03_Desarrollo/Bitacora_de_Desarrollo.md` registra cronológicamente el proceso constructivo (commits, decisiones técnicas e incidencias), trazable con el historial de Git.
- Corpus de pruebas (33 documentos): series **FE** (facturas), **CT** (contratos), **CO** (correspondencia) e **IN** (informes) distribuidas en formatos **PDF/DOCX/TXT**, descritas por el manifiesto `_manifesto_corpus.csv` con campos nombre, categoría y formato.

---

## 13. Referencias

1. Documentación oficial de Node.js — módulo `node:sqlite` y `node:test` (2026).
2. Documentación oficial de Express.js — routing y middleware (2026).
3. pdf.js / pdfjs-dist — extracción de texto de PDF (2026); mammoth — DOCX a texto (2026).
4. Jurafsky, D., Martin, J. (2021). *Speech and Language Processing* (Naive Bayes, TF-IDF, NER).
5. Deerwester, S. et al. (1990). *Indexing by Latent Semantic Analysis* (LSA).
6. Lewis, P. et al. (2020). *Retrieval-Augmented Generation* NeurIPS.
7. Arquitectura limpia y buenas prácticas de Node/JavaScript (Borwkovski, 2019; Martin, 2017).

---

*Fin del Documento de Desarrollo Técnico — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*