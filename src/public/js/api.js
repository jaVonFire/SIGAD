const KEYS = { token: 'sigad_token', user: 'sigad_user' };

async function req(method, url, body){
  const headers = {};
  const token = session.getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (body instanceof FormData){
    payload = body; /* el navegador fija el Content-Type con boundary */
  } else if (body !== undefined){
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  const json = ct.includes('application/json') ? await res.json() : null;
  if (!res.ok){
    if (res.status === 401 && !url.includes('/auth/login')) session.clear(true);
    throw new Error(json?.error?.message || ('Error ' + res.status));
  }
  return json?.data;
}

export const session = {
  getToken(){ return localStorage.getItem(KEYS.token) || ''; },
  getUser(){ try { return JSON.parse(localStorage.getItem(KEYS.user)); } catch (e) { return null; } },
  save(token, user){ localStorage.setItem(KEYS.token, token); localStorage.setItem(KEYS.user, JSON.stringify(user)); },
  clear(redirect){
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.user);
    if (redirect) location.hash = '#/login';
  }
};

export const api = {
  get:  (url) => req('GET',  url),
  post: (url, b) => req('POST', url, b),
  patch:(url, b) => req('PATCH', url, b),
  del:  (url) => req('DELETE', url),

  async download(url, filename){
    const headers = {};
    const token = session.getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('No se pudo descargar el archivo.');
    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition') || '';
    const m = disp.match(/filename="?([^";]+)/);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = m ? m[1] : (filename || 'archivo');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },

  async login(username, password){
    const data = await req('POST', '/api/auth/login', { username, password });
    session.save(data.token, data.user);
    return data.user;
  },
  async logout(){ try { await req('POST', '/api/auth/logout'); } catch (e) { } session.clear(true); }
};