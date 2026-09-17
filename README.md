# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

**Proyecto integrador · Tecnología en Desarrollo de Software · VI semestre**
Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales

**Autor:** Javier Andrés Núñez Sánchez

SIGAD gestiona, clasifica y analiza documentos empresariales (facturas, contratos, correspondencia e informes) con inteligencia artificial local: clasifica el tipo de documento, genera resúmenes analíticos, extrae entidades y responde preguntas en lenguaje natural con citas de fuentes (`RAG` extractivo).

---

## 1. Tecnologías y versiones

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | ≥ 22.5.0 (verificado en v24.19.0) | Runtime + `node:sqlite` + `node:test` |
| Express | 4.22.2 | Servidor HTTP y API REST |
| pdfjs-dist | 4.10.38 | Extracción de texto de PDF |
| mammoth | 1.12.2 | Extracción de texto de DOCX |
| multer | 1.4.5-lts.2 | Carga de archivos |
| dotenv | 16.6.1 | Variables de entorno |
| SQLite | nativo (`node:sqlite`) | Base de datos local (WAL) |
| Frontend | JS vanilla (ES Modules) | SPA sin frameworks |
| Pruebas | `npm run test` | 38 casos (unit + integración + E2E) |

La capa de IA/PLN (clasificador Naive Bayes, resumidor, NER, TF-IDF y embeddings LSA) es **100 % local**; el RAG integra fragmentos citados `[n]`. Opcionalmente se puede añadir un LLM externo (compatible con OpenAI `/chat/completions`).

---

## 2. Requisitos

- Node.js **≥ 22.5.0** (se requiere el módulo nativo `node:sqlite`).
- npm incluido.
- Navegador moderno (Chromium/Edge).
- Windows (verificado) / Linux / macOS.

---

## 3. Cómo ejecutar

Desde la raíz del código (`src/`):

```bash
cd src
npm install

# Configuración (opcional)
copy .env.example .env        # Windows  |  cp .env.example .env (Linux/macOS)

# Arrancar el servidor → http://localhost:3000
npm.cmd start
```

> En **PowerShell** use siempre `npm.cmd`, no `npm`, para invocar scripts.

### Poblar datos de demostración

```bash
npm.cmd run seed     # crea cuentas + importa y procesa el corpus (33 documentos)
npm.cmd run corpus   # solo importa el corpus
```

### Credenciales por defecto

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `sigad2024` | Administrador |
| `analista` | `analista2024` | Analista |

### Pruebas

```bash
npm.cmd test                 # 38/38 casos en verde
node server/test/smoke.mjs   # E2E: login → upload → pipeline → chat → dashboard
```

---

## 4. Estructura del proyecto

```
sigad/
├── README.md                     ← este archivo
├── Documentacion/                ← entregables académicos y evidencias
│   ├── 01_Analisis/              Documento de Análisis (requisitos)
│   ├── 02_Diseno/                Documento de Diseño (arquitectura)
│   ├── 03_Desarrollo/            Documento de Desarrollo Técnico
│   ├── 04_Pruebas/               Plan de Pruebas QA + evidencias (imagenes/, DOCX)
│   ├── 05_Implementacion/        Implementación y Despliegue + Manual Administración
│   ├── 06_Manual_Usuario/        Manual de Usuario
│   ├── 07_Manual_Tecnico/        Manual Técnico
│   ├── 08_Matriz_Trazabilidad/
│   ├── 09_Base_Datos/
│   ├── 10_Documentos_Prueba/     Corpus (FE/CT/CO/IN · pdf/docx/txt)
│   └── 11_Presentacion/
└── src/                          ← código de la aplicación
    ├── package.json · .env(.example)
    ├── data/                     base SQLite (WAL)
    ├── uploads/                  archivos de los documentos
    ├── public/                   frontend SPA (index.html · CSS · js/views)
    ├── tools/diagrams.py         diagramas Mermaid del diseño
    └── server/
        ├── index.js · seed.js
        ├── test/                 pruebas automatizadas
        └── src/
            ├── config.js · db.js · middleware.js
            ├── routes/           auth · users · repos · docs · ask · system
            ├── services/         auth · user · repo · doc · chat · dashboard
            │                     backup · seed · pipeline
            └── nlp/              tokenizer · classifier · summarizer · analyst
                                 entities · tfidf · embeddings · rag
```

---

## 5. Funcionalidades principales

| Área | Descripción |
|---|---|
| Panel | KPIs, clasificación por categoría, formato, actividad 14 días |
| Documentos | Carga (PDF/DOCX/TXT), procesamiento IA, resumen, entidades, descarga |
| Asistente IA | Chat sobre **todos** los documentos o uno específico, con citas `[n]` |
| Repositorios | Agrupación de documentos por unidad/proyecto |
| Usuarios | Roles `admin`/`analista` (gestión exclusiva de admin) |
| Bitácora y Respaldo | Eventos del sistema y exportación/restauración JSON (admin) |

**Ejemplos de preguntas al chat:**
- «¿Cuántos documentos hay en total?»
- «¿Cuánto suman los valores de las facturas?»
- «¿Qué documentos hablan sobre retiro de mercancía?»
- «¿Qué fechas de vencimiento aparecen?»
- Con un documento seleccionado: «Resume este documento», «¿Quiénes aparecen?»

---

## 6. Endpoint de la API (resumen)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Autenticación (devuelve token Bearer) |
| GET/POST | `/api/docs` | Listar / cargar documentos |
| POST | `/api/docs/:id/process` | Procesar con IA |
| POST | `/api/ask` | Pregunta al asistente RAG |
| GET | `/api/search` | Búsqueda TF-IDF |
| GET | `/api/chat` | Historial del chat |
| GET | `/api/dashboard` | KPIs del panel |
| GET | `/api/system/info` | Información del sistema |

---

## 7. Documentación académica

Los entregables del proyecto están en `Documentacion/` (ver estructura). El bloque de análisis define 20 requisitos funcionales (RF-01…RF-20), 6 no funcionales (RNF-01…RNF-06) y 16 reglas de negocio (RN-01…RN-16), con historias de usuario, casos de uso, matriz de trazabilidad y riesgos.

---

_Licencia: uso académico (UNLICENSED)._