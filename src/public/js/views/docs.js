import { api } from '../api.js';
import { esc, badge, fmtBytes, fmtDate, toast, busy } from '../ui.js';

export async function render(root, params){
  root.innerHTML = `
    <div class="page-head"><div><h1>Documentos</h1><div class="sub" id="sub">Repositorio documental del proyecto</div></div>
      <div class="row">
        <input class="input" id="f-q" placeholder="Buscar por nombre…" style="width:210px">
        <select class="select" id="f-cat"><option value="">Toda categoría</option><option>Contrato</option><option>Factura</option><option>Correspondencia</option><option>Informe</option></select>
        <select class="select" id="f-fmt"><option value="">Todo formato</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option></select>
        <select class="select" id="f-repo"></select>
      </div>
    </div>
    <div class="card">
      <div class="row spread" style="margin-bottom:12px">
        <div class="row">
          <input type="file" id="file-input" accept=".pdf,.docx,.txt" hidden>
          <button class="btn small" id="btn-upload">+ Subir documento</button>
          <span class="dim">PDF · DOCX · TXT (máx. 10 MB)</span>
        </div>
        <div class="row">
          <select class="select" id="f-sort"><option value="recent">Más recientes</option><option value="name">Nombre</option><option value="words">Más palabras</option></select>
        </div>
      </div>
      <div id="docs-list"><div class="empty">Cargando…</div></div>
    </div>`;

  const repos = await api.get('/api/repos');
  const repoSel = root.querySelector('#f-repo');
  repoSel.innerHTML = '<option value="">Todos los repositorios</option>' + repos.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');

  const fileInput = root.querySelector('#file-input');
  root.querySelector('#btn-upload').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const f = fileInput.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('repoId', repoSel.value || 'general');
    const btn = root.querySelector('#btn-upload');
    busy(btn, 'Subiendo…', true);
    try {
      const doc = await api.post('/api/docs', fd);
      toast('Archivo cargado. Procesando con IA…');
      const res = await api.post(`/api/docs/${doc.id}/process`);
      if (res.doc.status === 'procesado'){
        toast(`Procesado: categoría "${res.doc.category}".`);
      } else {
        toast('No se pudo procesar: ' + (res.error || 'error desconocido'), 'err');
      }
      await loadDocs();
    } catch (err){ toast(err.message, 'err'); }
    finally { busy(btn, 'Subir', false); fileInput.value = ''; }
  };

  for (const id of ['f-q', 'f-cat', 'f-fmt', 'f-repo', 'f-sort']){
    root.querySelector('#' + id).addEventListener('input', debounce(loadDocs, 300));
    root.querySelector('#' + id).addEventListener('change', loadDocs);
  }

  async function loadDocs(){
    const q = root.querySelector('#f-q').value.trim();
    const cat = root.querySelector('#f-cat').value;
    const fmt = root.querySelector('#f-fmt').value;
    const repo = root.querySelector('#f-repo').value;
    const sort = root.querySelector('#f-sort').value;
    const qs = new URLSearchParams({ q, cat, fmt, repo, sort }).toString();
    const docs = await api.get('/api/docs?' + qs);
    const box = root.querySelector('#docs-list');
    if (!docs.length){ box.innerHTML = '<div class="empty">No hay documentos. Sube el primero con el botón superior.</div>'; return; }
    box.innerHTML = `<table class="tbl"><tr>
      <th>Documento</th><th>Categoría</th><th>Formato</th><th>Palabras</th><th>Repo</th><th>Estado</th><th>Fecha</th><th></th></tr>` +
      docs.map(d => `<tr>
        <td><a href="#/docs/${d.id}">${esc(d.name)}</a></td>
        <td>${esc(d.category || '—')}</td>
        <td class="tag">${esc(d.ext.toUpperCase())}</td>
        <td>${d.wordCount || '—'}</td>
        <td class="tag">${esc(d.repoName || d.repoId)}</td>
        <td>${badge(d.status)}</td>
        <td class="dim">${fmtDate(d.uploadedAt)}</td>
        <td class="row">
          ${d.status !== 'procesado' ? `<button class="btn small" data-proc="${d.id}">▶ Procesar</button>` : ''}
          <button class="btn small ghost" data-chat="${d.id}" title="Consultar en el chat">💬</button>
          <button class="btn small ghost" data-dl="${d.id}">⬇</button>
          <button class="btn small danger" data-del="${d.id}">✕</button>
        </td></tr>`).join('') + `</table>`;
    box.querySelectorAll('[data-proc]').forEach(b => b.onclick = async () => {
      busy(b, 'IA…', true);
      try { const r = await api.post(`/api/docs/${b.dataset.proc}/process`); toast(r.doc.category ? `Categoría: ${r.doc.category}.` : 'Procesado.', r.doc.status === 'error' ? 'err' : 'ok'); }
      catch (err){ toast(err.message, 'err'); }
      busy(b, 'Procesar', false); loadDocs();
    });
    box.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => {
      location.hash = '#/chat/' + b.dataset.chat;
    });
    box.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => {
      api.download(`/api/docs/${b.dataset.dl}/download`).catch(err => toast(err.message, 'err'));
    });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar definitivamente el documento?')) return;
      try { await api.del(`/api/docs/${b.dataset.del}`); toast('Documento eliminado.'); loadDocs(); }
      catch (err){ toast(err.message, 'err'); }
    });
  }

  await loadDocs();
}

function debounce(fn, ms){
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}