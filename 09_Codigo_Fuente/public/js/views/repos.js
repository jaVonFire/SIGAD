import { api, session } from '../api.js';
import { esc, toast, badge } from '../ui.js';

const ROOT_LABEL = { general: 'General' };

export async function render(root){
  const me = session.getUser();
  root.innerHTML = `
    <div class="page-head"><div><h1>Repositorios</h1><div class="sub">Organiza los documentos por cojunto lógico (expediente)</div></div>
      <div class="row">
        <input class="input" id="r-name" placeholder="Nombre del repositorio">
        <input class="input" id="r-desc" placeholder="Descripción (opcional)" style="width:240px">
        <button class="btn" id="r-create">Crear</button>
      </div>
    </div>
    <div class="card"><div id="repos-list"><div class="empty">Cargando…</div></div></div>`;

  const load = async () => {
    const repos = await api.get('/api/repos');
    const box = root.querySelector('#repos-list');
    if (!repos.length){ box.innerHTML = '<div class="empty">Sin repositorios.</div>'; return; }
    box.innerHTML = `<table class="tbl"><tr><th>Repositorio</th><th>Descripción</th><th>Propietario</th><th>Creado</th><th></th></tr>` +
      repos.map(r => `<tr>
        <td><b>${esc(ROOT_LABEL[r.id] || r.name)}</b> <span class="tag">${esc(r.id)}</span></td>
        <td class="dim">${esc(r.desc || '—')}</td>
        <td>${esc(r.ownerName || '—')}</td>
        <td class="dim">${new Date(r.created).toLocaleDateString('es-CO')}</td>
        <td>${me.role === 'admin' && r.id !== 'general'
          ? `<button class="btn small danger" data-del="${esc(r.id)}">✕</button>` : ''}</td>
      </tr>`).join('') + `</table>`;
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar el repositorio? (los documentos se conservan en "general")')) return;
      try { await api.del('/api/repos/' + b.dataset.del); toast('Repositorio eliminado.'); load(); }
      catch (err){ toast(err.message, 'err'); }
    });
  };

  root.querySelector('#r-create').onclick = async () => {
    const name = root.querySelector('#r-name').value.trim();
    const desc = root.querySelector('#r-desc').value.trim();
    if (!name) return toast('Escribe un nombre.', 'err');
    try {
      await api.post('/api/repos', { name, desc });
      toast(`Repositorio "${name}" creado.`);
      root.querySelector('#r-name').value = '';
      root.querySelector('#r-desc').value = '';
      load();
    } catch (err){ toast(err.message, 'err'); }
  };

  try { await load(); } catch (err){ toast(err.message, 'err'); }
}