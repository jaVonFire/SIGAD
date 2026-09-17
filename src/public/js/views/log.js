import { api, session } from '../api.js';
import { esc, toast, badge, fmtDate } from '../ui.js';

export async function render(root){
  const me = session.getUser();
  root.innerHTML = `
    <div class="page-head"><div><h1>Bitácora de eventos</h1><div class="sub">Registro de errores y estados del sistema</div></div>
      <div class="row">
        <select class="select" id="f-level"><option value="">Todos los niveles</option><option>INFO</option><option>WARN</option><option>ERROR</option></select>
        ${me.role === 'admin' ? '<button class="btn small danger" id="btn-clear">Vaciar bitácora</button>' : ''}
      </div>
    </div>
    <div class="card"><div id="log-list"><div class="empty">Cargando…</div></div></div>`;

  const load = async () => {
    const level = root.querySelector('#f-level').value;
    const qs = level ? '?level=' + level : '';
    const evs = await api.get('/api/events' + qs);
    const box = root.querySelector('#log-list');
    if (!evs.length){ box.innerHTML = '<div class="empty">Sin eventos para mostrar.</div>'; return; }
    box.innerHTML = `<table class="tbl"><tr><th>Fecha</th><th>Nivel</th><th>Componente</th><th>Mensaje</th><th>Usuario</th></tr>` +
      evs.map(e => `<tr>
        <td class="dim">${fmtDate(e.ts)}</td>
        <td>${badge((e.level || '').toLowerCase())}</td>
        <td>${esc(e.comp)}</td>
        <td class="dim">${esc(e.msg)}</td>
        <td>${esc(e.user)}</td></tr>`).join('') + `</table>`;
  };

  root.querySelector('#f-level').addEventListener('change', load);
  const btn = root.querySelector('#btn-clear');
  if (btn) btn.onclick = async () => {
    if (!confirm('¿Limpiar toda la bitácora?')) return;
    try { await api.del('/api/events'); toast('Bitácora vaciada.'); load(); }
    catch (err){ toast(err.message, 'err'); }
  };

  try { await load(); } catch (err){ toast(err.message, 'err'); }
}