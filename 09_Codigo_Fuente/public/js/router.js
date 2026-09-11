export const ROUTES = [
  { path: 'dashboard', label: '📊 Panel', auth: true },
  { path: 'docs', label: '📄 Documentos', auth: true },
  { path: 'chat', label: '🤖 Consulta IA', auth: true },
  { path: 'repos', label: '🗂 Repositorios', auth: true },
  { path: 'log', label: '📜 Bitácora', auth: true },
  { path: 'users', label: '👥 Usuarios', auth: true, admin: true },
  { path: 'backup', label: '💾 Respaldo', auth: true, admin: true }
];

export function parseHash(hash){
  const h = String(hash || '').replace(/^#\//, '');
  const [path, ...rest] = h.split('/');
  return { path, id: rest[0] ?? null };
}

export function resolveRoute(hash, role){
  const params = parseHash(hash);
  let route = ROUTES.find(r => r.path === params.path) || ROUTES[0];
  if (route.admin && role !== 'admin') route = ROUTES.find(r => r.path === 'docs');
  const viewName = route.path === 'docs' && params.id ? 'detail' : route.path;
  return { routePath: route.path, viewName, id: params.id };
}