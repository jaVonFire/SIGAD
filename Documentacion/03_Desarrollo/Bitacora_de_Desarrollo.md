# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Bitácora de Desarrollo

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Registro de avances de desarrollo |
| **Fecha** | Septiembre de 2026 |
| **Repositorio** | Git — rama `main` |

---

## Tabla de contenido

1. Propósito de la bitácora
2. Metodología de trabajo
3. Resumen del historial de versiones (Git)
4. Bitácora cronológica de sesiones
5. Decisiones técnicas registradas
6. Incidencias y correcciones
7. Estado actual y trabajo pendiente
8. Conclusiones

---

## 1. Propósito de la bitácora

Este documento cumple el requisito **6.3 de la fase de Desarrollo** —"Registro de avances o bitácora de desarrollo"— del proyecto integrador. Su objetivo es dejar constancia verificable del proceso constructivo de SIGAD: qué se hizo, cuándo, con qué artefactos y bajo qué decisiones, de forma trazable con el historial de Git del repositorio.

La bitácora complementa al `Documento_de_Desarrollo_Tecnico.md` (que describe *cómo está construido* el sistema) documentando *cómo se construyó* y *en qué orden*.

## 2. Metodología de trabajo

- **Enfoque:** desarrollo iterativo e incremental, con entregas funcionales al cierre de cada jornada.
- **Control de versiones:** Git en la rama `main`; cada avance relevante se registró como un *commit* con mensaje descriptivo.
- **Verificación por iteración:** cada avance se validó con pruebas automatizadas (`node --test`) y/o smoke test E2E antes de consolidarse.
- **Documentación viva:** la documentación de las cinco fases se construyó en paralelo al código y se sincronizó con el estado real del sistema.
- **Uso de IA generativa:** empleada como apoyo para redacción y contraste de la documentación, siempre revisada y validada contra el código real (conforme a las condiciones académicas del proyecto).

## 3. Resumen del historial de versiones (Git)

Historial real de la rama `main` (comando `git log --reverse --stat`):

| # | Commit | Fecha | Descripción | Archivos |
|---|---|---|---|---|
| 1 | `f1f7571` | 2026-09-11 13:41 | Initial Project | 110 |
| 2 | `f2c2641` | 2026-09-11 13:43 | Test Files UPLOAD | 9 |
| 3 | `dd32aa3` | 2026-09-11 13:43 | Final Test File | 1 |
| 4 | `bc36494` | 2026-09-11 14:46 | Chat IMPROVES | 15 |
| 5 | `7de6974` | 2026-09-11 14:56 | Deleted File | 1 |
| 6 | `0200378` | 2026-09-11 15:00 | Eliminación del PDF | 1 |
| 7 | `b933fd4` | 2026-09-17 12:31 | Re-organitazion PROJECT | 128 |
| 8 | `26a13aa` | 2026-09-17 18:02 | Documentation FINISHED | 38 |

**Cómo comprobarlo:** `git log --reverse --stat --oneline`

## 4. Bitácora cronológica de sesiones

### Sesión 1 — 11 de septiembre de 2026 (mañana): núcleo funcional

**Objetivo:** construir la base del sistema y dejarlo ejecutable de extremo a extremo.

Actividades realizadas:
1. Estructuración inicial del proyecto (`src/server`, `src/public`) con arquitectura limpia modular.
2. Implementación de la capa de persistencia con `node:sqlite` (DatabaseSync) y las tablas `users`, `repos`, `docs`, `sessions`, `events`, `chat`.
3. Autenticación con `scrypt` y sesiones con token opaco + digest SHA-256.
4. Rutas REST base (`auth`, `users`, `repos`, `docs`) y frontend SPA mínimo.
5. Pipeline de IA: extracción (pdfjs-dist / mammoth / fs), tokenización, clasificador Naive Bayes, resumen extractivo y NER por patrones.
6. Commit `f1f7571` — *Initial Project* (110 archivos).

**Resultado:** sistema ejecutable en `http://localhost:3000` con login, carga, procesamiento y listado.

### Sesión 2 — 11 de septiembre de 2026 (mediodía): corpus de prueba

**Objetivo:** disponer de un repositorio documental suficiente para probar la IA.

Actividades realizadas:
1. Generación del corpus sintético de 33 documentos en tres formatos (TXT, PDF, DOCX) y cuatro categorías (factura, contrato, correspondencia, informe), mediante `src/tools/generate_corpus.py`.
2. Manifiesto del corpus `_manifesto_corpus.csv` con la distribución por serie (FE/CT/CO/IN).
3. Commits `f2c2641` (*Test Files UPLOAD*) y `dd32aa3` (*Final Test File*).

**Resultado:** corpus de 33 documentos que supera el mínimo de 30 exigido.

### Sesión 3 — 11 de septiembre de 2026 (tarde): iteración de mejora del chat RAG

**Objetivo:** corregir y ampliar la consulta en lenguaje natural.

Actividades realizadas:
1. Corrección de la detección de intención (diferenciar consultas narrativas de catálogo y de suma).
2. Corrección de la lectura de entidades almacenadas (desanidado de JSON legado, `parseJson`).
3. Implementación de respuestas agregadas sobre **todos** los documentos (no solo los 4 mejores por TF-IDF).
4. Añadido de endpoints de historial y limpieza de conversación, y chat acotado a un documento (`docId`).
5. Commit `bc36494` — *Chat IMPROVES* (15 archivos), seguido de `7de6974` (*Deleted File*) y `0200378` (*Eliminación del PDF*) de limpieza.

**Resultado:** chat con intenciones `count/money/date/who/what/cat/pending`, citas `[n]` y fuentes verificables.

### Sesión 4 — 17 de septiembre de 2026: reorganización y cierre documental

**Objetivo:** ordenar la entrega completa y generar la documentación de las cinco fases.

Actividades realizadas:
1. Reorganización de la carpeta `Documentacion/` en las once subcarpetas del entregable (análisis, diseño, desarrollo, pruebas, implementación, manuales, matriz, base de datos, corpus, presentación).
2. Redacción de los documentos de Análisis, Diseño, Desarrollo, Pruebas, Implementación, Manual de Usuario, Manual Técnico y Manual de Administración.
3. Matriz de trazabilidad de requisitos, funcionalidades y pruebas (`08_Matriz_Trazabilidad`).
4. Commit `b933fd4` — *Re-organitazion PROJECT* (128 archivos).
5. Consolidación de la documentación y generación de los entregables DOCX; commit `26a13aa` — *Documentation FINISHED* (38 archivos).

**Resultado:** entrega documental en las cinco fases con trazabilidad.

### Sesión 5 — 17 de septiembre de 2026 (cierre): complementos de diseño y datos

**Objetivo:** cerrar los huecos detectados en la verificación contra la guía del docente.

Actividades realizadas:
1. Corrección de la ruta de salida de `src/tools/diagrams.py` y generación de las **8 imágenes** de diseño (arquitectura, casos de uso, componentes, despliegue, dos de secuencia, MER y flujo) en `Documentacion/02_Diseno/imagenes/`.
2. Incrustación de las 8 figuras en el `Documento_de_Diseno.md` (sección 8).
3. Creación del script reproducible de base de datos `Documentacion/09_Base_Datos/db.sql` (DDL completo + índices), verificado contra SQLite.
4. Elaboración de la presente bitácora de desarrollo.
5. Añadido de la sección de pruebas de seguridad (Pruebas) y del plan de mantenimiento (Implementación).
6. Corrección de numerales y regeneración de los entregables DOCX afectados.

**Resultado:** documentación sin huecos frente a la guía del proyecto.

## 5. Decisiones técnicas registradas

| # | Decisión | Alternativas evaluadas | Justificación |
|---|---|---|---|
| D1 | SQLite nativo (`node:sqlite`) | PostgreSQL, MySQL, LowDB | Cero configuración, un solo archivo, transaccional y WAL; suficiente para el alcance |
| D2 | SPA en JavaScript vanilla | React, Vue, Angular | Sin *build step* ni dependencias de compilación; despliegue reproducible |
| D3 | IA 100 % local (Bayes + TF-IDF + LSA + RAG) | API de LLM como núcleo | Privacidad de los documentos, costo cero y funcionamiento sin red |
| D4 | LLM externo **opcional** (degradación controlada) | Dependencia obligatoria de API | Mejora la redacción sin comprometer el funcionamiento base |
| D5 | Resumen extractivo + analítico | Resumen abstractivo puro | Evita alucinaciones; toda afirmación se sustenta en el texto |
| D6 | Llaves en `.env` no versionado | Credenciales en el código | Cumplimiento de las condiciones académicas de seguridad |
| D7 | Diagramas generados con Pillow (`diagrams.py`) | Diagramas manuales | Reproducibilidad: los diagramas se regeneran con un comando |

## 6. Incidencias y correcciones

| # | Incidencia | Detección | Corrección | Estado |
|---|---|---|---|---|
| I1 | El chat general respondía "catálogo" a preguntas de contenido | Pruebas de regresión | Ajuste del detector de intención (narrativa vs. catálogo) | Resuelta |
| I2 | Las entidades almacenadas no se leían (JSON anidado legado) | Prueba manual del detalle | Helper `parseJson` con desanidado hasta 8 niveles | Resuelta |
| I3 | Las respuestas agregadas solo consideraban 4 documentos | Prueba de "suma de valores" | Agregación sobre todos los documentos del ámbito | Resuelta |
| I4 | `diagrams.py` escribía las imágenes en una ruta inexistente (`sigad/02_Diseno/imagenes`) | Verificación contra la guía | Ruta corregida a `Documentacion/02_Diseno/imagenes` | Resuelta |
| I5 | El conversor DOCX mostraba `[Imagen: …]` en lugar de la figura | Revisión del entregable | El conversor ahora incrusta la imagen real con pie de figura | Resuelta |
| I6 | El `db.sql` fallaba con "duplicate column name" en base nueva | Verificación contra SQLite en memoria | Se retiraron los `ALTER TABLE` de migración del script | Resuelta |

## 7. Estado actual y trabajo pendiente

**Estado actual (al cierre de esta bitácora):**
- Aplicación funcional: autenticación, repositorios, carga, pipeline de IA, búsqueda, chat RAG y dashboard.
- 38 pruebas automatizadas documentadas (22 RAG + 4 Analyst + 10 Router + 2 smoke) y 21 pruebas manuales con evidencia.
- Corpus de 33 documentos; documentación de las cinco fases; matriz de trazabilidad 100 %.

**Trabajo pendiente / recomendaciones:**
- Grabar el video demostrativo (máximo 5 minutos) exigido como entregable.
- Añadir un archivo `.gitignore` en la raíz del repositorio (además del existente en `src/`).
- Versionar la presentación (`SIGAD World.pptx`) y retirar el `index.html` suelto de la raíz.
- Completar las columnas "Información esperada" y "Uso en prueba" del manifiesto del corpus.

## 8. Conclusiones

La bitácora evidencia un proceso de construcción iterativo y verificable: ocho *commits* que reflejan la evolución desde el núcleo funcional hasta la entrega documental, cinco sesiones de trabajo con objetivos y resultados explícitos, siete decisiones técnicas justificadas y seis incidencias resueltas. El historial de Git constituye la evidencia objetiva de este registro.

---

*Bitácora de Desarrollo — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*