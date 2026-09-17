# -*- coding: utf-8 -*-
"""Genera los diagramas de la fase de diseño de SIGAD como imágenes PNG.

Entregables: arquitectura, casos de uso, componentes, despliegue,
secuencia de procesamiento, secuencia de consulta RAG, modelo entidad
relación y flujo de procesamiento documental.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', '..', '02_Diseno', 'imagenes')
ACCENT = (31, 59, 115)
BLACK = (25, 25, 25)
GRAY = (110, 110, 110)
WHITE = (255, 255, 255)
LINE = (31, 59, 115)

_F = {}
def font(size, bold=False):
    key = (size, bold)
    if key not in _F:
        try:
            name = 'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'
            _F[key] = ImageFont.truetype(name, size)
        except Exception:
            _F[key] = ImageFont.load_default()
    return _F[key]

def wrap_lines(draw, text, f, maxw):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textbbox((0, 0), t, font=f)[2] <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def tw(draw, text, f):
    return draw.textbbox((0, 0), text, font=f)[2]

def draw_box(draw, x, y, w, h, title=None, subtitle=None, lines=(),
             title_fill=ACCENT, tsize=15, bsize=12, title_color=(255, 255, 255)):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=WHITE,
                           outline=LINE, width=2)
    ty = y
    if title:
        bar_h = 34
        draw.rounded_rectangle([x, y, x + w, y + bar_h], radius=10, fill=title_fill)
        draw.rectangle([x, y + bar_h - 10, x + w, y + bar_h], fill=title_fill)
        tf = font(tsize, bold=True)
        bb = draw.textbbox((0, 0), title, font=tf)
        draw.text((x + 12, y + (bar_h - (bb[3] - bb[1])) / 2 - bb[1]), title, font=tf, fill=title_color)
        ty += bar_h + 8
    yoff = ty
    if subtitle:
        sf = font(bsize - 1)
        bb = draw.textbbox((0, 0), subtitle, font=sf)
        draw.text((x + 12, yoff - bb[1]), subtitle, font=sf, fill=GRAY)
        yoff += (bb[3] - bb[1]) + 6
    for ln in lines:
        f = font(bsize)
        draw.text((x + 8, yoff), ln, font=f, fill=BLACK)
        bb = draw.textbbox((0, 0), ln, font=f)
        yoff += bb[3] + 4
    return y + h

def arrow(d, x1, y1, x2, y2, color=LINE, width=2, label=None, lf=12):
    import math
    d.line([x1, y1, x2, y2], fill=color, width=width)
    ang = math.atan2(y2 - y1, x2 - x1)
    for off in (0.4, -0.4):
        d.line([x2, y2, x2 - 13 * math.cos(ang - off), y2 - 13 * math.sin(ang - off)],
               fill=color, width=width)
    if label:
        f = font(lf, bold=True)
        d.text(((x1 + x2) / 2 - tw(d, label, f) / 2, (y1 + y2) / 2 - 26),
               label, font=f, fill=GRAY)

def new_canvas(w, h):
    im = Image.new('RGB', (w, h), WHITE)
    return im, ImageDraw.Draw(im)

def doc_title(d, im, text):
    f = font(21, bold=True)
    d.text((im.width / 2 - tw(d, text, f) / 2, 16), text, font=f, fill=ACCENT)

def save(im, name):
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, name))
    print('OK ->', name)


def diagrama_arquitectura():
    im, d = new_canvas(1130, 900)
    doc_title(d, im, 'Arquitectura general de la solución — SIGAD')
    x, w = 60, 1010
    y = 66
    y = draw_box(d, x, y, w, 96, 'CLIENTE WEB — Navegador (Chrome, Edge, Firefox)',
                 lines=('Aplicación de una sola página (SPA) en módulos JavaScript · HTML5 · CSS3',
                        'Vistas: inicio de sesión, panel, documentos, detalle, consultas, repositorios, usuarios, bitácora, respaldo'))
    arrow(d, x + w / 2, y + 4, x + w / 2, y + 44, label='HTTP / JSON')
    y += 48
    y = draw_box(d, x, y, w, 74, 'CAPA DE PRESENTACIÓN DEL SERVIDOR — Express + archivos estáticos (public/)',
                 lines=('API REST en /api/* · servidor de archivos estáticos · manejo centralizado de errores',))
    arrow(d, x + w / 2, y + 4, x + w / 2, y + 44, label='Peticiones autenticadas (Bearer token)')
    y += 48
    y = draw_box(d, x, y, w, 76, 'CAPA DE API — Rutas (auth · users · repos · docs · ask · system)',
                 lines=('Middleware de autenticación, autorización por rol y carga de archivos (multer)',))
    arrow(d, x + w / 2, y + 4, x + w / 2, y + 44)
    y += 48
    y = draw_box(d, x, y, w, 88, 'CAPA DE SERVICIOS DE NEGOCIO',
                 lines=('authService · userService · repoService · docService · dashboardService',
                        'chatService · backupService · seedService · pipelineService'))
    arrow(d, x + w / 2, y + 4, x + w / 2, y + 44)
    y += 48
    y = draw_box(d, x, y, w, 140, 'CAPA DE INTELIGENCIA ARTIFICIAL Y PROCESAMIENTO (NLP)',
                 lines=('Extracción de contenido: pdfjs-dist (PDF) · mammoth (DOCX) · lectura directa (TXT)',
                        'Tokenización y limpieza (stopwords ES, stemming ligero)',
                        'Clasificación Naive Bayes multinomial (4 categorías) · Resumen extractivo TF',
                        'Extracción de entidades por patrones (7 tipos) · Índice TF-IDF · RAG extractivo con citas'))
    arrow(d, x + w / 2, y + 4, x + w / 2, y + 44)
    y += 48
    draw_box(d, x, y, w, 110, 'CAPA DE PERSISTENCIA Y ALMACENAMIENTO',
             lines=('SQLite (node:sqlite, modo WAL): users · repos · docs · sessions · events · chat',
                    'Almacenamiento de archivos: uploads/ (identificador UUID + nombre original)',
                    'Corpus de prueba: Documentacion/10_Documentos_Prueba (33 documentos)'))
    save(im, 'arquitectura.png')


def stick_figure(d, cx, cy):
    hd = 15
    d.ellipse([cx - hd, cy - 30, cx + hd, cy], outline=BLACK, width=3)
    d.line([cx, cy, cx, cy + 48], fill=BLACK, width=3)
    d.line([cx, cy + 16, cx - 24, cy + 38], fill=BLACK, width=3)
    d.line([cx, cy + 16, cx + 24, cy + 38], fill=BLACK, width=3)
    d.line([cx, cy + 48, cx - 22, cy + 84], fill=BLACK, width=3)
    d.line([cx, cy + 48, cx + 22, cy + 84], fill=BLACK, width=3)

def actor(d, x, y, label):
    stick_figure(d, x, y)
    f = font(13, bold=True)
    for i, ln in enumerate(label.split('\n')):
        d.text((x - tw(d, ln, f) / 2, y + 98 + i * 17), ln, font=f, fill=BLACK)

def diagrama_casos_uso():
    im, d = new_canvas(1160, 860)
    doc_title(d, im, 'Diagrama de casos de uso — SIGAD')
    # límite del sistema
    SW, SH = 200, 76
    d.rounded_rectangle([SW - 8, SH - 8, 1140, 820], radius=14, outline=LINE, width=2)
    f = font(15, bold=True)
    d.text((1135 - tw(d, 'Sistema SIGAD', f) - 12, SH + 2), 'Sistema SIGAD', font=f, fill=ACCENT)
    actor(d, 120, 260, 'Administrador')
    actor(d, 120, 620, 'Analista')

    ucs = [
        (230, 120, 'Iniciar sesión'),
        (230, 205, 'Gestionar repositorios'),
        (230, 290, 'Cargar documento (PDF, DOCX, TXT)'),
        (230, 375, 'Procesar documento con IA'),
        (230, 460, 'Ver análisis: categoría, resumen, entidades'),
        (230, 545, 'Buscar por contenido'),
        (230, 630, 'Consultar en lenguaje natural (RAG)'),
        (230, 715, 'Ver panel de indicadores y bitácora'),
        (640, 120, 'Administrar usuarios'),
        (640, 205, 'Respaldar y restaurar datos'),
        (640, 290, 'Reimportar corpus de prueba'),
    ]
    centers = []
    for (x, y, txt) in ucs:
        w = 480
        draw_box(d, x, y, w, 56, title=None, lines=(txt,), bsize=13)
        centers.append((x + w / 2, y + 28))
    cxc = [c for c in centers]
    admin_targets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    anal_targets = [0, 1, 2, 3, 4, 5, 6, 7]
    for i in admin_targets:
        arrow(d, 135, 265, cxc[i][0], cxc[i][1] - 28, label=None)
    for i in anal_targets:
        arrow(d, 135, 625, cxc[i][0], cxc[i][1] - 28, label=None)
    save(im, 'casos_uso.png')


def diagrama_componentes():
    im, d = new_canvas(1160, 880)
    doc_title(d, im, 'Diagrama de componentes — SIGAD (backend Node.js / Express)')
    cx = 60
    cy = draw_box(d, cx, 64, 1040, 60, 'Núcleo — index.js (arranque, routers API, estáticos, manejo de errores)', tsize=14)
    y = cy + 20
    draw_box(d, cx, y, 340, 90, 'Middleware',
             lines=('authRequired · adminOnly', 'upload (multer) · logEvent'))
    draw_box(d, cx + 360, y, 340, 90, 'Rutas (API REST)',
             lines=('auth · users · repos', 'docs · ask · system'))
    draw_box(d, cx + 720, y, 320, 90, 'Frontend servido',
             lines=('public/ (SPA), index.html', 'js/views, css/app.css'))
    arrow(d, cx + 170, y + 90, cx + 170, 252)
    arrow(d, cx + 700, y + 90, cx + 700, 252)
    y = 270
    draw_box(d, cx, y, 1040, 80, 'Servicios de negocio',
             lines=('authService · userService · repoService · docService · dashboardService',
                    'chatService · backupService · seedService · pipelineService'))
    y += 100
    y1 = draw_box(d, cx, y, 500, 150, 'Inteligencia artificial / NLP',
                  lines=('Extracción: pdfjs-dist · mammoth · fs',
                         'tokenizer · classifier (Naive Bayes)',
                         'summarizer (TF) · entities (patrones)',
                         'tfidf (índice en memoria) · rag (RAG extractivo)'))
    y2 = draw_box(d, cx + 540, y, 500, 150, 'Persistencia y dependencias',
                  lines=('db.js — SQLite sincrónico (node:sqlite, WAL)',
                         'carpeta uploads/ — archivos físicos',
                         'dependencias npm: express, multer, dotenv',
                         'config.js — variables de entorno (.env)'))
    y = max(y1, y2) + 20
    arrow(d, cx + 250, y - 6, cx + 250, y + 40)
    draw_box(d, cx, y + 40, 1040, 56,
             lines=('RAG generativo opcional: si AI_API_KEY y AI_API_BASE existen, se consulta un LLM compatible con la API de OpenAI',
                    'condicionado al contexto recuperado; en su defecto la respuesta es 100% extractiva (nada se inventa)'))
    save(im, 'componentes.png')


def diagrama_despliegue():
    im, d = new_canvas(1140, 700)
    doc_title(d, im, 'Diagrama de despliegue — SIGAD (equipo local / red LAN)')
    y = 70
    draw_box(d, 60, y, 460, 165, 'NODO CLIENTE — Dispositivo del usuario',
             lines=('Navegador web moderno (Chrome, Edge, Firefox)',
                    'Aplicación de una sola página (SPA)',
                    'No requiere instalación adicional'))
    draw_box(d, 620, y, 460, 165, 'NODO SERVIDOR — Equipo de oficina / red LAN',
             lines=('Node.js v24 (requisito: 22.5 o superior)',
                    'Servidor Express en http://localhost:3000',
                    'Arquitectura en capas (presentación, API, servicios, NLP, datos)'))
    arrow(d, 530, y + 60, 615, y + 60, label='HTTP/JSON')
    arrow(d, 615, y + 105, 530, y + 105, label='respuestas')
    y2 = y + 185
    draw_box(d, 60, y2, 460, 120, 'ALMACENAMIENTO DEL SERVIDOR',
             lines=('uploads/ — archivos PDF, DOCX, TXT',
                    'data/sigad.sqlite — base de datos SQLite (WAL)',
                    'Índice TF-IDF en memoria (reconstruible al iniciar)'))
    draw_box(d, 620, y2, 460, 120, 'CORPUS DE PRUEBA',
             lines=('Documentacion/10_Documentos_Prueba/ — 33 documentos',
                    'Distribución: contrato, factura, correspondencia, informe',
                    'Lectura para reimportación controlada'))
    d.line([850, y + 165, 850, y2], fill=LINE, width=2)
    save(im, 'despliegue.png')


def lifelines(d, xs, ytop, ybot):
    for x in xs:
        d.line([x, ytop, x, ybot], fill=(185, 190, 200), width=2)
        d.rounded_rectangle([x - 3, ytop - 3, x + 3, ytop + 3], radius=2, fill=ACCENT)

def heads(d, im, hs, xs, ytop):
    f = font(12, bold=True)
    for hx, h in zip(xs, hs):
        for i, ln in enumerate(h.split('\n')):
            bb = d.textbbox((0, 0), ln, font=f)
            d.text((hx - bb[2] / 2, ytop - 34 + i * (bb[3] + 3)), ln, font=f, fill=ACCENT)

def seq_step(d, xs, y, a, b, label, ax=10):
    x1, x2 = xs[a], xs[b]
    if a != b:
        arrow(d, x1, y, x2, y)
        d.ellipse([x1 - 3, y - 3, x1 + 3, y + 3], outline=LINE, width=2)
        tx = min(x1, x2) + 12 if (x1 < x2) else x2 + 34
        f = font(11.5)
        bb = d.textbbox((0, 0), label, font=f)
        d.text((tx, y - bb[3] + 2), label, font=f, fill=BLACK)
    else:
        d.line([x1, y - 14, x1 + 38, y - 14, x1 + 38, y, x1 + 14, y], fill=LINE, width=2)
        f = font(11.5)
        bb = d.textbbox((0, 0), label, font=f)
        d.text((x1 + 44, y - bb[3] / 2), label, font=f, fill=BLACK)

def diagrama_secuencia_proceso():
    im, d = new_canvas(1240, 800)
    doc_title(d, im, 'Diagrama de secuencia — procesamiento de un documento (inteligencia artificial)')
    hs = ['Usuario', 'Frontend (SPA)', 'API /docs', 'DocService', 'Pipeline IA\n(procesador)', 'Índice TF-IDF', 'SQLite / bitácora']
    xs = [70, 240, 410, 590, 790, 980, 1160]
    heads(d, im, hs, xs, 118)
    lifelines(d, xs, 104, 720)
    y = 150
    steps = [
        (0, 1, '1 · Selecciona el archivo y envía el formulario (multipart)'),
        (1, 2, '2 · POST /api/docs'),
        (2, 3, '3 · Valida formato y tamaño; INSERT docs (estado: pendiente)'),
        (3, 6, '4 · Bitácora INFO «documento cargado»'),
        (2, 1, '5 · 201 con el documento en estado pendiente'),
        (1, 2, '6 · POST /api/docs/:id/process'),
        (2, 4, '7 · pipelineService.processDocument(id, actor)'),
        (4, 6, '8 · Estado → procesando'),
        (4, 4, '9 · Extracción: pdfjs (PDF) · mammoth (DOCX) · fs (TXT)'),
        (4, 4, '10 · Tokenización → Clasificación NB → Resumen TF → Entidades'),
        (4, 5, '11 · Index.add(id, texto)'),
        (4, 6, '12 · UPDATE docs: procesado + resultados; bitácora INFO'),
        (4, 2, '13 · Respuesta con documento público y pasos ejecutados'),
    ]
    for (a, b, label) in steps:
        seq_step(d, xs, y, a, b, label)
        y += 40
    save(im, 'secuencia_proceso.png')


def diagrama_secuencia_rag():
    im, d = new_canvas(1240, 820)
    doc_title(d, im, 'Diagrama de secuencia — consulta en lenguaje natural (RAG)')
    hs = ['Usuario', 'Frontend (SPA)', 'API /ask', 'rag.ask()', 'Índice TF-IDF', 'DocService', 'ChatService']
    xs = [70, 235, 430, 630, 830, 1010, 1160]
    heads(d, im, hs, xs, 118)
    lifelines(d, xs, 104, 740)
    y = 150
    steps = [
        (0, 1, '1 · Escribe la pregunta (por ejemplo: ¿cuánto hay que pagar?)'),
        (1, 2, '2 · POST /api/ask { q }'),
        (2, 3, '3 · ask(q)'),
        (3, 3, '4 · Detección de intención (money, date, who, what)'),
        (3, 4, '5 · Index.scoreQuery(q) → ranking TF-IDF (top 4)'),
        (4, 5, '6 · listDocsForAsk — nombres y metadata'),
        (3, 4, '7 · Index.bestSnippets(id, q, 2) → fragmentos con citas [n]'),
        (3, 3, '8 · Compone la respuesta HTML según la intención'),
        (3, 3, '9 · (Opcional) LLM externo condicionado al contexto recuperado'),
        (3, 6, '10 · ChatService.push: pregunta y respuesta al historial'),
        (6, 1, '11 · Respuesta { type, intent, conf, sources, html }'),
    ]
    for (a, b, label) in steps:
        seq_step(d, xs, y, a, b, label)
        y += 40
    save(im, 'secuencia_rag.png')


def ent(d, x, y, name, attrs, w=470):
    h = 34 + 26 * len(attrs)
    draw_box(d, x, y, w, h, title=name.upper(), lines=tuple(attrs), bsize=12, tsize=14)
    return (x, y, w, h)

def diagrama_mer():
    im, d = new_canvas(1160, 880)
    doc_title(d, im, 'Modelo Entidad-Relación — SIGAD (diagrama conceptual)')
    u = ent(d, 60, 80, 'users', ['id (PK)', 'username (UQ)', 'name', 'role', 'salt', 'hash', 'created'])
    r = ent(d, 640, 80, 'repos', ['id (PK)', 'name', 'desc', 'ownerId (FK)', 'created'])
    ds = ent(d, 640, 300, 'docs', ['id (PK)', 'name', 'ext', 'size', 'repoId (FK)', 'ownerId (FK)', 'ownerName', 'status', 'filePath', 'category', 'summary', 'entities', 'analysisAt'], w=470)
    s = ent(d, 60, 400, 'sessions', ['tokenHash (PK)', 'userId (FK)', 'created', 'expires'])
    c = ent(d, 60, 640, 'chat', ['id (PK)', 'userId (FK)', 'role', 'ts', 'q', 'type', 'intent', 'sources', 'html'])
    e = ent(d, 640, 700, 'events', ['id (PK)', 'ts', 'level', 'comp', 'msg', 'user'], w=470)
    # relaciones
    rel = [
        ((60 + 470, 130), (640, 120), '1', 'N'),
        ((290, 80 + 34 + 26 * 7), (850, 300), '1', 'N'),
        ((60 + 470, 180), (850, 300), '1', 'N'),
        ((290, 80 + 34 + 26 * 7), (290, 400), '1', 'N'),
        ((290, 80 + 34 + 26 * 7), (290, 640), '1', 'N'),
    ]
    for i, (p1, p2, l1, l2) in enumerate(rel):
        arrow(d, p1[0], p1[1], p2[0], p2[1])
        f = font(12, bold=True)
        d.text((p1[0] + 6, p1[1] - 14), l1, font=f, fill=GRAY)
        d.text((p2[0] + 6, p2[1] - 6), l2, font=f, fill=GRAY)
    draw_box(d, 60, 826, 1040, 44,
             lines=('Convención: identificadores UUID (TEXT PK) · timestamps en milisegundos (INTEGER) · ``events.user'' es texto, no llave foránea'),
             bsize=11)
    save(im, 'mer.png')


def diagrama_flujo():
    im, d = new_canvas(1160, 720)
    doc_title(d, im, 'Flujo de procesamiento documental — SIGAD')
    y = 84
    draw_box(d, 70, y, 190, 62, lines=('Carga del\narchivo',), bsize=13, tsize=13)
    draw_box(d, 300, y, 140, 62, lines=('Pendiente',), bsize=13)
    draw_box(d, 480, y, 150, 62, lines=('Procesando',), bsize=13)
    draw_box(d, 670, y, 170, 62, lines=('Procesado',), bsize=13, title_fill=(39, 119, 60))
    arrow(d, 260, 115, 298, 115)
    arrow(d, 440, 115, 478, 115)
    arrow(d, 630, 115, 668, 115)
    arrow(d, 755, 146, 755, 190)
    draw_box(d, 670, 192, 170, 62, lines=('Error\n(+ motivo)',), bsize=13, title_fill=(150, 40, 40))
    y2 = 300
    steps = [
        ('1 · Extracción de\ncontenido', 'pdfjs · mammoth · fs'),
        ('2 · Tokenización\ny limpieza', 'stopwords ES · stemming'),
        ('3 · Clasificación', 'Naive Bayes · 4 categorías'),
        ('4 · Resumen\nextractivo', 'puntuación TF'),
        ('5 · Extracción\nde entidades', '7 tipos por patrones'),
        ('6 · Indexado\nTF-IDF + RAG', 'búsqueda y consulta'),
    ]
    x = 60
    w = 160
    for i, (t, sub) in enumerate(steps):
        draw_box(d, x, y2, w, 96, title=t, subtitle=sub, tsize=13, bsize=11)
        if i < len(steps) - 1:
            arrow(d, x + w, y2 + 48, x + w + 16, y2 + 48)
        x += w + 16
    draw_box(d, 60, 470, 1040, 88,
             lines=('Al persistir cada paso se actualiza el documento (categoría, resumen, entidades) y se notifica en la bitácora.',
                    'El resultado queda disponible para la búsqueda, el panel de indicadores y la consulta en lenguaje natural.'),
             bsize=12)
    save(im, 'flujo.png')


def main():
    diagrama_arquitectura()
    diagrama_casos_uso()
    diagrama_componentes()
    diagrama_despliegue()
    diagrama_secuencia_proceso()
    diagrama_secuencia_rag()
    diagrama_mer()
    diagrama_flujo()
    print('Listo.')


if __name__ == '__main__':
    main()