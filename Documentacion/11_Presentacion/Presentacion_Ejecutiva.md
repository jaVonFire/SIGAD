# SIGAD — Sistema Inteligente de Gestión y Análisis Documental

## Presentación Ejecutiva del Proyecto

---

**Proyecto integrador — Tecnología en Desarrollo de Software, VI semestre**  
**Universidad Tecnológica de Santander (UTS) — Desarrollo de Aplicaciones Empresariales**

| | |
|---|---|
| **Autor** | Javier Andrés Núñez Sánchez |
| **Versión** | 1.0 |
| **Estado** | Entregable académico — Presentación Ejecutiva |
| **Fecha** | Septiembre de 2026 |

---

## 1. Contexto y problema

Las organizaciones generan diariamente grandes volúmenes de documentos empresariales: facturas, contratos, correspondencia e informes. Estos documentos acumulan información crítica (montos, fechas, partes intervinientes, obligaciones) pero permanecen como **datos no estructurados** —archivos PDF, DOCX o TXT— que requieren revisión manual para extraer valor. En una empresa mediana, un analista puede pasar horas revisando decenas de documentos para responder preguntas simples como "¿cuánto suman las facturas del trimestre?" o "¿qué contratos vencen este mes?".

El problema se agrava cuando los documentos se acumulan sin clasificación, sin resúmenes y sin un mecanismo de búsqueda que vaya más allá del nombre del archivo. La información queda "enterrada" y las decisiones se retrasan.

## 2. Solución propuesta

**SIGAD** es una aplicación web que resuelve este problema mediante inteligencia artificial local:

1. **Clasificación automática:** cada documento se clasifica en una de 4 categorías (Contrato, Factura, Correspondencia, Informe) usando un clasificador Naive Bayes entrenado con vocabulario empresarial colombiano.

2. **Resumen analítico:** genera un resumen de hasta 7 oraciones que describe qué es el documento, quiénes participan, cuáles son las cifras clave y qué fechas relevantes menciona.

3. **Extracción de entidades (NER):** detecta 7 tipos de entidades: fechas, montos (COP/USD/EUR), correos electrónicos, teléfonos, identificaciones (NIT/CC/CE), personas y organizaciones.

4. **Chat en lenguaje natural:** el usuario puede preguntar "¿cuánto suman las facturas?" o "¿qué documentos hablan sobre retiro de mercancía?" y obtener respuestas con **citas de fuentes verificables** `[n]`.

5. **Búsqueda semántica (LSA):** além de la búsqueda por palabras clave (TF-IDF), el sistema encuentra documentos relacionados por significado, no solo por coincidencia textual.

Todo funciona **100 % local** — los documentos nunca salen del servidor.

## 3. Tecnologías utilizadas

| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | Node.js ≥ 22.5.0 | `node:sqlite` nativo, sin binarios externos |
| Servidor | Express 4.22.2 | Framework estándar para APIs REST |
| Base de datos | SQLite (WAL) | Archivo único, cero configuración, concurrencia |
| PDF | pdfjs-dist 4.10.38 | Extracción de texto sin herramientas externas |
| DOCX | mammoth 1.12.2 | Texto plano desde OOXML |
| Carga | multer 1.4.5-lts.2 | Manejo de archivos multipart |
| Frontend | JS vanilla (ES Modules) | SPA sin frameworks, sin build step |
| IA/PLN | Módulos propios | Naive Bayes, TF-IDF, LSA, NER por patrones |
| Pruebas | `node --test` | Runner nativo, 38 casos |

## 4. Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (SPA)                       │
│  login · panel · documentos · detalle · chat             │
│  repositorios · usuarios · bitácora · respaldo           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON (REST)
┌────────────────────────┴────────────────────────────────┐
│                    SERVIDOR EXPRESS                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ Rutas    │→│ Servicios │→│ Motor IA/PLN           │  │
│  │ (auth,   │  │ (auth,   │  │ tokenizer · classifier │  │
│  │  docs,   │  │  doc,    │  │ summarizer · analyst   │  │
│  │  ask,    │  │  chat,   │  │ entities · tfidf       │  │
│  │  system) │  │  pipeline│  │ embeddings · rag        │  │
│  └──────────┘  └──────────┘  └───────────────────────┘  │
│       │              │                                    │
│  ┌────┴──────────────┴──────────────────────────────┐   │
│  │  SQLite (WAL) · uploads/ · configuración (.env)   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 5. Resultados obtenidos

### 5.1 Métricas de calidad
| Métrica | Resultado |
|---|---|
| Pruebas automatizadas | **38/38 en verde** (100 %) |
| Pruebas manuales (UI) | **21 pantallas** documentadas con capturas |
| Smoke test E2E | **SMOKE TEST OK** (flujo completo) |
| Cobertura de requisitos | **58/58** (RF + RNF + RN + HU + UC = 100 %) |
| Defectos abiertos al cierre | **0** |

### 5.2 Capacidades funcionales
- Clasificación en 4 categorías con probabilidades audibles.
- Resúmenes analíticos que describen el tipo, tema, partes, cifras y fechas del documento.
- 7 tipos de entidades NER (fechas, montos, correos, teléfonos, IDs, personas, organizaciones).
- Chat que responde sobre **todos** los documentos o uno específico.
- Respuestas con citas `[n]` y fuentes verificables.
- Opcional: enriquecimiento con LLM externo (degradación controlada si falla).
- Dashboard con KPIs, gráficos de categoría/formato y actividad de 14 días.
- Gestión de usuarios (admin/analista), repositorios, respaldos y bitácora.

### 5.3 Iteración de mejora RAG (verificada)
- Corrección de detección de intención (narrativa vs. catálogo vs. suma).
- Deserialización de entidades legadas (JSON triple-codificado).
- Respuestas agregadas sobre **todos** los documentos (no solo los 4 mejores TF-IDF).
- 3 casos de regresión añadidos y verificados.

## 6. Estructura de la documentación

| # | Documento | Contenido |
|---|---|---|
| 01 | Documento de Análisis | Requisitos (RF-01…RF-20, RNF, RN), HU, UC, trazabilidad, riesgos |
| 02 | Documento de Diseño | Arquitectura limpia, MER, APIs, flujo RAG/LSA, seguridad |
| 03 | Documento de Desarrollo Técnico | Implementación de cada módulo con código real |
| 04 | Plan de Pruebas QA | Estrategia, 38 casos, matriz de trazabilidad, defectos |
| 05 | Implementación y Despliegue | Instalación, configuración, producción, checklist |
| 06 | Manual de Usuario | Guía visual paso a paso con capturas |
| 07 | Manual Técnico | API completa, esquema de datos, configuración |
| 08 | Matriz de Trazabilidad | Relación RF↔Pruebas↔Evidencia (100 % cobertura) |
| 09 | Base de Datos | Script SQL, diccionario de datos, migraciones |
| 10 | Documentos de Prueba | Corpus de 33 documentos (FE/CT/CO/IN) |
| 11 | Presentación | Este documento |

## 7. Conclusiones

1. SIGAD demuestra que es posible construir un sistema de gestión documental con IA **completamente local**, sin servicios externos ni dependencias de APIs de terceros, respetando la confidencialidad de la información empresarial.

2. La arquitectura limpia modular permite que cada componente (NLP, persistencia, transporte, interfaz) sea probado y mantenido de forma independiente, facilitando la evolución del sistema.

3. El RAG extractivo con citas verificables resuelve el problema de las "alucinaciones" de los modelos de lenguaje: cada respuesta se basa en el texto real del documento y cita la fuente.

4. El proyecto integra los conocimientos de los seis semestres de la tecnología: bases de datos, desarrollo web, inteligencia artificial, pruebas de software, ingeniería de requisitos y arquitectura de software.

5. Los 38 casos de prueba automatizados y las 21 evidencias funcionales documentan un ciclo de vida completo de ingeniería de software, desde el análisis hasta el despliegue.

---

*Presentación Ejecutiva — SIGAD v1.0 — Javier Andrés Núñez Sánchez — UTS, VI semestre.*