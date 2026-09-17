# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Manual Técnico

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Manual Técnico |
| **Fecha** | Septiembre de 2026 |
| **Complementos** | `Documento_de_Desarrollo_Tecnico.md` · `Manual_de_Usuario.md` · `Manual_de_Administracion_y_Soporte.md` |

---

## Tabla de contenido

1. Descripción técnica general
2. Requisitos del entorno
3. Instalación y ejecución
4. Estructura del proyecto
5. Arquitectura técnica
6. Modelo de datos
7. Configuración (variables de entorno)
8. Referencia de la API REST
9. Motor de IA: NLP local
10. Ejecución de pruebas
11. Despliegue
12. Solución de problemas
13. Referencias

---

## 1. Descripción técnica general

SIGAD es una aplicación web **full-stack monorepo** escrita íntegramente en **JavaScript (ES Modules)**:

- **Backend:** Node.js + Express 4, base de datos **SQLite nativa** (`node:sqlite`, modo WAL) y un motor de **IA/PLN propio en español** (clasificador Naive Bayes, resumen analítico, NER por patrones, índice TF-IDF y embeddings **LSA**). Opcional: capa de síntesis con LLM externo (compatible con OpenAI `/chat/completions`).
- **Frontend:** SPA en JavaScript vanilla (ES Modules), sin frameworks ni *build step*, que consume la API REST.
- **Pruebas:** runner nativo `node --test` (36 casos unitarios/integración) + smoke test E2E.

---

## 2. Requisitos del entorno

| Componente | Requisito |
|---|---|
| Node.js | **≥ 22.5.0** (necesita `node:sqlite`) — verificado en v24.19.0 |
| npm | incluido con Node |
| Sistema | Windows 10/11 (verificado) / Linux / macOS |
| Navegador | moderno (Chromium/Edge) |
| (Opcional) | API LLM compatible con OpenAI para la capa de síntesis |

No hay dependencias binarias externas: PDF/DOCX se procesan en JS (`pdfjs-dist`, `mammoth`) y la BD es un archivo local.

---

## 3. Instalación y ejecución

```bash
cd sigad\src
npm install
copy .env.example .env     # Windows (o cp en Linux/macOS)
npm.cmd start              # http://localhost:3000
```

Para cargar usuarios y corpus de demostración:

```bash
npm.cmd run seed            # credenciales + corpus (33 documentos)
npm.cmd run corpus          # solo corpus (sin tocar cuentas)
```

Pruebas:

```bash
npm.cmd test                # 36 casos unitarios/integración
node server/test/smoke.mjs  # E2E con base aislada (SIGAD)
```

---

## 4. Estructura del proyecto

```
sigad/
├── Documentacion/            # entregables y evidencias (fuera del código)
└── src/                      # ← código de la aplicación
    ├── package.json          # scripts: start · seed · corpus · test
    ├── .env / .env.example   # configuración
    ├── data/  sigad.sqlite   # base SQLite (WAL)
    ├── uploads/              # archivos físicos (uuid_nombre)
    ├── public/
    │   ├── index.html
    │   ├── css/app.css
    │   └── js/
    │       ├── main.js · router.js · api.js · ui.js
    │       └── views/  login · dashboard · docs · detail · chat
    │                    repos · log · users · backup
    ├── tools/diagrams.py     # genera diagramas Mermaid del diseño
    └── server/
        ├── index.js          # bootstrap Express + montaje de routers
        ├── seed.js           # CLI de semillas/corpus
        ├── test/             # rag · analyst · router · smoke
        └── src/
            ├── config.js     # variables de entorno
            ├── db.js         # DatabaseSync + migraciones + parseJson
            ├── middleware.js # scrypt · tokens · multer · logEvent · ApiError
            ├── routes/       # auth · users · repos · docs · ask · system
            ├── services/     # auth · user · repo · doc · chat · dashboard
            │                 # backup · seed · pipeline
            └── nlp/          # tokenizer · classifier · summarizer · analyst
                             # entities · tfidf · embeddings · rag
```

---

## 5. Arquitectura técnica

`src/server/index.js` inicia registrando semillas, reconstruye el índice TF-IDF y el espacio LSA, inyecta el *loader* de documentos al RAG (`setDocsLoader`) y monta:

```
/api/auth → auth.routes        (register · login · logout · me)
/api/users → users.routes      (list · role · reset · delete)  [admin]
/api/repos → repos.routes      (list · create · delete)
/api/docs  → docs.routes       (list · upload · get · process · download · delete)
/api       → ask.routes        (search · ask · chat)
/api       → system.routes     (dashboard · events · backup · seed · info)
```

Capa de persistencia: `db.js` (DatabaseSync + migraciones). Capa inteligente: módulos `nlp/*` puros e independientes del transporte HTTP. El frontend SPA consume la API con `fetch` y token Bearer.

---

## 6. Modelo de datos

Seis tablas en SQLite (`node:sqlite`, WAL):

| Tabla | Columnas principales | Propósito |
|---|---|---|
| `users` | id, username (u), name, role (`admin`/`analista`), salt, hash, created | Cuentas |
| `repos` | id, name, desc, ownerId, created | Agrupación de documentos |
| `docs` | id, name, ext, size, repoId, ownerId, status, filePath, text, pages, wordCount, category, categoryProbs (JSON), summary (JSON), entities (JSON), analysisAt | Documentos + campos IA |
| `sessions` | tokenHash (PK), userId, created, expires | Sesiones (solo hash del token) |
| `events` | id, ts, level, comp, msg, user | Bitácora |
| `chat` | id, userId, role, ts, q, type, intent, conf, terms (JSON), sources (JSON), html, docId, docName | Historial del chat |

**Índices:** `docs(repoId)`, `docs(status)`, `docs(ownerId)`, `events(ts)`, `chat(userId)`.

**Migraciones:** `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` condicional (se añadieron `chat.docId`/`chat.docName` para el modo acotado sin recrear la base).

---

## 7. Configuración (variables de entorno)

| Variable | Tipo | Defecto | Descripción |
|---|---|---|---|
| `PORT` | number | 3000 | Puerto del servidor |
| `DB_PATH` | ruta | `data/sigad.sqlite` | Base relativa al proyecto |
| `UPLOADS_DIR` | ruta | `uploads` | Directorio de archivos |
| `SESSION_TTL_DAYS` | number | 7 | Días de vida de una sesión |
| `MAX_UPLOAD_MB` | number | 10 | Tope de archivo (bytes límite multer) |
| `MAX_TEXT_CHARS` | number | 300000 | Truncado del texto indexado |
| `EMBED_DIMS` | number | 40 | Dimensiones del espacio LSA (8–64) |
| `EMBED_MINDF` | number | 2 | Frecuencia documental mínima para LSA |
| `AI_API_BASE` | url | — | LLM opcional (Chat Completions) |
| `AI_API_KEY` | secreto | — | Llave del LLM opcional |
| `AI_MODEL` | string | — | Modelo del LLM opcional |

---

## 8. Referencia de la API REST

### Convenciones
- Éxito: `{ "ok": true, "data": … }` · Error: `{ "ok": false, "error": { "code", "message" } }`.
- Autenticación: `Authorization: Bearer <token>`; admin exigido en usuarios, restauración y corpus.
- Códigos de error típicos: `AUTH` (401) · `PERM` (403) · `VAL` (400) · `NOTFOUND` (404) · `LIMIT_FILE_SIZE` (413) · 500 interno.

### 8.1 Autenticación — `/api/auth`
| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| POST | `/register` | `{username, name, password}` | `{user, token}` (201) |
| POST | `/login` | `{username, password}` | `{user, token}` |
| POST | `/logout` | — | `{message}` |
| GET | `/me` | — | usuario actual |

### 8.2 Usuarios (admin) — `/api/users`
| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| GET | `/` | — | lista de usuarios con conteo de docs |
| PATCH | `/:id/role` | `{role}` | `{message}` |
| POST | `/:id/reset` | `{password?}` | `{message}` |
| DELETE | `/:id` | — | `{message}` |

### 8.3 Repositorios — `/api/repos`
| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| GET | `/` | — | lista de repos |
| POST | `/` | `{name, desc?}` | repo (201) |
| DELETE | `/:id` | — | `{message}` |

### 8.4 Documentos — `/api/docs`
| Método | Ruta | Notas |
|---|---|---|
| GET | `/` | filtros `q`,`cat`,`fmt`,`repo`,`sort` |
| POST | `/` | multipart `file` (+`repoId`) |
| GET | `/:id` | detalle con campos IA |
| POST | `/:id/process` | ejecuta el pipeline |
| POST | `/:id/reprocess` | regenera campos IA |
| GET | `/:id/download` | binario (Content-Disposition) |
| DELETE | `/:id` | propietario/admin |

### 8.5 Búsqueda y chat — `/api`
| Método | Ruta | Parámetros | Devuelve |
|---|---|---|---|
| GET | `/search` | `q`, `semantic?`, `docId?` | `[{id,name,score,cos?,blend?,category,snippets}]` |
| POST | `/ask` | `{q, docId?}` | `{type,intent,conf,terms,sources,html,docId?,docName?,llm?}` |
| GET | `/chat` | — | historial del usuario |
| DELETE | `/chat` | `{docId?}` | `{message}` |

### 8.6 Sistema — `/api`
| Método | Ruta | Auth | Devuelve |
|---|---|---|---|
| GET | `/dashboard` | sí | KPIs consolidados |
| GET | `/events` · DELETE | sí/admin | bitácora |
| GET | `/backup` | sí | respaldo JSON |
| POST | `/backup/restore` | admin | `{repos,docs}` |
| POST | `/seed/corpus` | admin | `{total,ok,dup,failed}` |
| GET | `/system/info` | pública | `{app,version,node,corpusDir,embeddings}` |

---

## 9. Motor de IA: NLP local

**Pipeline de procesamiento** (`services/pipelineService.js`): `extract → token → class → sum → ner → index`.

| Etapa | Módulo | Técnica |
|---|---|---|
| Extracción | `intrinseca` (pdfjs-dist/mammoth/fs) | texto de PDF/DOCX/TXT + guardia de 20 caracteres |
| Tokenización | `nlp/tokenizer.js` | NFD, minúsculas, stopwords ES, stemming por sufijos, expansión léxica |
| Clasificación | `nlp/classifier.js` | Naive Bayes multinomial + Laplace + escala log · 4 categorías |
| Resumen | `nlp/summarizer.js` + `analyst.js` | TF + premio a oraciones concretas + resumen analítico redactado |
| Entidades | `nlp/entities.js` | NER por patrones · 7 tipos · `toNum` |
| Indexado | `nlp/tfidf.js` | índice invertido TF-IDF + fragmentos |
| Semántica | `nlp/embeddings.js` | LSA: SVD truncado aleatorizado (potencia + QR + Jacobi) |
| RAG | `nlp/rag.js` | intención → agregados/recuperación → citas `[n]` → LLM opcional |

**Comportamiento del asistente** (`rag.ask(q, {docId})`):
- **Global:** `count` (conteo total/procesados/pendientes/errores), `cat` (catálogo), `money`/`date`/`who` (agrega entidades de **todos** los procesados), `pending` (lista documentos con menciones), `what` (recuperación TF-IDF con fragmentos citados).
- **Acotado (`docId`):** resumen, valores, fechas, actores o fragmentos del documento elegido.
- **Respuestas especiales:** saludo, ayuda, aviso de documento no procesado, "no encontré" con sugerencias.
- **Seguridad:** todo HTML se escapa (`esc`), los términos se resaltan con `<mark>`, y las fuentes se citan.

**Diseño clave:** `parseJson` desanida JSON anidado (datos legados); `setDocsLoader` inyecta la fuente de documentos (permite pruebas sin DB); los índices se reconstruyen al arrancar desde `docs.text`.

---

## 10. Ejecución de pruebas

```bash
npm.cmd test
# 38/38: rag(22) + analyst(4) + router(10) + smoke(2 bloques)
```

- `rag.test.mjs`: intención, catálogo, agregados, modo `docId`, narrativa vs. catálogo, sumas vs. narrativa, avisos, sugerencias.
- `analyst.test.mjs`: géneros reales del corpus (CT-004, FE-001, IN-007, CO-001).
- `router.test.mjs`: `parseHash`, `resolveRoute` por rol, `ROUTES`, `parseJson` (JSON anidado).
- `smoke.mjs`: arranque en puerto 3199, login, upload, pipeline, search, ask, dashboard, chat; autocleanup de `data/smoke.sqlite` y `uploads/smoke`.

---

## 11. Despliegue

- **Local/demostración:** `npm.cmd start` desde `src/`.
- **Producción:** correr detrás de un proxy (TLS); `trust proxy` ya está habilitado; respaldar `data/sigad.sqlite` + `uploads/`; ajustar `SESSION_TTL_DAYS`, `MAX_UPLOAD_MB` y opcionalmente `AI_API_*`.
- **Reversión:** restaurar respaldo físico (base + uploads) y reiniciar; los índices se reconstruyen solos.
- **CI conceptual:** `npm.cmd test` como gate de cada cambio.

---

## 12. Solución de problemas

| Error | Causa | Solución |
|---|---|---|
| `node:sqlite` no se encuentra | Node < 22.5 | Actualizar Node |
| `413` en carga | archivo > `MAX_UPLOAD_MB` | subir el límite en `.env` |
| doc en `error` "posible documento escaneado" | PDF sin capa de texto | usar archivo con texto |
| chat no responde | pocos docs procesados | procesar o correr `seed` |
| LLM no enriquece | sin `AI_API_BASE/KEY` o red fallida | define las variables o confía en el modo extractivo (degradación automática) |
| puerto ocupado | otro servicio en 3000 | cambiar `PORT` |

---

## 13. Referencias

1. Node.js — `node:sqlite`, `node:test` (2026).
2. Express 4 — routing y middleware (2026).
3. pdf.js · mammoth · multer — documentación oficial (2026).
4. Bloque 3 (Desarrollo Técnico) — detalle de implementación de cada módulo.
5. Bloque 4 (Pruebas QA) — matriz de trazabilidad y evidencias.

---

*Fin del Manual Técnico — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*