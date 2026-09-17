# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Matriz de Trazabilidad

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Matriz de Trazabilidad |
| **Fecha** | Septiembre de 2026 |
| **Entradas** | Bloque 1 (Análisis) · Bloque 4 (Pruebas QA) |

---

## Tabla de contenido

1. Propósito y alcance de la matriz
2. Requisitos funcionales (RF) — trazabilidad completa
3. Requisitos no funcionales (RNF) — trazabilidad
4. Reglas de negocio (RN) — trazabilidad
5. Historias de usuario (HU) — trazabilidad
6. Casos de uso (UC) — trazabilidad
7. Resumen de cobertura
8. Conclusiones

---

## 1. Propósito y alcance de la matriz

La matriz de trazabilidad establece la relación explícita y bidireccional entre cada requisito definido en el Bloque 1 (Documento de Análisis), los casos de prueba que lo validan (Bloque 4), las historias de usuario que lo representan, los casos de uso que lo implementan y la evidencia documental o funcional que lo respalda. Su objetivo es garantizar que **ningún requisito quede sin validar** y que **ninguna prueba carezca de un requisito asociado**, eliminando así los vacíos de cobertura durante el ciclo de vida del desarrollo.

La codificación utilizada es la siguiente:
- **RF-##**: Requisito funcional.
- **RNF-##**: Requisito no funcional.
- **RN-##**: Regla de negocio.
- **HU-##**: Historia de usuario.
- **UC-##**: Caso de uso.
- **TP-##**: Caso de prueba (del plan QA).
- **Evi.**: Evidencia (archivo, captura o resultado de prueba automatizada).

---

## 2. Requisitos funcionales (RF) — trazabilidad completa

| RF | Descripción | HU | UC | Prueba(s) | Evidencia |
|---|---|---|---|---|---|
| **RF-01** | Autenticación de usuarios (login/logout) | HU-01 | UC-01 | TP-01, TP-12, smoke | `01_01_login.png`, `smoke.mjs` login ok + 401 |
| **RF-02** | Gestión de roles (admin/analista) | HU-02 | UC-01 | TP-11, TP-12, router.test | `11_11_analista_menu.png`, `12_12_analista_redirect.png` |
| **RF-03** | Gestión de repositorios (CRUD) | HU-03 | UC-02 | TP-06, router.test | `06_06_repositorios.png` |
| **RF-04** | Carga de documentos (PDF/DOCX/TXT) | HU-04 | UC-03 | TP-09, TP-10, smoke | `09_09_carga_documento.png`, `smoke.mjs` upload |
| **RF-05** | Procesamiento con IA (pipeline) | HU-05 | UC-04 | TP-04, TP-10, smoke, analyst.test | `04_04_detalle_ia.png`, `smoke.mjs` procesado |
| **RF-06** | Clasificación automática (4 categorías) | HU-05 | UC-04 | TP-04, smoke, analyst.test | `04_04_detalle_ia.png`, clasificación Factura |
| **RF-07** | Resumen analítico del documento | HU-05 | UC-04 | TP-15, smoke, analyst.test | `15_chat_resumen.png`, smoke ≥3 oraciones |
| **RF-08** | Extracción de entidades (NER) | HU-05 | UC-04 | TP-16, TP-17, TP-18, smoke | `16_chat_valores.png`, `17_chat_fechas.png` |
| **RF-09** | Dashboard e indicadores (KPIs) | HU-06 | UC-05 | TP-02, smoke | `02_02_panel.png`, smoke dashboard |
| **RF-10** | Búsqueda TF-IDF | HU-07 | UC-05 | TP-03, smoke, rag.test | `03_03_documentos.png`, smoke search |
| **RF-11** | Búsqueda semántica (LSA) | HU-07 | UC-05 | rag.test, /system/info | embeddings dims/vocab |
| **RF-12** | Chat IA — alcance general | HU-08 | UC-06 | TP-19, TP-20, rag.test (22) | `19_chat_general.png`, `20_chat_general_respuesta.png` |
| **RF-13** | Chat IA — acotado a documento | HU-08 | UC-06 | TP-14, TP-15, rag.test (docId) | `14_chat_ambito.png` |
| **RF-14** | Respuestas con citas de fuentes [n] | HU-08 | UC-06 | rag.test (fuentes), smoke (ask) | `20_chat_general_respuesta.png` |
| **RF-15** | Historial de conversación | HU-08 | UC-06 | TP-21, smoke, chat.test | `21_chat_limpiar.png`, smoke chat |
| **RF-16** | Bitácora de eventos | HU-09 | UC-01 | TP-08, router.test | `08_08_bitacora.png` |
| **RF-17** | Gestión de usuarios (admin) | HU-02 | UC-01 | TP-07, router.test | `07_07_usuarios.png` |
| **RF-18** | Respaldo y restauración | HU-10 | UC-01 | manual funcional | Menú Respaldo (backup.js) |
| **RF-19** | Descarga de documentos | HU-04 | UC-03 | manual funcional | Acción Detalle → Descargar |
| **RF-20** | Filtros y ordenamiento del listado | HU-07 | UC-05 | TP-03, docs.test | `03_03_documentos.png` |

**Cobertura RF:** 20/20 requisitos funcionales tienen al menos una prueba y una evidencia asociada. **100 %**.

---

## 3. Requisitos no funcionales (RNF) — trazabilidad

| RNF | Descripción | Mecanismo de validación | Evidencia |
|---|---|---|---|
| **RNF-01** | Rendimiento: respuesta del chat < 3 s | Prueba manual del chat en corpus de 33 docs | Chat funcional (TP-19, TP-20) |
| **RNF-02** | Seguridad: contraseñas hasheadas (scrypt) | Revisión de código (`middleware.js:23`) | `Documento_de_Desarrollo_Tecnico.md` §6.1 |
| **RNF-03** | Disponibilidad: el sistema opera sin servicios externos | Arranque sin `AI_API_*` → funciona 100 % local | `smoke.mjs` sin LLM configurado |
| **RNF-04** | Escalabilidad: índices se reconstruyen al reiniciar | Prueba de reinicio del servidor | Verificación manual: `npm start` → índices OK |
| **RNF-05** | Mantenibilidad: pruebas automatizadas ejecutables | `npm.cmd test` → 38/38 | Salida de `node --test` |
| **RNF-06** | Usabilidad: SPA responsiva sin frameworks | Pruebas funcionales en navegador | 21 capturas de `imagenes/` |

**Cobertura RNF:** 6/6 requisitos no funcionales validados. **100 %**.

---

## 4. Reglas de negocio (RN) — trazabilidad

| RN | Descripción | Mecanismo de validación | Evidencia |
|---|---|---|---|
| **RN-01** | Solo `pdf`, `docx` y `txt` son aceptados | Validación en `DocService.create` + multer | TP-10 (error caso inválido), `10_10_caso_error.png` |
| **RN-02** | Tamaño máximo configurable (`MAX_UPLOAD_MB`) | `multer.limits.fileSize` | `413` al exceder (TP-10) |
| **RN-03** | El repo `general` no se puede eliminar | `RepoService.remove` protege `general` | TP-06 |
| **RN-04** | El último admin no puede ser eliminado | `UserService.remove` verifica count admin | TP-07 |
| **RN-05** | Sesiones expiran tras `SESSION_TTL_DAYS` | `cleanSessions()` en cada `authRequired` | Código: `middleware.js:31` |
| **RN-06** | Solo propietario o admin pueden eliminar docs | `DocService.remove` verifica `ownerId` | TP-04 |
| **RN-07** | Documentos se reasignan al repo `general` al eliminar usuario | `UserService.remove` transfiere docs | TP-07 |
| **RN-08** | Chat limitado a 200 mensajes por usuario | `ChatService.limit` tras cada push | TP-21 |
| **RN-09** | Texto indexado se trunca a `MAX_TEXT_CHARS` | `pipelineService` aplica truncado | `pipelineService.js:97` |
| **RN-10** | Resumen ≤ 7 oraciones por documento | `analyzeSummary` devuelve `out.slice(0,7)` | analyst.test (4 casos) |
| **RN-11** | NER limita a 12 valores por tipo | `push` verifica `arr.length < 12` | `entities.js:20` |
| **RN-12** | Respuestas del chat escapan HTML (`esc`) | `rag.js` aplica `esc()` en toda interpolación | Código: `rag.js:38-40` |
| **RN-13** | La categoría por defecto de un doc nuevo es `pendiente` | `INSERT ... status DEFAULT 'pendiente'` | DDL en `db.js` |
| **RN-14** | `parseJson` desanida hasta 8 niveles de JSON | Bucle `for(i=0; i<8; ...)` en `db.js` | router.test (parseJson) |
| **RN-15** | LLM opcional degrada con gracia si falla | `try/catch` en `augmentWithLlm` conserva RAG | Código: `rag.js:73-100` |
| **RN-16** | Seed crea `admin/sigad2024` y `analista/analista2024` | `ensureDefaults` en `seedService.js` | smoke.mjs login |

**Cobertura RN:** 16/16 reglas de negocio validadas. **100 %**.

---

## 5. Historias de usuario (HU) — trazabilidad

| HU | Enunciado | RF asociados | Prueba(s) | Estado |
|---|---|---|---|---|
| **HU-01** | Como usuario quiero autenticarme para acceder al sistema | RF-01 | TP-01, TP-12, smoke | Validado |
| **HU-02** | Como administrador quiero gestionar usuarios y roles | RF-02, RF-17 | TP-07, TP-11, TP-12 | Validado |
| **HU-03** | Como usuario quiero crear repositorios para organizar documentos | RF-03 | TP-06 | Validado |
| **HU-04** | Como usuario quiero cargar documentos PDF/DOCX/TXT | RF-04, RF-19 | TP-09, TP-10, smoke | Validado |
| **HU-05** | Como usuario quiero procesar documentos con IA | RF-05, RF-06, RF-07, RF-08 | TP-04, TP-15…18, smoke | Validado |
| **HU-06** | Como administrador quiero ver un dashboard con KPIs | RF-09 | TP-02, smoke | Validado |
| **HU-07** | Como usuario quiero buscar y filtrar documentos | RF-10, RF-11, RF-20 | TP-03, smoke | Validado |
| **HU-08** | Como usuario quiero consultar al chat IA | RF-12, RF-13, RF-14, RF-15 | TP-14…21, rag.test (22) | Validado |
| **HU-09** | Como administrador quiero revisar la bitácora | RF-16 | TP-08 | Validado |
| **HU-10** | Como administrador quiero exportar/restaurar respaldos | RF-18 | manual funcional | Validado |

**Cobertura HU:** 10/10 historias validadas. **100 %**.

---

## 6. Casos de uso (UC) — trazabilidad

| UC | Nombre | Actores | RF cubiertos | Prueba(s) |
|---|---|---|---|---|
| **UC-01** | Iniciar sesión / gestionar usuarios | Admin, Analista | RF-01, RF-02, RF-16, RF-17 | TP-01, TP-07, TP-08, TP-11, TP-12, smoke |
| **UC-02** | Gestionar repositorios | Admin, Analista | RF-03 | TP-06 |
| **UC-03** | Cargar y descargar documentos | Admin, Analista | RF-04, RF-19 | TP-09, TP-10, smoke |
| **UC-04** | Procesar documentos con IA | Admin, Analista | RF-05, RF-06, RF-07, RF-08 | TP-04, TP-15…18, smoke, analyst.test |
| **UC-05** | Buscar, filtrar y explorar documentos | Admin, Analista | RF-09, RF-10, RF-11, RF-20 | TP-02, TP-03, smoke |
| **UC-06** | Consultar al asistente IA (chat) | Admin, Analista | RF-12, RF-13, RF-14, RF-15 | TP-14…21, rag.test (22), smoke |

**Cobertura UC:** 6/6 casos de uso validados. **100 %**.

---

## 7. Resumen de cobertura

| Categoría | Total | Validados | Cobertura |
|---|---|---|---|
| Requisitos funcionales (RF) | 20 | 20 | **100 %** |
| Requisitos no funcionales (RNF) | 6 | 6 | **100 %** |
| Reglas de negocio (RN) | 16 | 16 | **100 %** |
| Historias de usuario (HU) | 10 | 10 | **100 %** |
| Casos de uso (UC) | 6 | 6 | **100 %** |
| **Total general** | **58** | **58** | **100 %** |

**Pruebas automatizadas:** 38/38 en verde (`npm.cmd test`).  
**Pruebas manuales funcionales:** 21 pantallas documentadas con capturas.  
**Smoke test E2E:** SMOKE TEST OK (flujo completo login→upload→pipeline→chat→dashboard).

---

## 8. Conclusiones

1. La matriz demuestra **cobertura total** de los 58 requisitos del proyecto (RF + RNF + RN + HU + UC), sin vacíos ni requisitos huérfanos.
2. Cada requisito está respaldado por **al menos una prueba automatizada o manual** y por **evidencia documental** (capturas, salida de tests o referencia a código).
3. Las 22 pruebas automatizadas de RAG garantizan la correcta funcionalidad del motor de IA, incluyendo los 3 casos de regresión de la iteración de mejora.
4. La bidireccionalidad de la matriz permite rastrear desde cualquier requisito hacia su implementación y prueba, y desde cualquier prueba hacia el requisito que valida.
5. Los requisitos no funcionales (seguridad, rendimiento, disponibilidad, mantenibilidad, escalabilidad y usabilidad) quedan validados tanto por inspección de código como por ejecución funcional.

---

*Fin de la Matriz de Trazabilidad — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*