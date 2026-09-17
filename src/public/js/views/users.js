import { api } from '../api.js';
import { esc, toast, badge } from '../ui.js';

export async function render(root){
  root.innerHTML = `
    <div class="page-head"><div><h1>Usuarios</h1><div class="sub">Administración de perfiles y roles</div></div>
      <div class="row">
        <input class="input" id="u-name" placeholder="Nombre completo">
        <input class="input" id="u-user" placeholder="Usuario">
        <input class="input" id="u-pass" placeholder="Contraseña">
        <button class="btn" id="u-create">Crear usuario</button>
      </div>
    </div>
    <div class="card"><div id="users-list"><div class="empty">Cargando…</div></div></div>`;

  const load = async () => {
    const users = await api.get('/api/users');
    const box = root.querySelector('#users-list');
    if (!users.length){ box.innerHTML = '<div class="empty">Sin usuarios.</div>'; return; }
    box.innerHTML = `<table class="tbl"><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr>` +
      users.map(u => `<tr>
        <td><b>${esc(u.username)}</b></td>
        <td>${esc(u.name || '—')}</td>
        <td>
          <select class="select" style="width:130px" data-role="${u.id}">
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            <option value="analista" ${u.role === 'analista' ? 'selected' : ''}>analista</option>
          </select>
        </td>
        <td class="row">
          <button class="btn small ghost" data-reset="${u.id}" title="Restablecer a sigad2024">🔑 Reset</button>
          ${u.username !== 'admin' ? `<button class="btn small danger" data-del="${u.id}">✕</button>` : ''}
        </td></tr>`).join('') + `</table>`;

    box.querySelectorAll('[data-role]').forEach(s => s.onchange = async () => {
      try { await api.patch(`/api/users/${s.dataset.role}/role`, { role: s.value }); toast('Rol actualizado.'); }
      catch (err){ toast(err.message, 'err'); load(); }
    });
    box.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
      try { await api.post(`/api/users/${b.dataset.reset}/reset`); toast('Contraseña restablecida a sigad2024.'); }
      catch (err){ toast(err.message, 'err'); }
    });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este usuario?')) return;
      try { await api.del('/api/users/' + b.dataset.del); toast('Usuario eliminado.'); load(); }
      catch (err){ toast(err.message, 'err'); }
    });
  };

  root.querySelector('#u-create').onclick = async () => {
    const name = root.querySelector('#u-name').value.trim();
    const username = root.querySelector('#u-user').value.trim();
    const password = root.querySelector('#u-pass').value.trim();
    if (!name || !username || !password) return toast('Diligencia nombre, usuario y contraseña.', 'err');
    try {
      await api.post('/api/auth/register', { name, username, password });
      toast(`Usuario "${username}" creado.`);
      root.querySelector('#u-name').value = '';
      root.querySelector('#u-user').value = '';
      root.querySelector('#u-pass').value = '';
      load();
    } catch (err){ toast(err.message, 'err'); }
  };

  try { await load(); } catch (err){ toast(err.message, 'err'); }
}