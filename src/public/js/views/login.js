import { api } from '../api.js';
import { el, toast, busy } from '../ui.js';

export function render(root){
  root.innerHTML = `<div class="login-card">
    <div class="brand"><span class="brand-mark">S</span></div>
    <h1>SIGAD</h1>
    <p class="lead">Sistema Inteligente de Gestión y Análisis Documental</p>
    <form id="login-form">
      <label class="field"><span>Usuario</span>
        <input class="input" name="username" autocomplete="username" required>
      </label>
      <label class="field"><span>Contraseña</span>
        <input class="input" type="password" name="password" autocomplete="current-password" required>
      </label>
      <button class="btn" style="width:100%">Ingresar</button>
    </form>
    <div class="login-hint">
      Credenciales del proyecto:<br>
      <b>admin</b> / sigad2024 &nbsp;·&nbsp; <b>analista</b> / analista2024
    </div>
  </div>`;

  root.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const btn = e.currentTarget.querySelector('button');
    busy(btn, 'Ingresando…', true);
    try {
      await api.login(f.get('username'), f.get('password'));
      toast('¡Bienvenido!');
      location.hash = '#/dashboard';
    } catch (err){
      toast(err.message, 'err');
      busy(btn, 'Ingresar', false);
    }
  });
}