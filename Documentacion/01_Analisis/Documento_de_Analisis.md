# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Documento de Análisis (Ingeniería de Requisitos)

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Documento de Análisis |
| **Fecha** | Septiembre de 2026 |
| **Carta de replicabilidad** | Código fuente en `src/` · Base documental en `Documentacion/10_Documentos_Prueba/` |

---

## Tabla de contenido

1. Introducción y contexto empresarial
2. Definición de objetivos
3. Alcance y exclusiones
4. Identificación de actores y personas
5. Requerimientos funcionales enumerados (RF-01 en adelante)
6. Requerimientos no funcionales (RNF-01 en adelante)
7. Reglas de negocio
8. Historias de usuario
9. Casos de uso (UC-01 al UC-06)
10. Matriz de trazabilidad inicial y análisis de riesgos
11. Glosario
12. Referencias

---

## 1. Introducción y contexto empresarial

### 1.1 La acumulación pasiva de información no estructurada

Una porción dominante de la información que circula en las organizaciones contemporáneas —estimada entre el 80 % y el 90 % del total corporativo según la literatura de gestión de la información— no se encuentra en bases de datos relacionales estructuradas, sino en documentos digitales de formato libre: facturas electrónicas, contratos de prestación de servicios, actas de reunión, informes de gestión, comunicaciones oficiales, correos y anexos en PDF, DOCX y TXT. Estos activos se acumulan de forma discrecional en carpetas compartidas de red, servicios de almacenamiento en la nube y discos locales, sin una taxonomía uniforme, sin metadatos de clasificación y sin un proceso sistemático de recuperación.

El problema de negocio que enfrenta una mediana organización colombiana puede formalizarse de la siguiente manera: **los documentos no estructurados acumulan valor informativo que no se explota porque no existe un mecanismo automatizado que los organice, los interprete y los ponga a disposición de la toma de decisiones.** Cada factura contiene una cifra que debería alimentar el control de cartera; cada contrato contiene plazos, partes y garantías que deberían monitorearse; cada informe contiene indicadores que deberían consolidarse. Sin embargo, la recuperación de este conocimiento depende de la memoria individual de los colaboradores, de la navegación manual por árboles de carpetas y de búsquedas textuales exactas que fallan ante la diversidad léxica del español (sinónimos, flexiones, abreviaturas y variaciones ortográficas).

A este problema se suma la ausencia de **observabilidad**: las organizaciones no disponen de un panel consolidado que responda preguntas tan básicas como "¿cuántos documentos tenemos?", "¿cuántos están procesados con inteligencia artificial?", "¿qué categorías documentales predominan?" o "¿cuál es el estado de la cartera según las facturas del repositorio?". El ciclo de vida del documento —carga, extracción, análisis, clasificación, consulta y respaldo— permanece fragmentado y no auditable.

### 1.2 La oportunidad de negocio

La oportunidad se materializa en la conversión de documentos pasivos en **información activa y consultable en lenguaje natural**. Al aplicar técnicas de Inteligencia Artificial —procesamiento de lenguaje natural (NLP), clasificación supervisada por Bayes, extracción de entidades, resumión extractiva, indexación TF-IDF, embeddings semánticos y generación aumentada por recuperación (RAG)— es posible transformar un repositorio inerte en un activo consultable: un usuario formula una pregunta en español ("¿Cuánto suman los valores de las facturas?", "¿Qué documentos están pendientes de pago?", "¿Quién emitió los contratos de mantenimiento?") y el sistema responde con evidencia textual citada, verificable y con nivel de confianza asociado.

El proyecto SIGAD (Sistema Inteligente de Gestión y Análisis Documental) se inscribe en el marco del proyecto integrador de la Tecnología en Desarrollo de Software de la UTS, VI semestre, con énfasis en **Desarrollo de Aplicaciones Empresariales**. Su premisa diferenciadora frente a las soluciones comerciales es doble: (1) es una **solución de código abierto y local** que no depende de servicios de inteligencia artificial externos para operar —funciona en su totalidad sin claves de API ni costos por consumo—; y (2) aplica un **principio de verificabilidad** según el cual toda respuesta generada por el asistente debe sustentarse en fragmentos textuales reales del repositorio, citados con numeración `[n]`, de modo que el resultado sea rastreable y auditable.

### 1.3 Contexto académico y metodológico

El documento que se desarrolla a continuación corresponde a la **fase de análisis** del ciclo de vida de la ingeniería de software: se estudia el problema, se delimita la solución, se especifican los requerimientos desde la perspectiva de los interesados y se formalizan reglas, historias de usuario y casos de uso que guiarán el diseño (Bloque 2), el desarrollo (Bloque 3), las pruebas (Bloque 4) y la implementación (Bloque 5). La notación empleada sigue las convenciones estándar de la especificación de requisitos IEEE 830 / ISO/IEC/IEEE 29148, adaptada al nivel formativo del programa.

---

## 2. Definición de objetivos

### 2.1 Objetivo general

Diseñar, desarrollar y validar el sistema **SIGAD — Sistema Inteligente de Gestión y Análisis Documental**, una aplicación empresarial web modular que permita la captura, el procesamiento automatizado con inteligencia artificial y la consulta en lenguaje natural de documentos no estructurados (PDF, DOCX y TXT), convirtiendo datos pasivos en información útil, verificable y disponible para la toma de decisiones organizacionales, mediante un pipeline de IA 100 % local: extracción de contenido, clasificación automática, resumión extractiva, extracción de entidades, indexación TF-IDF, embeddings semánticos (LSA) y consultas RAG con evidencia citada.

### 2.2 Objetivos específicos (medibles)

Cada objetivo específico se formula con un **indicador** y una **métrica de cumplimiento** que permitirá su verificación en la fase de pruebas (Bloque 4).

| ID | Objetivo específico | Indicador de cumplimiento |
|---|---|---|
| OE-01 | Establecer un módulo de autenticación y control de roles con gestión de sesiones por credenciales y control de acceso basado en roles (administrador / analista). | 100 % de los endpoints protegidos exigen token; las rutas administrativas rechazan roles no autorizados (código 403). |
| OE-02 | Implementar la captura de documentos en los formatos PDF, DOCX y TXT con validación estricta de tipo y tamaño máximo. | > 99 % de los archivos no permitidos son rechazados antes de su persistencia; límite de 10 MB por archivo. |
| OE-03 | Construir el pipeline de IA local que extraiga texto, clasifique automáticamente el documento, genere resumen extractivo, identifique entidades y alimente el índice de búsqueda. | 100 % de los documentos procesables alcanzan estado `procesado`; métricas de exactitud de clasificación ≥ 90 % sobre el corpus de prueba. |
| OE-04 | Clasificar automáticamente los documentos en las categorías documentales del dominio: Contrato, Factura, Correspondencia e Informe. | Exactitud de clasificación medida contra la categoría esperada del corpus de referencia *_manifesto_corpus.csv_*. |
| OE-05 | Implementar búsqueda y consulta en lenguaje natural con respuestas agregadas y fragmentos citados, tanto sobre todos los documentos como acotada a uno. | ≥ 5 intenciones identificables (conteo, dinero, fechas, entidades, catálogo, contenido) y 100 % de respuestas con fuentes citables. |
| OE-06 | Desarrollar un dashboard de indicadores que consolide el estado del repositorio (documentos, procesados, pendientes, errores, categorías, formatos, actividad). | Panel de control alimentado en tiempo real por `DashboardService` con métricas agregadas consultables vía API. |
| OE-07 | Implementar un módulo de bitácora/registro de eventos (logs) y de respaldo/restauración de la información del repositorio. | Todo evento relevante (login, carga, procesamiento, errores, respaldo) queda registrado con nivel, componente y usuario. |
| OE-08 | Incorporar un bloque de pruebas automatizadas (unitarias e integración E2E) que demuestre el cumplimiento de los requerimientos. | Suite de pruebas ejecutable con `node --test` con 0 fallos y cobertura de los requerimientos críticos. |

---

## 3. Alcance y exclusiones

### 3.1 Alcance del sistema

SIGAD cubre el **ciclo de vida completo de la gestión documental inteligente** dentro de un repositorio corporativo web:

1. **Gestión de acceso**: registro y autenticación de usuarios (administradores y analistas), sesiones por token, cambio de roles y restablecimiento de contraseñas.
2. **Organización del repositorio**: creación, listado y eliminación de repositorios (carpetas documentales), con un repositorio "General" por defecto no eliminable.
3. **Captura documental**: carga de archivos PDF, DOCX y TXT, con validación de extensión, tamaño y persistencia física en la carpeta `uploads/`.
4. **Motor de inteligencia artificial local**: extracción de texto (pdf.js para PDF, mammoth para DOCX, lectura directa para TXT), clasificación Naive Bayes multinomial, generación de resumen analítico, extracción de entidades (fechas, montos, correos, teléfonos, identificaciones, personas y organizaciones), tokenización con stemming y stopwords en español.
5. **Indexación y búsqueda**: índice TF-IDF en memoria y embeddings LSA para recuperación semántica y búsqueda híbrida.
6. **Conversación en lenguaje natural**: consultas RAG sobre todos los documentos o acotadas a uno, con detección de intención, respuestas agregadas (conteos, sumas, fechas, entidades, catálogos) y fragmentos citados.
7. **Observabilidad**: panel de indicadores, bitácora de eventos (logs de información, advertencias y errores) y módulo de respaldo/restauración JSON.
8. **Trazabilidad académica**: corpus de prueba curado en `Documentacion/10_Documentos_Prueba/` (33 documentos: facturas, contratos, correspondencias e informes, en tres formatos cada bloque) con manifiesto de referencia.

### 3.2 Exclusiones (fuera del alcance actual)

- **Escaneo y reconocimiento óptico de caracteres (OCR)**: los documentos imagen o escaneados sin capa de texto no se interpretan; se marca el documento con error de "Sin contenido legible" y se documenta como mejora de producción. La arquitectura prevé la sustitución del extractor para incorporar OCR (p. ej., Tesseract).
- **Procesamiento de audio, video y ofimática adicional** (XLSX, PPTX, ODT): solo se admiten PDF, DOCX y TXT.
- **Firma electrónica y validez tributaria avanzada** de los documentos: el sistema no emite comprobantes ni certifica validez jurídica de las facturas electrónicas.
- **LLM generativo externo obligatorio**: la integración con un modelo de lenguaje externo (compatible con API OpenAI) es **opcional** y se activa solo si se definen variables de entorno `AI_API_BASE` y `AI_API_KEY`. Sin ellas, el sistema opera con RAG extractivo 100 % local.
- **Multi-tenant en nube, alta disponibilidad distribuida y despliegue multiinstancia**: el alcance formativo es de aplicación empresarial local (localhost) con diseño preparado para despliegue en servidor.
- **Migración masiva de sistemas legados y autenticación corporativa** (LDAP/SSO): el registro de usuarios es interno.
- **Análisis predictivo**: no se realizan proyecciones estadísticas futuras; el análisis es descriptivo y documental.

---

## 4. Identificación de actores y personas

### 4.1 Administrador del sistema

| Atributo | Descripción |
|---|---|
| **Perfil** | Usuario con control total del sistema: gestión de usuarios, roles, repositorios, bitácora, respaldos y repositorio documental. Cuenta de ejemplo: `admin` / `sigad2024`. |
| **Responsabilidades** | Crear organización de repositorios; administrar documentos y su IA; controlar accesos; supervisar logs; ejecutar respaldos y restauraciones; operar sobre el corpus de prueba. |
| **Necesidades** | Vincular usuarios correctos a los documentos; restablecer contraseñas; auditar errores de procesamiento; disponer de un canal de respaldo de la información; validar que la IA clasifica correctamente antes de la puesta en operación. |
| **Frustraciones** | Procesamiento manual de grandes volúmenes; imposibilidad de auditar quién ejecutó qué acción; pérdida de información ante ausencia de respaldos; tareas repetitivas de clasificación y etiquetado. |
| **Motivaciones** | Reducir el costo administrativo de la gestión documental; garantizar integridad, trazabilidad y disponibilidad de la información; alcanzar métricas de madurez informacional. |

### 4.2 Usuario cliente / gestor documental (analista)

| Atributo | Descripción |
|---|---|
| **Perfil** | Colaborador operativo que carga documentos, consulta el repositorio, revisa análisis de IA y conversa con el asistente. Cuenta de ejemplo: `analista` / `analista2024`. |
| **Responsabilidades** | Cargar documentos bajo los formatos permitidos; procesar y reprocesar documentos; descargar archivos; consultar resúmenes y entidades; formular preguntas en lenguaje natural al asistente. |
| **Necesidades** | Encontrar rápidamente la información de una factura, contrato o informe; obtener resúmenes legibles; hacer preguntas en lenguaje natural y obtener respuestas citadas; no depender de un especialista en TI. |
| **Frustraciones** | Búsquedas textuales exactas que no encuentran sinónimos; documentos desorganizados sin categoría; resúmenes genéricos que no aportan; interfaces que exigen conocimientos técnicos. |
| **Motivaciones** | Ahorrar tiempo de consulta; producir información accionable para la operación (pagos pendientes, vencimientos, partes contractuales); integrar la gestión documental en su flujo de trabajo. |

### 4.3 Actor técnico auxiliar (sistema)

| Atributo | Descripción |
|---|---|
| **Perfil** | Componente software automatizado que interactúa en nombre del proceso: carga del corpus, extracción, clasificación, indexación, respaldo y registro de eventos. |
| **Necesidades** | Ejecutar el pipeline de forma transaccional y persistente; registrar la trazabilidad de cada evento. |
| **Interacciones** | `seed.js` importa el corpus y dispara el pipeline; `BackupService` exporta/restaura JSON; `logEvent` registra usuarios y niveles. |

---

## 5. Requerimientos funcionales enumerados

Los requerimientos funcionales (RF) se definen con identificador único, descripción verificable, prioridad (alta/media/baja) y trazabilidad hacia historias de usuario, casos de uso y pruebas. El sistema real implementa los siguientes requerimientos.

### RF-01 · Autenticación de usuarios (Prioridad: Alta)
El sistema debe permitir el registro de nuevos usuarios y el inicio de sesión mediante credenciales (`username` + contraseña), retornando un token de sesión que será requerido por las rutas autenticadas. Las contraseñas se almacenan con `scrypt` + sal por usuario. **Verif.:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

### RF-02 · Control de acceso por roles
El sistema debe distinguir dos roles (`admin` y `analista`). Las operaciones administrativas (gestión de usuarios, limpieza de bitácora, restauración de respaldos, carga del corpus) deben restringirse al rol `admin`; las demás son compartidas. **Verif.:** middleware `authRequired` y `adminOnly`; respuestas 401/403.

### RF-03 · Gestión de repositorios (carpetas documentales)
El sistema debe permitir crear, listar y eliminar repositorios. El repositorio "General" (`general`) es por defecto y no puede eliminarse; al eliminar un repositorio, sus documentos se reasignan a "General". **Verif.:** `GET/POST /api/repos`, `DELETE /api/repos/:id`.

### RF-04 · Carga de documentos (CRUD de archivos PDF/DOCX/TXT)
El sistema debe permitir la subida de un archivo por solicitud con campo multipart `file`, validando extensión permitida y tamaño máximo (10 MB). Debe persistir el archivo en `uploads/`, registrar la fila en la tabla `docs` con estado `pendiente` y dejar trazabilidad en la bitácora. **Verif.:** `POST /api/docs` (multer), `GET /api/docs`, `GET /api/docs/:id`, `GET /api/docs/:id/download`, `DELETE /api/docs/:id`.

### RF-05 · Listado, filtrado y ordenamiento de documentos
El sistema debe listar los documentos con filtros por categoría (`cat`), formato (`fmt`), repositorio (`repo`) y búsqueda textual (`q`), y orden por relevancia TF-IDF, nombre o palabras. **Verif.:** `GET /api/docs?q=&cat=&fmt=&repo=&sort=`.

### RF-06 · Pipeline de IA por documento
El sistema debe exponer la operación de procesamiento que ejecuta secuencialmente: extracción de contenido, tokenización, clasificación, resumen analítico, extracción de entidades, indexado TF-IDF y re-entrenamiento de embeddings. Debe transicionar el estado a `procesando` y luego a `procesado` o `error` con su mensaje. **Verif.:** `POST /api/docs/:id/process` y `/reprocess`.

### RF-07 · Clasificación automática en categorías documentales
El clasificador debe asignar una de las categorías del dominio —Contrato, Factura, Correspondencia, Informe— basado en un modelo Naive Bayes multinomial entrenado sobre vocabulario de dominio colombiano, con suavizado de Laplace y distribuciones de probabilidad por categoría almacenadas. **Verif.:** campos `category` y `categoryProbs` del documento; dashboard por categoría.

### RF-08 · Resumen analítico del documento
El sistema debe generar un resumen en lenguaje natural que describa el tipo de documento, su objeto/tema, las partes intervinientes, cifras relevantes y fechas clave, a partir de secciones y entidades reales del texto (nada inventado). **Verif.:** campo `summary` (lista de oraciones) y vista de detalle.

### RF-09 · Extracción de entidades (NER por patrones)
El extractor debe identificar hasta siete tipos de entidades: fechas, montos y valores, correos electrónicos, teléfonos, identificaciones (NIT/CC/CE), personas y organizaciones, limitando a 12 por tipo. **Verif.:** campo `entities` y tabla de entidades en detalle.

### RF-10 · Búsqueda léxica TF-IDF
El sistema debe mantener un índice invertido TF-IDF en memoria de los documentos procesados y responder búsquedas puntuadas por relevancia, con terminología expandida mediante sinónimos de dominio. **Verif.:** `GET /api/search?q=` y listado por relevancia.

### RF-11 · Búsqueda semántica por embeddings (LSA)
El sistema debe entrenar embeddings locales mediante SVD truncado sobre la matriz términos-documentos ponderada con TF-IDF y recuperar documentos por similitud coseno, permitiendo buscador híbrido léxico-semántico. **Verif.:** `GET /api/search?q=&semantic=1`, `GET /api/system/info` (estadísticas del embedder).

### RF-12 · Consulta en lenguaje natural (chat RAG)
El asistente debe recibir una pregunta en español, detectar la intención (`count`, `money`, `date`, `who`, `cat`, `pending`, `what`), recuperar documentos y fragmentos, y componer una respuesta HTML con citas `[n]`, nivel de confianza y fuentes; debe operar sobre todos los documentos o acotada a uno. **Verif.:** `POST /api/ask`.

### RF-13 · Respuestas agregadas sobre todo el repositorio
Para preguntas generales, el sistema debe agregar todos los documentos cargados usando sus entidades almacenadas: conteo por estado y categoría, sumatoria de montos, fechas, actores, y listado de documentos con pagos pendientes. **Verif.:** intenciones `count`, `money`, `date`, `who`, `pending`.

### RF-14 · Historial y limpieza de conversación
El sistema debe persistir el historial de mensajes por usuario (hasta 200 por usuario, por ámbito de documento o general) y permitir limpiarlo. **Verif.:** `GET /api/chat`, `DELETE /api/chat`.

### RF-15 · Dashboard de indicadores
El sistema debe consolidar métricas: total de documentos, procesados, pendientes, errores, palabras indexadas, entidades, distribución por categoría y formato, actividad de eventos de 14 días, documentos recientes y últimas actividades. **Verif.:** `GET /api/dashboard` y vista "Panel".

### RF-16 · Bitácora de eventos (logs)
Toda acción relevante debe registrarse en la tabla `events` con nivel (`INFO`, `WARN`, `ERROR`), componente, mensaje, usuario y marca temporal; los analistas solo ven sus propios eventos; el admin ve todos y puede limpiar el registro. **Verif.:** `GET /api/events`, `DELETE /api/events`.

### RF-17 · Respaldo y restauración
El sistema debe exportar la información (usuarios sin hashes, repositorios, documentos con metadatos y eventos) en un objeto JSON descargable, y permitir restaurarla (los usuarios se recrean con credencial por defecto y los documentos se referencian como pendientes de re-carga). **Verif.:** `GET /api/backup`, `POST /api/backup/restore`.

### RF-18 · Importación del corpus de prueba
El sistema debe permitir al administrador importar el corpus documental de prueba desde `Documentacion/10_Documentos_Prueba/`, procesando cada archivo, saltando duplicados por nombre y reportando el resumen de resultados. **Verif.:** `POST /api/seed/corpus`, script `npm run seed`.

### RF-19 · Información de sistema
El sistema debe exponer metada técnica (aplicación, versión, versión de Node, directorio del corpus y estado de embeddings). **Verif.:** `GET /api/system/info` (público).

### RF-20 · Protección contra errores de formato y límites
El sistema debe responder con códigos HTTP y estructura JSON `{ok, error:{code,message}}` estandarizados ante validación (400/422), autenticación (401), permisos (403), no encontrado (404), archivo muy grande (413) e interno (500). **Verif.:** manejador global de errores en `server/index.js`.

---

## 6. Requerimientos no funcionales

### RNF-01 · Rendimiento (Prioridad: Alta)
- La carga de la aplicación (SPA) debe responder y las peticiones API de listado y chat deben responder en el rango de cientos de milisegundos en condiciones normales sobre una estación de trabajo local.
- La indexación debe ser incremental (recién procesados) y global al arranque (`Index.rebuild`), con fragmentación por oración para recuperación rápida.
- Los embeddings LSA se calculan sobre un máximo de 3 000 términos y dimensiones ajustables por variable de entorno (`EMBED_DIMS`, `EMBED_MINDF`) para mantener complejidad acotada (SVD truncado aleatorizado).

### RNF-02 · Seguridad (Prioridad: Alta)
- Contraseñas con hash `scrypt` (64 bytes) y sal aleatoria por usuario; nunca en texto plano.
- Sesiones por token aleatorio de 32 bytes; se almacena solo el SHA-256 del token en `sessions`; TTL configurable (`SESSION_TTL_DAYS`, por defecto 7 días).
- Claves de IA solo vía variables de entorno; el archivo `.env` no se versiona (`.env.example` documenta las variables).
- Escape (`esc`) de todo dato inyectado en HTML para prevención de XSS; `express.json({ limit: '2mb' })` limita el cuerpo; límite de subida de 10 MB; nombre de descarga saneado con `sanitizeFilename`.
- Control de acceso por rol en todas las rutas administrativas; la eliminación de documentos solo por el propietario o admin.

### RNF-03 · Disponibilidad (Prioridad: Media)
- Aplicación ejecutable localmente con un solo comando (`npm.cmd start`); servidor web autónomo de archivos estáticos y API.
- Modo de escritura WAL de SQLite para operación concurrente de lectura/escritura.
- Diseño transparente ante ausencia del LLM externo: si la integración falla o no está configurada, el sistema responde con RAG extractivo sin interrupción.

### RNF-04 · Escalabilidad (Prioridad: Media)
- Arquitectura modular por capas (rutas → servicios → NLP → persistencia) que permite sustituir el motor de embeddings por uno remoto o el almacenamiento por uno vectorial sin reescribir la lógica de negocio.
- Índice TF-IDF en memoria con complejidad O(fragmentos) por consulta; límites de contexto configurados (`MAX_TEXT_CHARS` de 300 000 caracteres, corpus de 33 documentos de prueba).

### RNF-05 · Mantenibilidad (Prioridad: Alta)
- Código ES Modules (ESM) organizado por responsabilidad (`routes/`, `services/`, `nlp/`, `test/`).
- Cada módulo NLP documenta su propósito con un encabezado de comentario y justificación técnica.
- Bitácora estructurada para trazabilidad de operaciones; pruebas automatizadas en `node --test` para regresión.
- Estándares de calidad: frontend vanilla JS modular (sin dependencias de UI), backend Express, sin preprocesadores de compilación.

### RNF-06 · Usabilidad (Prioridad: Media)
- Interfaz SPA con rutas hash (`#/panel`, `#/docs`, `#/chat`, etc.) y navegación por roles.
- Asistente con sugerencias rápidas ("chips") por ámbito de consulta y etiquetas de intención/confianza por respuesta.
- Presentación de resultados con resaltado de términos (`<mark>`), citas y fuentes enlazadas al detalle del documento.

---

## 7. Reglas de negocio

| ID | Regla | Implementación |
|---|---|---|
| RN-01 | Solo se aceptan archivos con extensión `pdf`, `docx` o `txt`. | `DocService.create` valida contra `EXT_OK`; rechazo con código `VAL`. |
| RN-02 | El tamaño máximo por archivo es 10 MB. | Validado en `DocService.create` y configuración de multer (`MAX_UPLOAD_MB`). |
| RN-03 | Un documento subido inicia con estado `pendiente` y solo cambia a `procesando`, `procesado` o `error` mediante el pipeline. | Transiciones gestionadas por `processDocument`. |
| RN-04 | Un documento sin contenido legible (p. ej., PDF escaneado) no se procesa y se marca `error` con razón registrada. | Umbral de 20 caracteres significativos tras extracción. |
| RN-05 | El texto indexado se trunca a `MAX_TEXT_CHARS` (300 000 caracteres) para estabilidad del motor. | `pipelineService` aplica el recorte. |
| RN-06 | El repositorio `general` no puede eliminarse; al eliminar otro repositorio sus documentos migran a `general`. | `RepoService.delete`. |
| RN-07 | Solo el propietario de un documento o un administrador pueden eliminarlo. | `DocService.delete` (permiso 403 en caso contrario). |
| RN-08 | Los roles permitidos son `admin` y `analista`; el rol se valida con `CHECK` en base de datos. | Esquema `users.role`. |
| RN-09 | La contraseña mínima es de 6 caracteres; el usuario mínimo es de 3 caracteres; el nombre completo mínimo es de 3 caracteres. | `AuthService.register`. |
| RN-10 | Las sesiones expiran por TTL configurable; los tokens se guardan hasheados (SHA-256). | `middleware.authRequired` + limpieza de sesiones vencidas. |
| RN-11 | Las respuestas del asistente deben citar las fuentes textuales que las sustentan; si no hay evidencia, se responde que no hay información suficiente. | Motor RAG extractivo + prompt del LLM opcional. |
| RN-12 | La integración con IA externa es opcional; sin `AI_API_BASE`/`AI_API_KEY` el sistema opera 100 % local. | `config.ai` + `augmentWithLlm`. |
| RN-13 | En la restauración de respaldos no se restauran hashes de contraseñas (seguridad); los usuarios ausentes se recrean con la credencial por defecto. | `BackupService.restore` + `seedUser`. |
| RN-14 | Los analistas ven únicamente sus propios eventos en la bitácora; el administrador ve todos. | `system.routes GET /events`. |
| RN-15 | El historial de chat por usuario se limita a los últimos 200 mensajes. | `ChatService.push` (DELETE periódico). |
| RN-16 | El corpus de prueba solo se importa una vez por nombre de archivo; los duplicados se omiten y se contabilizan. | `importCorpus` + `DocService.byName`. |

---

## 8. Historias de usuario

Las historias se expresan en el formato estándar "Como… quiero… para…" e incluyen criterios de aceptación verificables.

### HU-01 · Iniciar sesión con seguridad
**Como** administrador del sistema, **quiero** autenticarme con usuario y contraseña y mantener la sesión, **para** operar el sistema sin re-autenticarme en cada acción.
- **Criterios de aceptación:** (1) con credenciales correctas se retorna un token y se muestra el panel; (2) con credenciales incorrectas se muestra error 401; (3) la sesión persiste mientras no expire el TTL y se conserva en `localStorage`.

### HU-02 · Registrar un analista
**Como** administrador, **quiero** crear cuentas de analista, **para** que los gestores documentales accedan con permisos limitados.
- **Criterios de aceptación:** (1) el registro valida longitud de usuario, nombre y contraseña; (2) el usuario se crea con rol `analista`; (3) el usuario no puede repetirse.

### HU-03 · Cargar documentos al repositorio
**Como** gestor documental, **quiero** subir archivos PDF, DOCX o TXT, **para** incorporarlos al repositorio y procesarlos con IA.
- **Criterios de aceptación:** (1) se acepta el archivo y queda en estado `pendiente`; (2) un archivo de formato no permitido es rechazado con mensaje claro; (3) un archivo mayor a 10 MB es rechazado (código 413/`VAL`).

### HU-04 · Clasificar y analizar un documento
**Como** gestor documental, **quiero** procesar un documento y ver su categoría, resumen y entidades, **para** entender su contenido sin leerlo completo.
- **Criterios de aceptación:** (1) tras procesar, el estado es `procesado`; (2) la categoría coincide con la esperada del corpus; (3) el resumen y las entidades se muestran en la vista de detalle.

### HU-05 · Buscar documentos por relevancia
**Como** gestor documental, **quiero** buscar por palabras clave y ver resultados ordenados por relevancia con fragmentos, **para** localizar información rápidamente.
- **Criterios de aceptación:** (1) la búsqueda devuelve documentos con puntaje TF-IDF; (2) los fragmentos se resaltan con `<mark>`; (3) los resultados se enlazan al detalle.

### HU-06 · Consultar en lenguaje natural
**Como** gestor documental, **quiero** preguntar en español ("¿cuánto suman las facturas?") y recibir respuestas citadas, **para** tomar decisiones sin revisar cada documento.
- **Criterios de aceptación:** (1) la intención se detecta y etiqueta; (2) toda respuesta incluye fuentes `[n]` y confianza; (3) ante falta de evidencia se indica que no hay información suficiente.

### HU-07 · Consultar un documento concreto
**Como** gestor documental, **quiero** seleccionar un documento en el chat y preguntar solo sobre su contenido, **para** no mezclarlo con otros documentos.
- **Criterios de aceptación:** (1) se muestra banner con el documento consultado; (2) las respuestas solo citan ese documento; (3) el hilo de conversación se mantiene separado por ámbito.

### HU-08 · Supervisar el panel de indicadores
**Como** administrador, **quiero** ver el estado global del repositorio, **para** monitorear procesamiento, errores y categorías.
- **Criterios de aceptación:** (1) el panel muestra totales, categorías, formatos y actividad; (2) refleja los cambios tras cargar/procesar.

### HU-09 · Auditar mediante bitácora
**Como** administrador, **quiero** revisar el registro de eventos y errores, **para** detectar y corregir fallas de procesamiento.
- **Criterios de aceptación:** (1) los eventos muestran nivel, componente, mensaje y usuario; (2) el admin ve todos y el analista solo los propios.

### HU-10 · Resguardar la información
**Como** administrador, **quiero** exportar e importar el respaldo del repositorio, **para** proteger los metadatos ante incidentes.
- **Criterios de aceptación:** (1) el respaldo genera un JSON estructurado descargable; (2) la restauración recupera repositorios, usuarios y referencias de documentos.

---

## 9. Casos de uso

### UC-01 · Autenticación y control de acceso
- **Actor principal:** Usuario (admin/analista) / visitante.
- **Precondiciones:** El usuario existe.
- **Flujo principal:** (1) El usuario envía credenciales a `POST /api/auth/login`. (2) El sistema valida usuario y hash `scrypt`. (3) El sistema crea la sesión y retorna `{user, token}`. (4) Las peticiones subsiguientes envían `Authorization: Bearer <token>`.
- **Postcondiciones:** Sesión activa con TTL; evento de login registrado.
- **Flujos alternos:** Credenciales incorrectas → 401; sesión expirada → 401 y limpieza del token en el cliente.
- **Extiende:** RF-01, RF-02.

### UC-02 · Carga y validación de documento
- **Actor principal:** Gestor documental.
- **Precondiciones:** Sesión activa; repositorio destino existente.
- **Flujo principal:** (1) El usuario sube el archivo multipart a `POST /api/docs`. (2) El sistema valida extensión, tamaño y persistencia física. (3) Se inserta el registro con estado `pendiente`. (4) Se registra el evento y se retorna el documento.
- **Postcondiciones:** Documento visible en el listado con estado `pendiente`.
- **Flujos alternos:** Extensión no permitida → error `VAL`; tamaño excesivo → error `VAL/413`; sin archivo → 400.
- **Extiende:** RF-04, RN-01, RN-02.

### UC-03 · Procesamiento con inteligencia artificial
- **Actor principal:** Sistema (desencadenado por usuario o corpus).
- **Precondiciones:** Documento en estado `pendiente`; archivo físico disponible.
- **Flujo principal:** (1) Se ejecuta `POST /api/docs/:id/process`. (2) El pipeline extrae contenido (pdf.js/mammoth/fs). (3) Se tokeniza y clasifica. (4) Se genera el resumen analítico. (5) Se extraen entidades. (6) Se indexa TF-IDF y se re-entrenan embeddings. (7) Se persiste el estado `procesado`.
- **Postcondiciones:** Documento consultable en búsqueda, chat y dashboard.
- **Flujos alternos:** Archivo ausente → `error`; texto no legible → `error` con razón; fallo en cualquier paso → `error` y evento `ERROR`.
- **Extiende:** RF-06, RF-07, RF-08, RF-09, RF-10, RF-11.

### UC-04 · Búsqueda y consulta en lenguaje natural
- **Actor principal:** Gestor documental.
- **Precondiciones:** Existen documentos procesados.
- **Flujo principal:** (1) El usuario formula la pregunta en `POST /api/ask`. (2) El sistema normaliza, detecta intención y expande términos. (3) Según intención, se agregan todos los documentos (conteo/sumas/fechas/entidades) o se recuperan los mejor puntuados. (4) Se componen fragmentos citados y fuentes. (5) Se persiste el historial y se responde.
- **Postcondiciones:** Respuesta con `intent`, `conf`, `sources` y `html`; historial actualizado.
- **Flujos alternos:** Sin documentos relacionados → respuesta `none` con sugerencias; consulta acotada por `docId`.
- **Extiende:** RF-12, RF-13, RF-14.

### UC-05 · Administración de usuarios y repositorios
- **Actor principal:** Administrador.
- **Precondiciones:** Rol `admin`.
- **Flujo principal:** (1) El admin lista usuarios o repositorios. (2) Crea/edita roles, restablece contraseñas, elimina usuarios o repositorios. (3) El sistema valida permiso y persiste; la bitácora registra la acción.
- **Postcondiciones:** Acceso y organización actualizados; eventos registrados.
- **Flujos alternos:** El repo `general` no se elimina; un admin no puede eliminarse a sí mismo.
- **Extiende:** RF-02, RF-03, RF-16, RF-18.

### UC-06 · Observabilidad: dashboard, bitácora y respaldo
- **Actor principal:** Administrador (analista en dashboard).
- **Precondiciones:** Sesión activa.
- **Flujo principal:** (1) El usuario consulta `GET /api/dashboard` y los indicadores se consolidan. (2) Consulta eventos de `GET /api/events`. (3) Exporta `GET /api/backup` o restaura `POST /api/backup/restore`.
- **Postcondiciones:** Indicadores actualizados; respaldo generado o aplicado.
- **Flujos alternos:** El analista no ve eventos ajenos; la restauración está restringida a admin.
- **Extiende:** RF-15, RF-16, RF-17, RF-19.

---

## 10. Matriz de trazabilidad inicial y análisis de riesgos

### 10.1 Matriz de trazabilidad objetivo → requerimientos → casos de uso

| Objetivo | RF | HU | UC |
|---|---|---|---|
| OE-01 · Autenticación y roles | RF-01, RF-02 | HU-01, HU-02, HU-08 | UC-01, UC-05 |
| OE-02 · Captura y validación | RF-04, RF-05, RF-20 | HU-03 | UC-02 |
| OE-03 · Pipeline de IA local | RF-06, RF-19 | HU-04 | UC-03 |
| OE-04 · Clasificación automática | RF-07, RF-08, RF-09 | HU-04 | UC-03 |
| OE-05 · Búsqueda semántica y NL | RF-10, RF-11, RF-12, RF-13, RF-14 | HU-05, HU-06, HU-07 | UC-04 |
| OE-06 · Dashboard de indicadores | RF-15 | HU-08 | UC-06 |
| OE-07 · Bitácora y respaldo | RF-16, RF-17, RF-18 | HU-09, HU-10 | UC-06 |
| OE-08 · Pruebas automatizadas | RF-20 | — | — |

### 10.2 Análisis de riesgos

La tabla presenta los riesgos identificados con su categoría, probabilidad (Baja/Media/Alta), impacto (Bajo/Medio/Alto), severidad resultante y el plan de mitigación implementado en el proyecto.

| ID | Riesgo | Categoría | Prob. | Impacto | Mitigación |
|---|---|---|---|---|---|
| R-01 | Baja calidad de texto en PDF escaneados sin OCR | IA | Media | Alto | Detección de contenido ilegible → estado `error` con razón; arquitectura de extracción sustituible. |
| R-02 | Error de clasificación en documentos ambiguos o multicategoría | IA | Media | Medio | Modelo con vocabulario de dominio + probabilidades por categoría visibles; reprocesamiento manual (`/reprocess`). |
| R-03 | Desbordamiento de recursos por documentos muy grandes | Técnico | Baja | Medio | Truncado a `MAX_TEXT_CHARS`; límites de 10 MB; embeddings acotados (max 3 000 términos). |
| R-04 | Fallo en dependedencias de extracción (pdf.js/mammoth) | Técnico | Baja | Medio | Lazy-import con `import()` y fallback del paquete; mensajes de error en bitácora. |
| R-05 | Pérdida de información ante ausencia de respaldo | Operativo | Media | Alto | Módulo de respaldo/restauración JSON; política documentada de backup. |
| R-06 | Exposición de credenciales en el repositorio Git | Seguridad | Media | Crítico | `.env` excluido de Git; `.env.example` documenta variables sin valores; claves solo por entorno. |
| R-07 | Fuga de información entre usuarios | Seguridad | Baja | Alto | Bitácora filtrada por rol; eliminación con control de propiedad; sesiones hasheadas. |
| R-08 | Consultas RAG sin evidencia (alucinación) en modo LLM | IA | Media | Medio | RAG extractivo citado + prompt restrictivo ("no inventes"); sin LLM el sistema es determinista. |
| R-09 | Desviación de alcance académico | Operativo | Media | Medio | Exclusiones documentadas; trazabilidad objetivo→requisito→prueba. |
| R-10 | Indisponibilidad del servicio en localhost | Operativo | Baja | Bajo | Ejecución con un comando; modo WAL; log de arranque claro. |

**Severidad = Probabilidad × Impacto.** Los riesgos R-01, R-05 y R-06 se tratan como críticos y cuentan con mitigación activa (supra).

---

## 11. Glosario

- **RAG (Retrieval-Augmented Generation):** técnica que recupera fragmentos relevantes de un corpus y condiciona la generación (o composición) de la respuesta a ese contexto.
- **TF-IDF:** medida de relevancia de un término en un documento frente al resto del corpus (frecuencia de término × frecuencia inversa de documento).
- **LSA (Latent Semantic Analysis):** reducción dimensional de la matriz términos-documentos vía SVD para capturar relaciones semánticas latentes.
- **Embeddings:** representación vectorial densa de documentos/términos para medir similitud por coseno.
- **Pipeline:** cadena de etapas automáticas de procesamiento de un documento.
- **NER:** extracción de entidades nombradas (fechas, montos, personas, etc.) por patrones.
- **Scrypt:** función de derivación de claves (KDF) usada para el hash de contraseñas.
- **SPA (Single Page Application):** aplicación de una sola página que intercambia vistas sin recargar.
- **Yacente/legacy:** información persistida bajo formatos de codificación anteriores (el sistema usa `parseJson` para desanidar JSON doble-codificado).

---

## 12. Referencias

1. IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 — Ingeniería de requisitos.
2. Pressman, R. (2014). *Ingeniería del Software: un enfoque práctico*. McGraw-Hill.
3. Sommerville, I. (2011). *Ingeniería de Software*. Pearson.
4. Manning, C., Raghavan, P., Schütze, H. (2008). *Introduction to Information Retrieval*. Cambridge University Press.
5. Lewis, D. (1998). *Naive (Bayes) at Forty: The Independence Assumption in Information Retrieval*. ECML.
6. Lewis, S., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. NeurIPS.
7. Documentación oficial de Node.js (`node:sqlite`), Express, pdf.js y mammoth (2026).

---

*Fin del Documento de Análisis — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*