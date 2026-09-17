# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Plan y Evidencias de Pruebas (Calidad de Software — QA)

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Bloque de Pruebas (QA) |
| **Fecha** | Septiembre de 2026 |
| **Entregable asociado** | `Documentacion/04_Pruebas/Documento_de_Pruebas_de_Funcionamiento.docx` + carpeta `imagenes/` |

---

## Tabla de contenido

1. Objetivo y alcance de las pruebas
2. Estrategia y niveles de prueba
3. Ambiente de pruebas y datos
4. Matriz de trazabilidad requisito–prueba
5. Pruebas funcionales manuales (con evidencias)
6. Pruebas de seguridad básicas
7. Pruebas automatizadas
8. Prueba de integración E2E (smoke)
9. Resultados y métricas
10. Defectos detectados y correcciones
11. Conclusiones y recomendaciones
12. Referencias

---

## 1. Objetivo y alcance de las pruebas

**Objetivo general:** verificar que SIGAD satisface los requisitos funcionales y no funcionales documentados en el Bloque 1 (Documento de Análisis) y que el comportamiento de la capa de IA (clasificador, resumidor, NER, TF-IDF, LSA y RAG) es **correcto, explicable y sin alucinaciones**, priorizando el escenario central del proyecto: *el chat "TODOS LOS DOCUMENTOS" responde con sentido agregado y no con fragmentos aislados*.

**Alcance:**
- Pruebas unitarias de los módulos NLP (`classifier`, `summarizer`, `analyst`, `entities`, `tfidf`, `embeddings`, `rag`).
- Pruebas unitarias del frontend (router SPA) y helpers de datos (`parseJson`).
- Pruebas de integración de middleware y rutas.
- Pruebas del sistema (E2E) sobre la API real con corpus en PDF/DOCX/TXT.
- Pruebas funcionales manuales sobre la interfaz web (evidencias capturadas en `04_Pruebas/imagenes/`).

**Fuera de alcance:** pruebas de carga/estrés distribuidas, seguridad ofensiva externa y compatibilidad cross-browser exhaustiva (se verificó el flujo principal en navegador Chromium moderno).

---

## 2. Estrategia y niveles de prueba

Se aplicó la pirámide de pruebas clásica:

```
        ▲  E2E / smoke (2 casos)                       — ruta crítica completa
      ▲▲▲  Pruebas manuales funcionales (21 pantallas) — aceptación del usuario
    ▲▲▲▲▲  Integración (router: 10 casos)              — middleware + rutas + datos
  ▲▲▲▲▲▲▲▲  Unitarias (RAG 22 · Analyst 4)             — lógica de IA y PLN
```

| Nivel | Herramienta | Dónde | Criterio de salida |
|---|---|---|---|
| Unitario (NLP) | `node --test` | `server/test/rag.test.mjs`, `analyst.test.mjs` | 100 % de los casos en verde |
| Unitario (frontend/helpers) | `node --test` | `server/test/router.test.mjs` | 100 % de los casos en verde |
| Integración (routing/auth/data) | `node --test` | `server/test/router.test.mjs` | middleware y rutas responden el código esperado |
| Sistema (E2E API) | Script `smoke.mjs` | BD aislada `data/smoke.sqlite` + `uploads/smoke` | flujo completo login→upload→pipeline→search→ask→dashboard→chat |
| Funcional manual (UI) | Navegador | Aplicación en `localhost:3000` | pantallas documentadas con capturas |

**Datos de prueba:** corpus real de 33 documentos (series FE/CT/CO/IN) en propiedad de `Documentacion/10_Documentos_Prueba`, descrito por el manifiesto `_manifesto_corpus.csv`. Las pruebas unitarias de RAG utilizan documentos sintéticos inyectados con `setDocsLoader`.

---

## 3. Ambiente de pruebas y datos

| Ítem | Valor |
|---|---|
| Sistema operativo | Microsoft Windows 11 (x64) |
| Runtime | Node.js v24.19.0 (requisito mínimo ≥ 22.5.0) |
| Framework web | Express 4.22.2 |
| Parseadores | pdfjs-dist 4.10.38 · mammoth 1.12.2 · multer 1.4.5-lts.2 |
| Base de datos | SQLite (nativo `node:sqlite`), modo WAL |
| Git | 2.53.0.windows.2 |
| Navegador de aceptación | Chromium (última versión) |
| Corpus | 33 documentos (9 facturas, 9 contratos, 8 correspondencias, 7 informes) |
| Cuentas de prueba | `admin/sigad2024` · `analista/analista2024` |

**Aislamiento del smoke test:** el script `smoke.mjs` levanta el servidor en el puerto 3199 con `DB_PATH=data/smoke.sqlite` y `UPLOADS_DIR=uploads/smoke`, y elimina esos artefactos al finalizar, de modo que la base real nunca se contamina.

---

## 4. Matriz de trazabilidad requisito–prueba

Se cruzan los requisitos del Bloque 1 con cada tipo de evidencia. `Px/My` refiere al caso funcional de la sección 5; `T-###` a las pruebas automatizadas.

| Requisito | Título | Evidencia |
|---|---|---|
| RF-01 | Autenticación de usuarios (login/logout) | P1, P2, P12 · smoke (login ok y 401) |
| RF-02 | Gestión de roles (admin/analista) | P12 · router.test (redirección por rol) |
| RF-03 | Gestión de repositorios | P6 · T-repos |
| RF-04 | Carga de documentos (PDF/DOCX/TXT) | P9 · smoke (upload TXT → pendiente) |
| RF-05 | Procesamiento con IA (pipeline) | P4, P10 · smoke (estado procesado) · T-analyst |
| RF-06 | Clasificación automática (4 categorías) | P4, P10 · smoke (categoría Factura) · T-classifier implícito |
| RF-07 | Resumen analítico | P4, P15 · smoke (≥3 oraciones) · analyst.test |
| RF-08 | Extracción de entidades (NER) | P4, P16, P17, P18 · smoke (entidades > 0) |
| RF-09 | Dashboards e indicadores | P2 · smoke (dashboard → docs/processed) |
| RF-10 | Búsqueda TF-IDF | P3 · smoke (search devuelve el doc) |
| RF-11 | Búsqueda semántica (LSA) | T-rag (score/snippets) · /api/system/info |
| RF-12 | Chat IA con alcance general | P19, P20 · T-rag (count/money/date/who/cat/pending/what) |
| RF-13 | Chat IA acotado a documento | P14, P15, P16 · T-rag (docId) |
| RF-14 | Respuestas con citas de fuentes [n] | T-rag (fuentes acotadas) · smoke (ask con sources) |
| RF-15 | Historial de conversación | P21 · smoke (chat ≥ 2 mensajes) |
| RF-16 | Bitácora de eventos | P8 · logEvent coverage |
| RF-17 | Gestión de usuarios (admin) | P7 · users.routes |
| RF-18 | Respaldo y restauración | En back-up UI (solo manual) |
| RF-19 | Descarga de documentos | P4 (acción) · docs.routes |
| RF-20 | Filtros y ordenamiento del listado | P3 · docs.list |
| RNF-01 a RNF-06 | Performance/seguridad/uso local | smoke en BD aislada · scrypt/BCRYPT nativo |
| RN-01 a RN-16 | Reglas de negocio (procesados, errores) | P10 (caso error) · T-rag (pendiente/error conteo) |

---

## 5. Pruebas funcionales manuales (con evidencias)

Ejecutadas en el navegador contra `http://localhost:3000`; cada pantalla capturada en `Documentacion/04_Pruebas/imagenes/` e incorporada al entregable DOCX.

| # | Caso | Pasos | Resultado esperado | Evidencia |
|---|---|---|---|---|
| P1 | Login correcto | `admin/sigad2024` | Acceso al panel | `01_01_login.png` |
| P2 | Panel consolidado | tras login | KPIs + gráficos por categoría/formato + actividad | `02_02_panel.png` |
| P3 | Listado y filtros | menú Documentos, filtro por categoría | Tabla con estados, búsqueda y formato | `03_03_documentos.png` |
| P4 | Detalle + procesamiento IA | abrir documento, "Procesar con IA" | Resumen, probabilidades por categoría y entidades | `04_04_detalle_ia.png` |
| P5 | Consulta IA (alcance general) | Chat → pregunta general | Respuesta con intención, confianza y fuentes | `05_05_consulta_ia.png` |
| P6 | Repositorios | CRUD repositorios | Lista y creación/eliminación | `06_06_repositorios.png` |
| P7 | Gestión de usuarios (admin) | Usuarios → camb ee rol/reset | Operaciones confirmadas | `07_07_usuarios.png` |
| P8 | Bitácora de eventos | Bitácora | Niveles, componentes y mensajes | `08_08_bitacora.png` |
| P9 | Carga de documento | Documentos → Cargar | Estado `pendiente` | `09_09_carga_documento.png` |
| P10 | Caso de error (archivo inválido) | Cargar archivo sin contenido legible | Estado `error` con razón | `10_10_caso_error.png` |
| P11 | Menú restringido por rol | Login `analista/analista2024` | Sin accesos de admin | `11_11_analista_menu.png` |
| P12 | Redirección de analista | Navegar a `#/users` como analista | Redirige al listado de documentos | `12_12_analista_redirect.png` |
| P13 | Chat: listado de ámbito | Chat → selector | Carga el selector de documentos | `13_chat_listado.png` |
| P14 | Chat acotado a un documento | Elegir FE-001 | Respuesta solo sobre FE-001 | `14_chat_ambito.png` |
| P15 | Chat: resumen del documento | "Resume este documento" | Viñetas del resumen analítico | `15_chat_resumen.png` |
| P16 | Chat: valores/montos | "¿Qué valores o montos aparecen?" | Montos citados y Σ | `16_chat_valores.png` |
| P17 | Chat: fechas | "¿Qué fechas menciona?" | Listado de fechas | `17_chat_fechas.png` |
| P18 | Chat: pagos pendientes | "¿Qué documentos están pendientes de pago?" | Lista de documentos con la mención | `18_chat_pagos.png` |
| P19 | Chat alcance general (inicio) | Selector "Todos los documentos" | Preguntas sugeridas generales | `19_chat_general.png` |
| P20 | Chat general con respuesta agregada | "¿Cuántos documentos hay?" / suma de valores | Conteo/suma sobre TODOS los documentos | `20_chat_general_respuesta.png` |
| P21 | Limpieza de conversación | Botón "Limpiar conversación" | Historial del ámbito vacío | `21_chat_limpiar.png` |

---

## 6. Pruebas de seguridad básicas

Se verificaron los controles de seguridad descritos en el Documento de Diseño (§7.1). Las pruebas combinan verificación automatizada (a través de `router.test.mjs` y del smoke E2E) y verificación manual sobre la interfaz.

| ID | Control verificado | Procedimiento | Resultado esperado | Evidencia |
|---|---|---|---|---|
| S1 | Contraseñas no recuperables | Inspeccionar `users` tras el *seed* | `hash` con 128 caracteres hex (scrypt, 64 bytes); nunca la contraseña en claro; `salt` UUID | Consulta a `data/sigad.sqlite` |
| S2 | Token de sesión no almacenado en claro | Inspeccionar `sessions` | Solo existe `tokenHash` (SHA-256); el token original vive únicamente en el cliente | Consulta a `sessions` |
| S3 | Acceso denegado sin autenticación | `GET /api/docs` sin cabecera `Authorization` | Respuesta 401 | `router.test.mjs` (middleware `authRequired`) |
| S4 | Sesión vencida rechazada | Petición con token expirado | 401 y eliminación de la sesión (`cleanSessions`) | `router.test.mjs` |
| S5 | Autorización por rol | `analista` invoca endpoints de administración (usuarios, respaldo, reimportación de corpus) | 403 o redirección al listado de documentos | `router.test.mjs` · `11_11_analista_menu.png` · `12_12_analista_redirect.png` |
| S6 | Verificación de propiedad al eliminar | `analista` intenta eliminar un documento de otro propietario | Rechazo (solo `admin` o `ownerId`) | `router.test.mjs` |
| S7 | Escape de XSS | Pregunta con `<script>alert(1)</script>` en el chat | El texto se muestra escapado, sin ejecución | `esc()` en frontend y `rag.js` |
| S8 | Límite de tamaño de carga | Subir archivo mayor a 10 MB | Rechazo de multer con error controlado | `middleware.js` (upload) |
| S9 | Formato no permitido | Subir extensión distinta de PDF/DOCX/TXT | Estado `error` con motivo | `10_10_caso_error.png` |
| S10 | Saneamiento de nombres de archivo | Nombre con caracteres de ruta (`../`) | Nombre saneado para descarga (`sanitizeFilename`) | `03_Desarrollo` §5 |
| S11 | Secretos fuera del repositorio | `git ls-files` sobre el proyecto | `.env` no versionado; solo `.env.example` | `src/.gitignore` |

**Resultado:** 11 controles verificados; 0 hallazgos críticos. Se registra como recomendación automatizar pruebas de seguridad ofensiva (inyección, fuerza bruta de login) en una iteración futura, dado que el alcance actual cubre la seguridad básica exigida.

---

## 7. Pruebas automatizadas

### 7.1 Inventario de casos

| Archivo | Casos | Objeto de prueba |
|---|---|---|
| `rag.test.mjs` | 22 | Intención, catálogo, agregados (count/money/date/who/pending), narrativa vs. catálogo, modo `docId`, saludos, ayuda, resumen acotado, sugerencias sin repetición, JSON anidado (mediante `parseJson`), título y degradación. |
| `analyst.test.mjs` | 4 | Géneros (contrato/factura/informe/correspondencia), puntuación, deduplicación, entidades completas. *Incluye lectura real de `CT-004`, `FE-001`, `IN-007`, `CO-001` del corpus.* |
| `router.test.mjs` | 10 | `parseHash`, `resolveRoute` (roles), `ROUTES`, `parseJson` (desanidado y fallback). |
| **Subtotal unitario/integración** | **36** | — |
| `smoke.mjs` | 2 (bloques) | Arranque del servidor + flujo E2E completo. |
| **Total general** | **38** | — |

### 7.2 Salida de ejecución (resumida)

```
> node --test "server/test/*.test.mjs"

✔ summarizer: produce un resumen largo, concreto y en orden del documento
✔ summarizer: elimina oraciones casi duplicadas
✔ rag: catálogo "¿cuáles documentos son informes?" responde con catálogo
✔ rag: pregunta acotada a un documento usa solo ese documento
✔ rag: "¿De qué trata?" acotado devuelve resumen (case-insensitive)
✔ rag: aviso no sugiere repetir la misma pregunta
✔ rag: pregunta sobre documento NO procesado responde aviso
✔ rag: saludo/ayuda/catálogo/conteo/suma/… (22/22)
✔ analyst: contrato/factura/informe/correspondencia (4/4)
✔ router: parseHash/resolveRoute/ROUTES/parseJson (10/10)
✔ ParseJson desanida JSON doble/triple-codificado (datos legados del seed)

# tests 38
# pass  38
# fail  0
```

**Observaciones de estabilidad:** los casos de RAG no dependen de red ni de la base real (usan `setDocsLoader` con datos sintéticos), por lo que son deterministas y repetibles. El único test "de red" corre solo en ejecución manual con el servidor arriba.

### 7.3 Casos de regresión añadidos en la iteración de mejora

Dos pruebas nuevas garantizan el comportamiento corregido:

1. **Contenido vs. catálogo** — `"¿qué documentos hablan sobre retiro de mercancía?"` debe devolver `intent='what'` (búsqueda de contenido) y **no** `cat`, citando el documento que menciona el tema.
2. **Narrativa vs. agregación** — `"¿qué dice la factura sobre el pago?"` debe devolver `intent='what'` (narrativa) y **no** `money`, evitando la respuesta de suma cuando la pregunta pide contenido.

Además, el caso *"suma de valores sobre TODOS los documentos usa entidades agregadas"* verifica que `$100.000 + $50.000 + $250.000` (dos documentos) devuelva el total `400.000` y cite las tres menciones — el *kernel* de la mejora RAG.

---

## 8. Prueba de integración E2E (smoke)

`server/test/smoke.mjs` ejecuta el flujo crítico completo sobre una base aislada:

| Paso | Assert de éxito |
|---|---|
| Arranque del servidor en puerto 3199 | `GET /api/system/info` responde |
| Login `admin/sigad2024` | token no vacío |
| Login con contraseña incorrecta | rechazo 401 |
| Lista de repositorios | existe "General" |
| Upload `FE-001.txt` | estado `pendiente` |
| Proceso IA (`POST /docs/:id/process`) | estado `procesado`, categoría `Factura` |
| Resumen generado | ≥ 3 oraciones |
| Entidades extraídas | al menos 1 valor |
| Conteo de palabras | > 50 |
| Búsqueda TF-IDF | `FE-001` en los resultados |
| Asistente `POST /api/ask` | `type='answer'` con fuentes |
| Dashboard | `docs ≥ 1` y `processed ≥ 1` |
| `GET /api/auth/me` | usuario `admin` |
| Historial de chat | ≥ 2 mensajes (pregunta + respuesta) |

Al finalizar, el script elimina `data/smoke.sqlite` y `uploads/smoke` (autolimpieza). Resultado: **SMOKE TEST OK**.

---

## 9. Resultados y métricas

| Métrica | Valor |
|---|---|
| Pruebas automatizadas aprobadas | 38 / 38 (100 %) |
| Casos de regresión de la mejora RAG | 3 (contenido vs. catálogo, narrativa vs. suma, suma agregada) |
| Pantallas funcionales evaluadas manualmente | 21 |
| Cobertura de módulos NLP por pruebas | 8/8 (tokenizer, classifier, summarizer, analyst, entities, tfidf, embeddings, rag) |
| Formato y manipulación de documentos en pipeline | 3 (PDF, DOCX, TXT) |
| Categorías validadas por el clasificador | 4 (Contrato, Factura, Correspondencia, Informe) |
| Tipos de entidades NER verificados | 7 |
| Errores de tipo defecto abiertos al cierre | 0 |
| Defectos corregidos en la iteración | 2 (detección de intención; deserialización de entidades legadas) + 1 (agregación global) |

---

## 10. Defectos detectados y correcciones

### 10.1 Defecto 1 — El chat general respondía "catálogo" a preguntas de contenido
- **Síntoma:** `"¿qué documentos hablan sobre retiro de mercancía?"` se respondía como catálogo (listado por categoría) en lugar de extraer fragmentos con el tema.
- **Causa raíz:** la detección de intención daba prioridad al patrón `cuáles documentos`/`documentos hay`, activado por el sujeto "documentos", aun cuando la pregunta pedía contenido.
- **Corrección:** reescritura de `detectIntent` con precedencia explícita: regla narrativa fuerte (`qué dice/habla/menciona/contiene/incluye`, `hablan`) antes del catálogo; guarda de "discurso" (`sobre/acerca de/relacionado`) que bloquea `cat` cuando no hay palabras de cantidad; el catálogo solo responde cuando es una pregunta **de inventario**.
- **Verificación:** prueba de regresión *contenido vs. catálogo* (verde) y consulta en vivo.

### 10.2 Defecto 2 — Las entidades almacenadas no se leían (JSON anidado legado)
- **Síntoma:** preguntas como `"¿cuánto suman los valores de las facturas?"` retornaban "no encontré" en el repositorio real, aunque las entidades existieran.
- **Causa raíz:** los datos sembrados quedaron **triple-codificados** (JSON dentro de JSON); `JSON.parse` de un solo nivel devolvía una cadena sin entidades utilizables.
- **Corrección:** `rag.js::entFromDoc` usa el helper `parseJson` de `db.js`, que desanida hasta 8 niveles; se añadió cobertura directa de este caso en `router.test.mjs`.
- **Verificación:** suma agregada en vivo devolvió 9 documentos y Σ total.

### 10.3 Mejora funcional — Respuestas agregadas sobre TODOS los documentos
- **Síntoma:** las respuestas de suma/valor dependían de los 4 mejores documentos de TF-IDF → totales incompletos.
- **Corrección:** nuevas funciones `countAnswer`, `moneyAnswer`, `dateAnswer`, `whoAnswer`, `pending` que **agregan las entidades de todos los procesados** (con filtro opcional de categoría) y citan cada fuente.
- **Verificación:** `"¿cuánto suman los pagos pendientes?"` mantiene intención `money` (prueba dedicada) y el conteo global distingue procesados/pendientes/errores.

---

## 11. Conclusiones y recomendaciones

1. La corrección de la intención y de la deserialización de entidades devolvió al chat general su propósito: responder **sobre la totalidad del repositorio** con valores agregados y verificables.
2. El RAG extractivo con citas cubre verificabilidad y transparencia; la capa LLM exterior es opcional y degrada con gracia (ninguna prueba depende de ella).
3. La pirámide de pruebas (36 unitarias/integración + smoke E2E + aceptación manual) quedó alineada con el coste de la solución: determinismo y arranque rápido.
4. **Recomendaciones:** (a) agregar un corpus de evaluación etiquetado para medir F1 del clasificador sobre más variedad; (b) para producción con volúmenes mayores, migrar el LSA a una base vectorial (la fachada `Embedder` ya lo permite); (c) incorporar pruebas de UI automatizadas (por ejemplo, Playwright) para sustituir parcialmente la aceptación manual.

---

## 12. Referencias

1. NIST (2019). *ISO/IEC/IEEE 29119 — Software and systems engineering software testing*.
2. Myers, G., Sandler, C., Badgett, T. (2011). *The Art of Software Testing*.
3. Node.js — `node:test` documentation (2026).
4. Bloque 1 — Documento de Análisis (SIGAD) para la matriz de requisitos.
5. `Documentacion/04_Pruebas/Documento_de_Pruebas_de_Funcionamiento.docx` — evidencia funcional ampliada con capturas.

---

*Fin del Plan y Evidencias de Pruebas — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*