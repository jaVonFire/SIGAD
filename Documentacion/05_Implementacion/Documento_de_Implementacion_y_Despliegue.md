# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Documento de Implementación y Despliegue

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Bloque de Implementación y Despliegue |
| **Fecha** | Septiembre de 2026 |
| **Complementos** | `Manual_de_Administracion_y_Soporte.md` (misma carpeta) |

---

## Tabla de contenido

1. Generalidades y criterios de aceptación
2. Requisitos del entorno de despliegue
3. Instalación en ambiente local (Windows)
4. Preparación y carga de datos
5. Configuración para producción
6. Procedimientos operativos
7. Plan de implementación por fases
8. Migración de datos y reversibilidad
9. Monitoreo y manejo de fallas
10. Checklist de verificación post-instalación
11. Referencias

---

## 1. Generalidades y criterios de aceptación

Este documento describe cómo llevar SIGAD desde el código fuente hasta un ambiente operativo, considerando el contexto del proyecto integrador (báscula de uso interno / demostración académica) y su posible paso posterior a un servidor de producción.

**Criterios de aceptación (Gate de implementación):**
1. La batería de pruebas automatizada (38 casos) queda en verde: `npm.cmd test`.
2. La prueba E2E `smoke.mjs` termina con **SMOKE TEST OK**.
3. El flujo manual de aceptación (Bloque 4) fue ejecutado con éxito en navegador.
4. Las cuentas por defecto existen (`admin/sigad2024`, `analista/analista2024`) y el repositorio `General` está creado.
5. El corpus de demostración (33 documentos) está importado, procesado y consultable desde el chat IA.

**Entorno destino verificado por el autor:**
- Windows 11, Node.js **v24.19.0** (mín. 22.5.0), Git 2.53.0.windows.2.
- Package-lock generado con `npm` y dependencias bloqueadas: Express 4.22.2, pdfjs-dist 4.10.38, mammoth 1.12.2, multer 1.4.5-lts.2, dotenv 16.6.1.

---

## 2. Requisitos del entorno de despliegue

### 2.1 Hardware (referencial)
| Recurso | Mínimo | Recomendado |
|---|---|---|
| Procesador | 2 núcleos | 4 núcleos (afecta al SVD/LSA en corpus grandes) |
| Memoria | 2 GB | 4 GB (índices TF-IDF y LSA en RAM) |
| Disco | 500 MB libres | 2 GB (uploads + base + WAL) |

### 2.2 Software
| Componente | Requisito |
|---|---|
| Sistema operativo | Windows 10/11 (verificado) — multiplataforma por diseño |
| Node.js | ≥ 22.5.0 (requiere `node:sqlite` nativo) |
| npm | incl. con Node.js |
| Git | recomendado para control de versiones y clonado |
| Navegador | Chromium / Edge moderno |
| (Opcional) LLM | API compatible con OpenAI `/chat/completions` |

### 2.3 Puertos y red
- Servidor web: `3000` (configurable con `PORT`).
- No se requieren servicios externos para el modo local; solo salida de red si se activa el LLM opcional.

---

## 3. Instalación en ambiente local (Windows)

### 3.1 Obtener el código
```
git clone <repositorio> sigad
cd sigad
```

### 3.2 Instalar dependencias
```
cd sigad\src
npm install
```
Esto instala las dependencias declaradas en `package.json` y genera/consume `package-lock.json`.

### 3.3 Configurar variables de entorno
```
copy .env.example .env
```
Copiar con el contenido que pueda ajustarse:
```
PORT=3000
DB_PATH=data/sigad.sqlite
UPLOADS_DIR=uploads
SESSION_TTL_DAYS=7
MAX_UPLOAD_MB=10
MAX_TEXT_CHARS=300000
EMBED_DIMS=40
EMBED_MINDF=2
```
> Nota: `EMBED_DIMS`/`EMBED_MINDF` no están en `.env.example` pero son leídas por `embeddings.js` (valores por defecto 40 y 2).

### 3.4 Arrancar el servidor
```
npm.cmd start
```
Salida esperada:
```
[SIGAD] Servidor listo en http://localhost:3000
[SIGAD] Base de datos: <abs>\sigad\src\data\sigad.sqlite
[SIGAD] Uploads: <abs>\sigad\src\uploads
```
Acceso web: `http://localhost:3000`.

> En PowerShell, `npm.cmd start` es el comando correcto (el alias `npm` de PowerShell puede interferir con scripts `.cmd`).

---

## 4. Preparación y carga de datos

### 4.1 Semillas (usuarios y repositorio)
El arranque `ensureDefaults()` crea automáticamente si no existen:
- `admin` / `sigad2024` (rol admin).
- `analista` / `analista2024` (rol analista).
- Repositorio `General` (`id='general'`).

### 4.2 Importación del corpus de demostración
```
npm.cmd run seed
```
Recorre `Documentacion/10_Documentos_Prueba`, copia físicamente los archivos a `uploads/`, crea los registros con `DocService.create` y ejecuta el pipeline IA por documento. Salida:
```
[seed] Importando corpus desde <abs>\Documentacion\10_Documentos_Prueba
[seed] Resultado: {"total":33,"ok":33,"dup":0,"failed":0}
```
- `npm.cmd run corpus` reimporta solo el corpus (los nombres repetidos se saltan como `dup`).
- `npm.cmd run seed -- --no-corpus` solo crea credenciales/repositorio (sin corpus).

### 4.3 Carga manual
Desde la UI: menú **Documentos → Cargar** (multipart). El pipeline puede ejecutarse luego con **Procesar con IA** en el detalle de cada documento, o bien vía `POST /api/docs/:id/process`.

---

## 5. Configuración para producción

### 5.1 Variables críticas
| Variable | Recomendación producción |
|---|---|
| `SESSION_TTL_DAYS` | Reducir a 1–3 días según política de seguridad. |
| `MAX_UPLOAD_MB` | Ajustar al tamaño real de los documentos (p. ej. 20). |
| `MAX_TEXT_CHARS` | Conservar 300000 para no degradar la memoria del índice. |
| `PORT` | 3000 (o el puerto liberado por el proxy). |
| `AI_API_BASE`/`AI_API_KEY` | Solo si se desea la capa LLM (proteger la llave en el `.env`, nunca commitearla). |

### 5.2 Detrás de un proxy / servicio (recomendado)
- El frontend es estático dentro del mismo proceso: basta redirigir `http://host:puerto/` → `localhost:3000`.
- `app.set('trust proxy', 1)` ya está configurado en `index.js` para `X-Forwarded-*`.
- Se recomienda terminar TLS en el proxy y mantener el servicio interno en HTTP.

### 5.3 Persistencia que debe respaldarse
- `src/data/sigad.sqlite` (+ `sigad.sqlite-wal`/`-shm` si el servicio no se detiene limpiamente).
- `src/uploads/` (archivos físicos).
- `.env` (configuración y llaves).

---

## 6. Procedimientos operativos

### 6.1 Respaldo
- **Automatizado (UI):** menú **Respaldo → Exportar** genera un JSON con usuarios (sin hashes), repositorios, documentos y eventos (`GET /api/backup`).
- **Físico (servidor):** copiar `data/sigad.sqlite` y `uploads/` con el servicio detenido, para consistencia.

### 6.2 Restauración
- **Automatizado:** **Respaldo → Restaurar** (`POST /api/backup/restore`, solo admin) recrea repositorios y documentos.
- **Físico:** detener el servicio, reemplazar `data/sigad.sqlite` y `uploads/`, reiniciar. Al arrancar, el índice TF-IDF y el LSA se reconstruyen solos desde `docs.text` (diseño determinista).

### 6.3 Reconstrucción de índices
Al no persistir vectores, cualquier re-arranque reconstruye `Index` y `Embedder` a partir de los documentos `procesado`. Si un documento se procesó con una versión anterior del NLP y se desea regenerar sus campos IA: abrir su detalle → **Reprocesar**.

### 6.4 Bitácora
Todos los eventos (login, cargas, pipeline, errores, seeds, resets) quedan en la tabla `events` y se consultan en **Bitácora**. El administrador puede limpiarlos desde la misma pantalla.

---

## 7. Plan de implementación por fases

| Fase | Actividad | Responsable | Evidencia |
|---|---|---|---|
| 1 | Requisitos y alcance | Analista de negocio | Bloque 1 (Análisis) |
| 2 | Diseño de arquitectura y datos | Arquitecto | Bloque 2 (Diseño) |
| 3 | Desarrollo por módulos (auth, docs, NLP, chat) | Desarrollador | Bloque 3 (Desarrollo) |
| 4 | Pruebas unitarias, integración, QA y aceptación | QA | Bloque 4 (Pruebas) |
| 5 | Instalación, semilla de datos y verificación operativa | Desarrollador/Admin | Este documento |
| 6 | Despliegue en servidor + manuales | Admin | Manuales de usuario/técnico/admin |
| 7 | Entrega y socialización | Equipo | Documentos 08 (trazabilidad) y 11 (presentación) |

**Cierre de fase 5 (verificado):** arranque limpio, 38/38 pruebas, smoke OK, corpus importado (33/33), chat consultable.

---

## 8. Migración de datos y reversibilidad

### 8.1 De una base previa
- Las migraciones incrementales (`ALTER TABLE ... ADD COLUMN`) se aplican automáticamente al abrir la base; no se requiere dump manual.
- Los campos IA legados con JSON anidado se leen correctamente gracias a `parseJson` (ver Bloques 3 y 4).

### 8.2 Rollback
- Es un sistema de un solo servicio: la estrategia de reversión es **restaurar el respaldo físico** (base + uploads) y reiniciar.
- Conservar siempre la versión anterior de `src/` bajo control de versiones (Git tag) para revertir el código.

---

## 9. Monitoreo y manejo de fallas

### 9.1 Señales de salud
- `GET /api/system/info` → `{ app, version, node, corpusDir, embeddings }`.
- Dashboard: tarjetas de Errores y Pendientes; eventos de nivel `ERROR`.
- Logs de consola (`[SIGAD] ...`) y `console.error` para errores internos.

### 9.2 Fallas frecuentes y solución

| Síntoma | Causa probable | Solución |
|---|---|---|
| `node:sqlite` no existe | Node < 22.5 | Actualizar Node.js a ≥ 22.5.0 |
| Documento en `error`: "posible documento escaneado" | PDF sin capa de texto | Usar un PDF con texto o reprocesar con OCR (futuro) |
| `413` al cargar | Supera `MAX_UPLOAD_MB` | Ajustar `MAX_UPLOAD_MB` en `.env` |
| `401` en el chat | Sesión expirada (TTL 7 días) | Iniciar sesión de nuevo |
| Respuestas del chat sin fuentes | Hay pocos documentos procesados | Procesar los documentos (`Procesar con IA` / seed) |
| Puerto en uso | Otro proceso en `3000` | Cambiar `PORT` en `.env` |
| LLM no responde | Red/llave/config errónea | El sistema degrada a respuesta extractiva; revisar `AI_API_*` |

---

## 10. Checklist de verificación post-instalación

- [ ] `npm install` sin errores.
- [ ] `.env` creado desde `.env.example`.
- [ ] `npm.cmd start` muestra las tres líneas `[SIGAD]` sin excepciones.
- [ ] `http://localhost:3000` carga el login.
- [ ] `admin/sigad2024` ingresa al panel y ve KPIs.
- [ ] `npm.cmd test` → 38/38.
- [ ] `node server/test/smoke.mjs` → SMOKE TEST OK.
- [ ] `npm.cmd run seed` → `{"total":33,"ok":33,"dup":0,"failed":0}` (o `dup` aleatorios al repetir).
- [ ] Chat general responde "¿cuántos documentos hay?" con conteo global y "¿cuánto suman los valores de las facturas?" con Σ.
- [ ] Historial de chat se persiste y puede limpiarse.
- [ ] Respaldo exporta JSON y restaurar re-crea repositorios/documentos.

---

## 11. Referencias

1. Node.js — Guía de instalación y módulos nativos (2026).
2. npm — Best practices para publicación e install (2026).
3. Express.js — Mejores prácticas de despliegue (2026).
4. Bloques 1–4 de SIGAD (requisitos, diseño, desarrollo, pruebas).
5. `Manual_de_Administracion_y_Soporte.md` — procedimientos del administrador.

---

*Fin del Documento de Implementación y Despliegue — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*