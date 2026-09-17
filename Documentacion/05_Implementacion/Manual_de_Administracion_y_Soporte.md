# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Manual de Administración y Soporte

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Manual del Administrador |
| **Fecha** | Septiembre de 2026 |
| **Complementos** | `Documento_de_Implementacion_y_Despliegue.md` · `Manual_Tecnico.md` · `Manual_de_Usuario.md` |

---

## Tabla de contenido

1. Propósito y audiencia
2. Roles y responsabilidades del administrador
3. Administración de usuarios
4. Administración de repositorios y documentos
5. Gestión del respaldo y restauración
6. Supervisión (bitácora y panel)
7. Operación del motor de IA
8. Configuración avanzada y entorno
9. Servicio técnico: diagnóstico y solución de fallas
10. Políticas de seguridad y buenas prácticas
11. Anexos (referencias de endpoints)

---

## 1. Propósito y audiencia

Este manual explica al **administrador del sistema (rol `admin`)** las tareas necesarias para operar SIGAD: gestión de cuentas, organización documental, respaldos, supervisión y resolución de incidentes. Asume que la instalación descrita en el *Documento de Implementación y Despliegue* ya fue completada.

**Credenciales iniciales (documentadas para la evaluación):**
| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `sigad2024` | Administrador |
| `analista` | `analista2024` | Analista |

> Cambiar estas credenciales inmediatamente en un ambiente productivo.

---

## 2. Roles y responsabilidades del administrador

| Tarea | Frecuencia | Dónde |
|---|---|---|
| Crear/deshabilitar cuentas y reasignar roles | Según política | Usuarios |
| Supervisar documentos pendientes y errores | Diario | Panel / Documentos / Bitácora |
| Ejecutar respaldos | Periódica | Respaldo |
| Importar corpus o cargar documentos | Cuando se requiera | Documentos |
| Revisar eventos de error del pipeline | Diario | Bitácora |
| Ajustar configuración (`.env`) y reiniciar | Cambios programados | Servidor |
| Monitorear uso de la base y uploads | Mensual | Servidor |

---

## 3. Administración de usuarios

El panel **Usuarios** (visible solo para `admin`) permite:

- **Ver usuarios** con su rol y número de documentos cargados.
- **Cambiar rol**: `admin` ⇄ `analista`. El sistema impide degradar al último administrador.
- **Restablecer contraseña**: genera una nueva contraseña (o la indicada); invalida las sesiones activas del usuario.
- **Eliminar usuario**: elimina la cuenta; los documentos del usuario eliminado se reasignan al repositorio `General` (no se pierde información).

**Reglas de negocio:**
- El usuario `admin` (semilla) no puede eliminarse.
- Un analista solo ve sus documentos y el repositorio compartido; un administrador ve todo.

---

## 4. Administración de repositorios y documentos

### 4.1 Repositorios
- **Crear:** Repositorios → Nuevo (nombre obligatorio, descripción opcional).
- **Eliminar:** solo repositorios que no sean `General`; sus documentos se reasignan a `General`.

### 4.2 Documentos
- **Cargar:** Documentos → Cargar (PDF/DOCX/TXT, máx. `MAX_UPLOAD_MB`). El documento queda en estado `pendiente`.
- **Procesar con IA:** en el detalle de cada documento ejecuta el pipeline (extracción → tokenización → clasificación → resumen → NER → indexado). Estados posibles:
  - `pendiente` — cargado, sin procesar.
  - `procesando` — pipeline en curso.
  - `procesado` — con campos IA disponibles.
  - `error` — con motivo visible en el detalle (p. ej. *"posible documento escaneado"*).
- **Reprocesar:** regenera todos los campos IA (útil tras actualizaciones del NLP).
- **Descargar y Eliminar** (solo propietario o admin).

---

## 5. Gestión del respaldo y restauración

### 5.1 Exportar respaldo
**Respaldo → Exportar** descarga un JSON que incluye: usuarios (sin hashes de contraseña), repositorios, documentos (metadatos + campos IA) y eventos.

### 5.2 Restaurar
**Respaldo → Restaurar** (solo admin y solo con archivo válido) re-crea repositorios y documentos a partir del JSON. No restaura credenciales ni archivos físicos.

### 5.3 Respaldo físico (recomendado periódicamente)
1. Detener el servicio.
2. Copiar `src/data/sigad.sqlite` y `src/uploads/`.
3. Reiniciar; los índices (TF-IDF y LSA) se reconstruyen automáticamente.

---

## 6. Supervisión (bitácora y panel)

- **Panel (dashboard):** tarjetas de cantidad de documentos, procesados, pendientes, errores, palabras indexadas y entidades; distribución por categoría IA y por formato; actividad de los últimos 14 días.
- **Bitácora (events):** cada evento tiene nivel (`INFO`/`WARN`/`ERROR`), componente, mensaje y usuario. Filtrar por nivel y limpiar registros antiguos cuando sea necesario (acción de admin).
- **Estado del índice:** `GET /api/system/info` expone versión, Node y estado de embeddings (dimensiones, vocabulario, documentos).

**Indicadores que exigen acción del administrador:**
- Alta proporción de `ERROR` en Pipeline → verificará que los PDF tengan texto y que el disco tenga espacio.
- Documentos `pendiente` sin procesar → exhortar a procesarlos o ejecutar el pipeline.

---

## 7. Operación del motor de IA

### 7.1 Comportamiento
SIGAD opera con **IA local** (clasificador Naive Bayes, resumen analítico, NER, TF-IDF y LSA) sobre el texto extraído de los documentos. Las respuestas del chat citan fuentes `[n]` y son verificables.

### 7.2 Integración LLM opcional (síntesis)
Si el administrador define en `src/.env`:
```
AI_API_BASE=https://api.openai.com/v1
AI_API_KEY=<llave>
AI_MODEL=gpt-4o-mini
```
el asistente enriquecerá las respuestas con un LLM **condicionado por el contexto recuperado** (temperature 0.3 y *prompt* prohibitivo de invención de datos). Sin estas variables, el sistema responde 100 % localmente. Si la llamada falla, la respuesta extractiva original se conserva (degradación controlada).

### 7.3 Ajustes de calidad
- `EMBED_DIMS` (por defecto 40): dimensión del espacio semántico; subir mejora matices con más corpus.
- `EMBED_MINDF` (2): frecuencia documental mínima de un término para ser embebido.
- `MAX_TEXT_CHARS` (300000): texto truncado por documento indexado.
- Reprocesar documentos tras cambiar estos valores.

---

## 8. Configuración avanzada y entorno

| Variable | Efecto | Nota |
|---|---|---|
| `PORT` | Puerto del servidor | Cambiar si hay conflicto |
| `DB_PATH` / `UPLOADS_DIR` | Ubicaciones físicas | Ajustar rutas empresariales |
| `SESSION_TTL_DAYS` | Duración de sesiones | Reducir en producción |
| `MAX_UPLOAD_MB` | Tope de archivo | Según volumen documental |
| `MAX_TEXT_CHARS` | Límite de texto indexado | Mantener ≥ 100000 |
| `EMBED_DIMS` | Dimensiones LSA | 8–64 |
| `EMBED_MINDF` | Mín. frecuencia documental | ≥ 2 |
| `AI_API_*` | Capa LLM opcional | Proteger la llave |

**Reinicio con cambios:** detener el proceso, editar `.env`, `npm.cmd start`.

---

## 9. Servicio técnico: diagnóstico y solución de fallas

### 9.1 Rutina de diagnóstico
1. Verificar que el proceso está arriba (`localhost:3000`).
2. Revisar la consola del servidor (errores `[error]`).
3. Revisar la Bitácora por eventos `ERROR`.
4. Corroborar espacio en disco (base WAL + uploads).
5. Ejecutar pruebas rápidas: `npm.cmd test` y `node server/test/smoke.mjs`.

### 9.2 Tabla de incidentes

| Incidente | Diagnóstico | Resolución |
|---|---|---|
| Login rechazado | Credencial equivocada o sesión inválida | Revisar credencial/producto; administrador restablece |
| Documento en `error`: sin contenido legible | PDF escaneado / tabla sin texto | Usar archivo con texto; proceso OCR futuro |
| `413` al cargar | Archivo > `MAX_UPLOAD_MB` | Subir `MAX_UPLOAD_MB` y reiniciar |
| Chat no encuentra nada | `RAG` sin documentos procesados | Procesar documentos o ejecutar seed |
| Respuestas sin citas | Consultas demasiado genéricas | Reformular o acotar a un documento |
| API 500 | Error no manejado | Consultar `console.error`; abrir incidente |
| Base corrupta por corte de energía | SQLite WAL inconsistente | Recuperar del respaldo físico |

### 9.3 Confirmación de datos de producción
Verificación final del administrador tras cada operación relevante:
- `GET /api/system/info` muestra la versión esperada.
- El Dashboard presenta los KPIs actualizados.
- El historial del chat se persiste por usuario.

---

## 10. Políticas de seguridad y buenas prácticas

1. **Credenciales:** cambiar las contraseñas por defecto; usar contraseñas de ≥ 6 caracteres (el sistema sincera de lo contrario).
2. **Principio de mínimo privilegio:** otorgar `admin` solo a quien deba administrar.
3. **Respaldos 3-2-1:** al menos una copia externa del `.sqlite` + `uploads`.
4. **`.env` protegido:** nunca versionar llaves (`AI_API_KEY`); usar `.env.example` como plantilla pública.
5. **Navegación segura:** en producción, publicar detrás de un proxy con TLS.
6. **Actualización controlada:** los cambios a `src/` se prueban con `npm.cmd test` antes de reiniciar el servicio.
7. **Auditoría:** revisar la Bitácora periódicamente; la tabla `events` registra logins, cargas, resets y obtención de errores.

---

## 11. Anexos (referencias de endpoints del administrador)

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/users` | GET | Listar usuarios (admin) |
| `/api/users/:id/role` | PATCH | Cambiar rol (admin) |
| `/api/users/:id/reset` | POST | Restablecer contraseña (admin) |
| `/api/users/:id` | DELETE | Eliminar usuario (admin) |
| `/api/repos` | GET/POST | Listar/crear repositorios |
| `/api/docs` | POST | Cargar documento |
| `/api/docs/:id/process` | POST | Procesar con IA |
| `/api/backup` | GET | Exportar respaldo |
| `/api/backup/restore` | POST | Restaurar respaldo (admin) |
| `/api/seed/corpus` | POST | Importar corpus (admin) |
| `/api/dashboard` | GET | KPIs del panel |
| `/api/events` | GET/DELETE | Bitácora |

---

*Fin del Manual de Administración y Soporte — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*