import { api } from '../api.js';
import { esc, badge, fmtDate, stat, toast } from '../ui.js';

export async function render(root){
  root.innerHTML = '<div class="page-head"><div><h1>Panel de control</h1><div class="sub">Indicadores del repositorio documental</div></div><button class="btn ghost" id="refresh">Actualizar</button></div><div class="grid cards" id="stats"></div><div class="grid cols-2" style="margin-top:14px"><div class="card" id="cats"></div><div class="card" id="fmts"></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card" id="recent"><h2>Documentos recientes</h2></div><div class="card" id="ev"><h2>Última actividad</h2></div></div>';

  const load = async () => {
    const d = await api.get('/api/dashboard');
    const statsEl = root.querySelector('#stats');
    statsEl.innerHTML =
      stat('Documentos', d.docs, '', 'total en el repositorio') +
      stat('Procesados IA', d.processed, 'green', 'con análisis completo') +
      stat('Pendientes', d.pendientes, 'orange', 'por procesar') +
      stat('Errores', d.errores, 'red', 'documentos + eventos') +
      stat('Palabras indexadas', d.words.toLocaleString('es-CO'), 'teal', 'vocabulario TF-IDF') +
      stat('Entidades', d.entities.toLocaleString('es-CO'), '', 'fechas, valores, RUT…');

    root.querySelector('#cats').innerHTML = '<h2>Clasificación IA por categoría</h2>' +
      d.categories.map(c => `<div class="hbar"><span class="lbl">${esc(c.label)}</span>
        <div class="track"><div class="fill" style="width:${Math.round(c.value / Math.max(1, d.processed) * 100)}%;background:${c.color}"></div></div>
        <span class="num">${c.value}</span></div>`).join('') + (d.processed === 0 ? '<div class="empty">Sin documentos procesados</div>' : '');

    root.querySelector('#fmts').innerHTML = '<h2>Documentos por formato</h2>' + d.formats.map(f =>
      `<div class="hbar"><span class="lbl">.${esc(f.ext.toLowerCase())}</span>
        <div class="track"><div class="fill" style="width:${Math.round(f.value / Math.max(1, d.totalByFmt) * 100)}%;background:var(--accent2)"></div></div>
        <span class="num">${f.value}</span></div>`).join('') +
      `<h2 style="margin-top:18px">Actividad (14 días)</h2>` +
      `<div class="bars">${d.activity.map(a => `<div class="bar" style="height:${Math.max(4, Math.min(100, a.count * 12))}px" title="${a.count} eventos"><span>${a.count}</span></div>`).join('')}</div>`;

    root.querySelector('#recent').innerHTML += d.recent.length
      ? `<table class="tbl"><tr><th>Documento</th><th>Categoría</th><th>Estado</th><th>Fecha</th></tr>` +
        d.recent.map(r => `<tr><td><a href="#/docs/${r.id}">${esc(r.name)}</a></td>
          <td>${esc(r.category || '—')}</td><td>${badge(r.status)}</td><td class="dim">${fmtDate(r.uploadedAt)}</td></tr>`).join('') + `</table>`
      : '<div class="empty">Sube documentos desde la sección Documentos.</div>';

    root.querySelector('#ev').innerHTML += d.events.length
      ? `<table class="tbl"><tr><th>Nivel</th><th>Componente</th><th>Mensaje</th><th>Usuario</th></tr>` +
        d.events.map(e => `<tr><td>${badge(e.level.toLowerCase())}</td><td>${esc(e.comp)}</td>
          <td class="dim">${esc(e.msg)}</td><td>${esc(e.user)}</td></tr>`).join('') + `</table>`
      : '<div class="empty">Sin eventos registrados.</div>';
  };

  root.querySelector('#refresh').onclick = () => load().catch(err => toast(err.message, 'err'));
  try { await load(); } catch (err){ root.querySelector('#stats').innerHTML = ''; toast(err.message, 'err'); }
}