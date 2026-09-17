export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function toast(msg, type = 'ok'){
  const t = el(`<div class="toast ${type === 'ok' ? '' : 'err' }">${esc(msg)}</div>`);
  document.getElementById('toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

export function busy(btn, text, on){
  if (on) btn.dataset.label = btn.innerHTML;
  btn.innerHTML = on ? '<span class="spin">⟳</span> ' + text : btn.dataset.label || btn.innerHTML;
  btn.disabled = on;
}

export function fmtBytes(n){
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

export function fmtDate(ts){
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function badge(status){
  return `<span class="badge ${esc(status)}">${esc(status)}</span>`;
}

export function stat(label, value, color, hint){
  return `<div class="stat ${color || ''}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}

export function modal(title, bodyHtml, { actions = [] } = {}){
  const root = document.getElementById('modal-root');
  const box = el(`<div class="modal-backdrop"><div class="modal">
    <h3>${esc(title)}</h3>
    <div class="modal-body">${bodyHtml}</div>
    <div class="actions"></div>
  </div></div>`);
  const acts = box.querySelector('.actions');
  for (const a of actions){
    const b = el(`<button class="btn ${a.danger ? 'danger' : 'ghost'} ${a.primary ? '' : a.danger ? '' : ''}">${esc(a.label)}</button>`);
    if (a.primary) b.classList.add('btn');
    b.onclick = () => { a.onClick && a.onClick(b); };
    acts.appendChild(b);
  }
  box.addEventListener('click', e => { if (e.target === box) close(); });
  const close = () => { root.innerHTML = ''; };
  box.close = close;
  root.appendChild(box);
  return box;
}