# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Manual de Usuario

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Manual del Usuario |
| **Fecha** | Septiembre de 2026 |
| **Complementos** | `Manual_Tecnico.md` · `Manual_de_Administracion_y_Soporte.md` |

---

## Tabla de contenido

1. Qué es SIGAD
2. Requisitos de acceso
3. Ingreso al sistema (login)
4. El panel de control
5. Gestión de documentos
6. Procesamiento con IA (clasificación, resumen y entidades)
7. El asistente de consulta (chat IA)
8. Preguntas sugeridas y ejemplos de uso
9. Repositorios
10. Funcionalidades del administrador
11. Referencias

---

## 1. Qué es SIGAD

**SIGAD** es un sistema web para la **gestión, clasificación y análisis automático de documentos empresariales** (facturas, contratos, correspondencia e informes). Permite:

- Cargar documentos en **PDF, DOCX y TXT**.
- **Procesarlos con IA**: clasifica el tipo de documento, genera un resumen analítico y extrae entidades (fechas, montos, correos, teléfonos, identificación, personas y organizaciones).
- **Preguntar en lenguaje natural** al asistente y obtener respuestas con **citas de fuentes**, ya sea sobre todos los documentos o sobre el contenido de uno específico.
- Consultar indicadores (panel), historial de conversaciones, bitácora y respaldos.

El sistema funciona **completamente local** (no envía sus documentos a la nube) y, opcionalmente, puede conectar un modelo de lenguaje externo para enriquecer las respuestas.

---

## 2. Requisitos de acceso

| Requisito | Detalle |
|---|---|
| Navegador | Chrome, Edge u otro navegador moderno |
| Dirección | `http://localhost:3000` (según instalación) |
| Cuenta | Asignada por el administrador (o credenciales de demostración `admin/sigad2024` y `analista/analista2024`) |

---

## 3. Ingreso al sistema (login)

1. Abra la dirección del sistema.
2. Digite su **usuario** y **contraseña**.
3. Presione **Ingresar**.

![Login](04_Pruebas/imagenes/01_01_login.png)

- Tras ingresar, verá el **panel** (dashboard).
- Si la contraseña es incorrecta, el sistema muestra un aviso y registra el intento en la bitácora.
- Según su rol verá más o menos opciones en el menú: un **analista** no ve Usuarios ni Bitácora/Respaldo.

---

## 4. El panel de control

El panel (`Panel`) resume la información del sistema:

- **Tarjetas KPI:** Documentos, Procesados con IA, Pendientes, Errores, Palabras indexadas y Entidades.
- **Clasificación IA por categoría:** barras con porcentaje por categoría (Contrato, Factura, Correspondencia, Informe).
- **Documentos por formato:** barras por extensión (PDF/DOCX/TXT).
- **Actividad (14 días):** gráfico de movimientos recientes.
- **Documentos recientes** y **Última actividad** (eventos).

![Panel](04_Pruebas/imagenes/02_02_panel.png)

Botón **Actualizar** recarga los datos sin recargar la página.

---

## 5. Gestión de documentos

### 5.1 Listado y filtros
En **Documentos** verá la tabla de documentos con estado, categoría IA, palabras, propietario y acciones.

![Documentos](04_Pruebas/imagenes/03_03_documentos.png)

- **Buscar** por nombre.
- **Filtrar** por categoría y formato; ordenar por más reciente.

### 5.2 Cargar un documento
1. Presione **Cargar** y seleccione un archivo (PDF/DOCX/TXT, máximo según configuración).
2. Si existen repositorios, elija uno (por defecto `General`).
3. Confirme. El documento queda en estado **pendiente**.

![Carga](04_Pruebas/imagenes/09_09_carga_documento.png)

> Si el archivo no tiene texto legible (por ejemplo, un PDF escaneado), quedará en estado **error** con el motivo. En ese caso reemplace el archivo por una versión con texto.

### 5.3 Detalle de un documento
Haga clic en un documento para ver:
- **Estado** y metadatos (formato, tamaño, páginas, palabras, repositorio).
- **Resumen ejecutivo (IA)** en viñetas.
- **Clasificación automática** con barras de probabilidad por categoría.
- **Entidades extraídas** agrupadas por tipo.
- **Acciones:** Procesar con IA / Reprocesar · Descargar · Consultar en el chat · Eliminar.

![Detalle e IA](04_Pruebas/imagenes/04_04_detalle_ia.png)

---

## 6. Procesamiento con IA

El procesamiento convierte un documento `pendiente` en `procesado` y genera: categoría, probabilidades, resumen y entidades.

**Pasos:**
1. Abra el detalle del documento.
2. Presione **Procesar con IA** (o **Reprocesar** para regenerar los campos IA después de una actualización del motor).
3. Espere a que el estado cambie a `procesado`.

**Estados posibles:**

| Estado | Significado |
|---|---|
| `pendiente` | Cargado, aún sin procesar. |
| `procesando` | El pipeline IA está trabajando. |
| `procesado` | Listo; consultable en el chat. |
| `error` | Falló el procesamiento; el motivo aparece en el detalle. |

---

## 7. El asistente de consulta (chat IA)

El chat responde preguntas en lenguaje natural sobre los documentos. Abra **Chat IA**.

![Chat — listado y ámbito](04_Pruebas/imagenes/13_chat_listado.png)

### 7.1 Elegir el ámbito de la consulta
En la parte superior hay un **selector** con dos modos:

- **Todos los documentos** — responde sobre la totalidad del repositorio (conteos, sumas, catálogos, búsquedas).
- **Un documento específico** — responde *solo* con el contenido de ese documento (necesita estar `procesado`).

![Chat acotado](04_Pruebas/imagenes/14_chat_ambito.png)

### 7.2 Hacer una pregunta
1. Escriba su pregunta en el campo inferior y envíe.
2. La respuesta muestra la **intención detectada** y su **confianza** (chips), los **fragmentos citados** `[n]` y el listado de **fuentes** con acceso al detalle.
3. El historial queda guardado y puede **limpiarse** con el botón correspondiente.

![Chat limpiar](04_Pruebas/imagenes/21_chat_limpiar.png)

---

## 8. Preguntas sugeridas y ejemplos de uso

### 8.1 Modo "Todos los documentos"

| Categoría | Preguntas de ejemplo |
|---|---|
| Catálogo | «¿Qué documentos hay en el repositorio?» · «¿Cuáles documentos son facturas?» · «¿Cuáles documentos son informes?» |
| Conteos | «¿Cuántos documentos hay en total?» · «¿Cuántas facturas hay?» |
| Valores | «¿Cuánto suman los valores de las facturas?» · «¿Cuánto es el total de los pagos?» |
| Pagos pendientes | «¿Qué documentos están pendientes de pago?» |
| Contenido | «¿Qué documentos hablan sobre retiro de mercancía?» · «¿Qué dice el contrato sobre la garantía?» |
| Fechas | «¿Qué fechas de vencimiento aparecen?» |
| Actores | «¿Quién emitió las facturas?» · «¿Qué empresas intervienen?» |
| Saludos y ayuda | «Hola» · «¿Qué puedes hacer?» |

### 8.2 Modo "Un documento"

| Pregunta | Respuesta esperada |
|---|---|
| «Resume este documento» | Resumen analítico en viñetas |
| «¿De qué trata?» | Tema y fragmentos relevantes |
| «¿Qué valores o montos aparecen?» | Valores con total Σ |
| «¿Qué fechas menciona?» | Fechas del documento |
| «¿Quiénes aparecen?» | Personas y organizaciones |
| «¿Hay algo relacionado con pagos?» | Fragmentos que mencionan pagos |

> Consejo: si su pregunta contiene «cuánto», «suma», «total», el asistente sumará valores; si pide «qué dice/menciona/habla sobre», extraerá contenido textual, no sumas.

### 8.3 Ejemplos visuales
![Resumen](04_Pruebas/imagenes/15_chat_resumen.png)
![Valores](04_Pruebas/imagenes/16_chat_valores.png)
![Fechas](04_Pruebas/imagenes/17_chat_fechas.png)
![Pagos](04_Pruebas/imagenes/18_chat_pagos.png)
![General](04_Pruebas/imagenes/20_chat_general_respuesta.png)

---

## 9. Repositorios

El módulo **Repositorios** agrupa documentos por unidad de negocio, proyecto o cliente.

- **Crear** un repositorio (nombre y descripción).
- **Eliminar** repositorios propios (el repositorio `General` no se puede eliminar; sus documentos se reasignan automáticamente).

![Repositorios](04_Pruebas/imagenes/06_06_repositorios.png)

Al cargar un documento puede indicarse a qué repositorio pertenece.

---

## 10. Funcionalidades del administrador

Estas opciones solo aparecen para el rol **admin**:

### 10.1 Usuarios
- Ver usuarios y su cantidad de documentos.
- Cambiar roles (`admin`/`analista`).
- Restablecer contraseñas (invalida la sesión del usuario).
- Eliminar cuentas (sus documentos pasan al repositorio `General`).

![Usuarios](04_Pruebas/imagenes/07_07_usuarios.png)

### 10.2 Bitácora
- Ver eventos del sistema (login, cargas, procesamiento, errores) con filtro por nivel.
- Limpiar los registros antiguos.

![Bitácora](04_Pruebas/imagenes/08_08_bitacora.png)

### 10.3 Respaldo
- **Exportar** un respaldo JSON del sistema.
- **Restaurar** un respaldo previamente exportado.

---

## 11. Referencias

1. `Manual_Tecnico.md` — instalación, arquitectura y API (público técnico).
2. `Manual_de_Administracion_y_Soporte.md` — administración de cuentas, respaldos e incidentes (admin).
3. `Documentacion/04_Pruebas/imagenes/` — evidencias funcionales de cada pantalla.

---

*Fin del Manual de Usuario — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*