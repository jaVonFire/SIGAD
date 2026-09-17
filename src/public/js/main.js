import { api, session } from './api.js';
import { esc, toast } from './ui.js';
import { ROUTES, resolveRoute } from './router.js';
import * as loginView from './views/login.js';
import * as dashboard from './views/dashboard.js';
import * as docs from './views/docs.js';
import * as detail from './views/detail.js';
import * as chat from './views/chat.js';
import * as repos from './views/repos.js';
import * as logView from './views/log.js';
import * as users from './views/users.js';
import * as backup from './views/backup.js';

const VIEWS = { dashboard, docs, detail, chat, repos, log: logView, users, backup };

const root = () => document.getElementById('view');
const loginRoot = () => document.getElementById('login-view');
const appEl = () => document.getElementById('app');

function buildNav(){
  const me = session.getUser();
  const nav = document.getElementById('nav');
  nav.innerHTML = ROUTES
    .filter(r => !r.admin || (me && me.role === 'admin'))
    .map(r => `<a href="#/${r.path}" data-path="${r.path}">${r.label}</a>`).join('');
  const avatar = document.getElementById('me-avatar');
  const name = document.getElementById('me-name');
  const role = document.getElementById('me-role');
  avatar.textContent = (me?.name || me?.username || '?').charAt(0).toUpperCase();
  name.textContent = me?.name || me?.username || '—';
  role.textContent = me?.role || '—';
}

function applyAuthUI(){
  const authed = !!session.getToken();
  loginRoot().hidden = authed;
  appEl().hidden = !authed;
  if (authed) buildNav();
}

async function router(){
  const me = session.getUser();
  const token = session.getToken();
  if (!token){
    applyAuthUI();
    loginRoot().innerHTML = '';
    await loginView.render(loginRoot());
    return;
  }

  const { routePath, viewName, id } = resolveRoute(location.hash, me?.role);
  const route = ROUTES.find(r => r.path === routePath) || ROUTES[0];
  const params = { path: routePath, id };
  const view = VIEWS[viewName] || docs;

  applyAuthUI();
  const viewEl = root();
  viewEl.innerHTML = '<div class="empty">Cargando…</div>';
  document.querySelectorAll('#nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.path === route.path));

  try {
    await view.render(viewEl, params);
  } catch (err){
    if (/401|Autenticaci|token|vencid/i.test(String(err))){
      session.clear(true);
      location.reload();
      return;
    }
    viewEl.innerHTML = `<div class="empty">${esc(err.message || 'Error inesperado.')}</div>`;
  }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api.logout();
});

window.addEventListener('hashchange', router);
router();