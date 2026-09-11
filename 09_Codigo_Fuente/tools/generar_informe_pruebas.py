# -*- coding: utf-8 -*-
"""Genera el informe de pruebas de funcionamiento (Word con screenshots reales)."""
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

OUT_DOCX = r"C:\Users\javie\OneDrive\Desktop\UTS\Sis Empresariales\sigad\04_Pruebas\Documento_de_Pruebas_de_Funcionamiento.docx"
IMG = r"C:\Users\javie\OneDrive\Desktop\UTS\Sis Empresariales\sigad\04_Pruebas\imagenes"
TITULO = "Pruebas de Funcionamiento del Aplicativo"
SUBTITULO = "SIGAD · Sistema Inteligente de Gestión y Análisis Documental"

doc = Document()
st = doc.styles['Normal']
st.font.name = 'Calibri'
st.font.size = Pt(11)

AZUL = RGBColor(0x1F, 0x4E, 0x79)

def p(text="", size=11, bold=False, color=None, align=None, space_after=6, italic=False, font=None):
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    if font:
        run.font.name = font
    if align is not None:
        par.alignment = align
    par.paragraph_format.space_after = Pt(space_after)
    return par

def h1(num, text):
    par = doc.add_paragraph()
    run = par.add_run(f"{num}. {text}")
    run.bold = True
    run.font.size = Pt(15)
    run.font.color.rgb = AZUL
    par.paragraph_format.space_before = Pt(16)
    par.paragraph_format.space_after = Pt(6)
    return par

def h2(text):
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = AZUL
    par.paragraph_format.space_before = Pt(10)
    par.paragraph_format.space_after = Pt(4)
    return par

def body(text):
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.font.size = Pt(11)
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    par.paragraph_format.space_after = Pt(6)
    return par

def shot(name, pie, width=6.4):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = par.add_run()
    run.add_picture(__import__("os").path.join(IMG, name), width=Inches(width))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = cap.add_run(pie)
    r.italic = True
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    cap.paragraph_format.space_after = Pt(10)

def ok_table(rows):
    t = doc.add_table(rows=len(rows) + 1, cols=len(rows[0]))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, h in enumerate(rows[0]):
        cell = t.rows[0].cells[j]
        cell.text = h
        for r in cell.paragraphs[0].runs:
            r.bold = True
    for i, row in enumerate(rows[1:], start=1):
        for j, v in enumerate(row):
            t.rows[i].cells[j].text = v
    return t

# ---------------- PORTADA ----------------
for _ in range(3):
    doc.add_paragraph()
p("SIGAD", size=44, bold=True, color=AZUL, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
p(SUBTITULO, size=13, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=22)
p(TITULO, size=22, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
p("Informe con evidencias capturadas del aplicativo en funcionamiento", size=11, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=28)
p("Desarrollo de Aplicaciones Empresariales – VI semestre", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
p("Universitaria Tecnológica de Santander", size=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
p("Docente: Wilson Castaño Galviz", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
p("Integrante: Javier Andrés Núñez Sánchez", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
p("Septiembre de 2026", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
doc.add_page_break()

# ---------------- 1. OBJETIVO ----------------
h1(1, "Objetivo del informe")
body("Demostrar y evidenciar, mediante capturas del aplicativo en ejecución, el funcionamiento de cada uno de los "
     "ítems del alcance funcional mínimo de SIGAD: autenticación y control de usuarios, repositorios, gestión de "
     "documentos y el flujo central de inteligencia artificial (extracción, clasificación, resumen, extracción de "
     "entidades, búsqueda/consulta y almacenamiento de resultados), incluyendo el registro de errores y el panel de "
     "indicadores.")
body("Las capturas se tomaron sobre una instancia real del aplicativo (servidor local, puerto 3200) con el corpus "
     "documental de 33 archivos procesados, mediante un navegador automatizado, recorriendo la aplicación por su "
     "interfaz de usuario con los roles admin y analista.")

# ---------------- 2. ALCANCE ----------------
h1(2, "Alcance y metodología")
h2("Puntos del alcance mínimo verificados")
ok_table([
    ["#", "Ítem funcional", "Verificado"],
    ["1", "Autenticación y control básico de usuarios", "Sí (UI)"],
    ["2", "Creación y administración de repositorios/carpetas", "Sí (UI)"],
    ["3", "Carga, consulta, descarga y eliminación de archivos", "Sí (UI + API)"],
    ["4", "Soporte de formatos PDF, DOCX y TXT", "Sí (UI + API)"],
    ["5", "Procesamiento automático de los documentos con IA", "Sí (UI + API)"],
    ["6", "Clasificación automática en mínimo 3 categorías", "Sí (UI)"],
    ["7", "Resumen por documento", "Sí (UI)"],
    ["8", "Extracción de información relevante (mín. 3 tipos)", "Sí (UI)"],
    ["9", "Búsqueda de contenido en los documentos", "Sí (API, evidencia JSON)"],
    ["10", "Consulta en lenguaje natural", "Sí (UI)"],
    ["11", "Dashboard con indicadores", "Sí (UI)"],
    ["12", "Registro de errores y estados", "Sí (UI + API)"],
])
doc.add_paragraph()

# ---------------- 3. ENTORNO ----------------
h1(3, "Entorno de la prueba")
ok_table([
    ["Parámetro", "Valor"],
    ["Aplicativo", "SIGAD v1.0.0 — frontend SPA + API REST"],
    ["Servidor", "Node.js " + "v24.19.0, instancia local aislada en http://localhost:3200"],
    ["Base de datos", "SQLite aislada (data/informe.sqlite) — no afecta datos reales"],
    ["Almacenamiento", "Carpeta de subidas aislada (uploads_informe)"],
    ["Corpus de carga", "33 documentos reales (facturas, contratos, informes, correspondencia en PDF/DOCX/TXT)"],
    ["Navegador", "Microsoft Edge (Chromium) automatizado, ventana 1360×900"],
    ["Roles probados", "admin (administrador) y analista"],
    ["Credenciales", "admin / sigad2024 · analista / analista2024"],
])
doc.add_paragraph()

# ---------------- 4. EVIDENCIAS ----------------
h1(4, "Evidencias de funcionamiento por ítem")

h2("4.1 Autenticación y control básico de usuarios")
body("La aplicación inicia en la pantalla de ingreso con usuario y contraseña. Con credenciales incorrectas se "
     "muestra el mensaje de error y no se otorga acceso; con las credenciales válidas se ingresa al panel. El menú "
     "se adapta al rol: el analista no ve las opciones de administración (Usuarios, Respaldo) y el bloqueo por "
     "ruta redirige automáticamente a Documentos cuando intenta abrir #/users.")
shot("01_01_login.png", "Captura 1 · Pantalla de ingreso (autenticación).", 5.2)
shot("07_07_usuarios.png", "Captura 2 · Administración de usuarios: creación, cambio de rol, restablecimiento y eliminación.", 6.4)
shot("11_11_analista_menu.png", "Captura 3 · Menú del rol analista: sin opciones de administración.", 6.4)
shot("12_12_analista_redirect.png", "Captura 4 · El analista intenta abrir #/users y es redirigido a Documentos.", 6.4)

h2("4.2 Creación y administración de repositorios")
body("Se creó el repositorio \"Expediente Pruebas 2026\" desde la vista Repositorios; aparece en la lista con su "
     "identificador, propietario y fecha. El repositorio General está protegido y el botón de eliminación solo está "
     "disponible para el rol admin.")
shot("06_06_repositorios.png", "Captura 5 · Repositorios: repositorio creado como evidencia + General protegido.", 6.4)

h2("4.3 Carga, consulta, descarga y eliminación de archivos")
body("Se subió un archivo de prueba (PRUEBA-OPERATIVA-001.txt) desde la vista Documentos; la aplicación lo procesa "
     "automáticamente y lo muestra con estado Procesado en el listado. Al abrir un documento se consultan sus datos "
     "y resultados de IA. La eliminación está disponible para el propietario o un administrador.")
shot("03_03_documentos.png", "Captura 6 · Repositorio documental con 33 archivos del corpus (filtros y estados).", 6.4)
shot("09_09_carga_documento.png", "Captura 7 · Carga en vivo: archivo procesado con IA y visible en el listado.", 6.4)
shot("04_04_detalle_ia.png", "Captura 8 · Consulta del documento: datos, resumen IA, clasificación y entidades.", 6.4)

h2("4.4 Soporte de formatos PDF, DOCX y TXT")
body("El corpus cargado incluye los tres formatos (columna Formato del listado). La extracción funciona de forma "
     "transparente para cada tipo: pdfjs-dist para PDF, mammoth para DOCX y lectura directa para TXT. (Evidencia "
     "visual: captura 6.)")

h2("4.5 · 4.8 Flujo central de la IA (procesamiento, clasificación, resumen y extracción)")
body("El procesamiento ejecuta el flujo real archivo → extracción → análisis → almacenamiento: el documento pasa del "
     "estado pendiente/procesando a procesado, recibe una categoría con probabilidades, un resumen extractivo de al "
     "menos 3 oraciones y entidades de varios tipos (fechas, valores, NIT, teléfonos, correos, identificadores). "
     "Todo se observa en la vista de detalle (captura 8).")
body("Flujo técnico demostrado: (1) el archivo se extrae como texto según su formato; (2) se tokeniza y normaliza; "
     "(3) un clasificador probabilístico (Naive Bayes multinomial) asigna la categoría; (4) el resumen se construye "
     "extrayendo las oraciones más relevantes; (5) las entidades se detectan por patrones; (6) el documento y sus "
     "resultados se almacenan y se indexan; (7) la búsqueda y la consulta recuperan contenido citando las fuentes.")

h2("4.9 Búsqueda de contenido")
body("La búsqueda dentro del contenido se expone en el API. Evidencia obtenida en esta misma prueba:")
p("GET /api/search?q=pago total  —  HTTP 200 OK", size=10, font="Consolas")
p('[{ "id":"…", "name":"FE-001.txt", "score":0.3941, "snippets":["… TOTAL A PAGAR $1.487.500 …"] }]', size=10, font="Consolas")
body("También ingresó en producción el modo de búsqueda semántica (?semantic=1) que combina TF-IDF con similitud "
     "coseno de embeddings locales (LSA) para re-ponderar los resultados por contexto.")

h2("4.10 Consulta en lenguaje natural (IA conversacional)")
body("Desde la vista Consulta IA se formuló la pregunta \"¿Cuál es el valor total de las facturas?\". El asistente "
     "detectó la intención (valor/dinero), calculó su confianza, compuso la respuesta y citó las fuentes del "
     "repositorio de las que se extrae la información, lo que demuestra el flujo búsqueda → respuesta con trazabilidad.")
shot("05_05_consulta_ia.png", "Captura 9 · Consulta en lenguaje natural con respuesta y fuentes citadas [n].", 6.4)

h2("4.11 Panel de indicadores (dashboard)")
shot("02_02_panel.png", "Captura 10 · Panel: documentos, procesados, categorías, formatos y estado del índice TF-IDF.", 6.4)

h2("4.12 Registro de errores y estados")
body("Se subió deliberadamente un archivo vacío para validar el manejo de errores: el documento quedó en estado "
     "error y la bitácora registró el evento de nivel ERROR del pipeline. La bitácora (que filtra por rol) muestra "
     "los eventos INFO, WARN y ERROR con fecha, nivel y usuario.")
shot("10_10_caso_error.png", "Captura 11 · Archivo vacío rechazado: estado error visible en el listado.", 6.4)
shot("08_08_bitacora.png", "Captura 12 · Bitácora con eventos INFO/WARN/ERROR del pipeline.", 6.4)

# ---------------- 5. MATRIZ ----------------
h1(5, "Matriz de casos de prueba")
ok_table([
    ["Caso", "Acción", "Resultado esperado", "Resultado obtenido", "Estado"],
    ["CP-01", "Ingresar con credenciales incorrectas", "Rechazo y mensaje de error", "Mensaje de error, sin acceso", "CUMPLE"],
    ["CP-02", "Ingresar con admin/sigad2024", "Acceso al panel", "Panel cargado", "CUMPLE"],
    ["CP-03", "Crear usuario y cambiar rol", "Alta y cambio de rol en lista", "Usuario creado; rol actualizado", "CUMPLE"],
    ["CP-04", "Ingresar como analista", "Menú sin opciones admin", "Menú restringido", "CUMPLE"],
    ["CP-05", "Analista abre #/users", "Bloqueo/redirección", "Redirigido a Documentos", "CUMPLE"],
    ["CP-06", "Crear repositorio \"Expediente Pruebas 2026\"", "Aparece en lista", "Repo creado y listado", "CUMPLE"],
    ["CP-07", "Intentar eliminar repo General", "Opción no disponible", "Sin botón de eliminación", "CUMPLE"],
    ["CP-08", "Subir documento TXT de prueba", "Estado procesado tras IA", "Procesado con IA", "CUMPLE"],
    ["CP-09", "Abrir documento procesado", "Resumen, clasificación y entidades", "Todo visible", "CUMPLE"],
    ["CP-10", "Clasificar doc en categoría", "Categoría correcta ≥ 3 posibles", "Factura (probabilidad alta)", "CUMPLE"],
    ["CP-11", "Descargar el archivo original", "Descarga íntegra", "Descarga OK (bytes idénticos verificados por API)", "CUMPLE"],
    ["CP-12", "Eliminar documento propio", "Eliminación del registro y archivo", "Eliminado", "CUMPLE"],
    ["CP-13", "Procesar los 33 archivos del corpus", "Sin fallos", "33/33 procesados, 0 fallos", "CUMPLE"],
    ["CP-14", "Verificar formatos PDF/DOCX/TXT", "Los tres formatos operativos", "Los tres procesados", "CUMPLE"],
    ["CP-15", "Consultar por lenguaje natural", "Respuesta con fuentes citadas", "Respuesta con citas [n] (intención dinero, conf alta)", "CUMPLE"],
    ["CP-16", "Subir archivo vacío (caso de error)", "Estado error + bitácora ERROR", "Estado error y evento ERROR registrado", "CUMPLE"],
    ["CP-17", "Consultar dashboard", "Indicadores coherentes con los datos", "Documentos/procesados/categorías correctos", "CUMPLE"],
])
doc.add_paragraph()

# ---------------- 6. DEFECTOS ----------------
h1(6, "Defectos detectados durante la prueba")
body("Durante la elaboración de esta evidencia se identificó un defecto de navegación: al hacer clic en el nombre de "
     "un documento (ruta #/docs/<id>) el enrutador no cargaba la vista de detalle y volvía a mostrar el listado. El "
     "módulo de detalle existía pero no estaba registrado en el enrutador. Se corrigió en public/js/main.js y la "
     "navegación al detalle quedó verificada (captura 8).")
body("Observación de seguridad (no bloqueante para el alcance): en la interfaz el botón de eliminación del usuario "
     "administrador principal no existe (protección RN08 en UI); sin embargo, por API la operación de borrado del "
     "usuario 'admin' no está bloqueada en el servicio. Se recomienda reforzar la validación en userService para "
     "blindar al administrador principal en todos los accesos.")

# ---------------- 7. CONCLUSION ----------------
h1(7, "Conclusión")
body("Con base en las evidencias recopiladas, SIGAD cumple el alcance funcional mínimo del proyecto: los 12 puntos "
     "responden correctamente desde la interfaz de usuario y desde el API, incluido el flujo central de inteligencia "
     "artificial (carga real de archivos, extracción, procesamiento, análisis, almacenamiento de resultados, búsqueda "
     "y consulta con citas). El corpus documental se procesa al 100 % y el registro de errores funciona correctamente "
     "tanto para el control de calidad como para la auditoría del sistema.")

doc.save(OUT_DOCX)
print("DOCX generado:", OUT_DOCX)