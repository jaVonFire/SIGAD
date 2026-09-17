import { api } from '../api.js';
import { esc } from '../ui.js';

const INTENT_LABEL = { money: '💰 Valor / dinero', date: '📅 Fecha', who: '🏢 Entidad / persona', what: '📋 Contenido', cat: '📚 Catálogo', saludo: '👋 Saludo', help: '❓ Ayuda', none: '¬ Sin intención' };

const GENERAL_CHIPS = [
  '¿Qué documentos hay en el repositorio?',
  '¿Cuáles documentos son facturas?',
  '¿Cuáles documentos son informes?',
  '¿Qué documentos están pendientes de pago?',
  '¿Cuánto suman los valores de las facturas?',
  '¿Quién emitió las facturas?'
];

const DOC_CHIPS = [
  'Resume este documento',
  '¿De qué trata este documento?',
  '¿Qué valores o montos aparecen?',
  '¿Qué fechas menciona?',
  '¿Quiénes aparecen?',
  '¿Hay algo sobre pagos pendientes?'
];

const intentLabel = i => INTENT_LABEL[i] || INTENT_LABEL.what;

export async function render(root, params){
  const preDoc = (params && params.id) ? params.id : null;
  let docs = [];
  try { docs = await api.get('/api/docs?sort=name'); } catch (e) { docs = []; }
  let current = docs.find(d => d.id === preDoc) || null;
  let hist = [];

  root.innerHTML = `
    <div class="page-head"><div><h1>Consulta en lenguaje natural</h1>
      <div class="sub">Pregunta sobre <b>todos los documentos</b> o elige <b>uno en concreto</b> para que la IA responda solo sobre su contenido.</div>
    </div></div>
    <div class="card chat-box">
      <div class="scope-bar">
        <label class="dim">Consultando sobre:</label>
        <select class="select" id="doc-sel" style="width:min(420px,100%)">
          <option value="">📚 Todos los documentos</option>
          ${docs.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}
        </select>
        <button class="btn small ghost" id="doc-clear" hidden>✕ Quitar documento</button>
        <button class="btn small ghost danger" id="chat-clear">🗑 Limpiar conversación</button>
      </div>
      <div class="scope-banner" id="scope" hidden></div>
      <div class="chips" id="chips"></div>
      <div class="msgs" id="msgs"></div>
      <div class="chat-input">
        <input class="input" id="q" placeholder="Escribe una pregunta…" autocomplete="off">
        <button class="btn" id="send">Enviar</button>
      </div>
    </div>`;

  const sel = root.querySelector('#doc-sel');
  const scope = root.querySelector('#scope');
  const docClear = root.querySelector('#doc-clear');
  const chatClear = root.querySelector('#chat-clear');
  const msgs = root.querySelector('#msgs');
  const chips = root.querySelector('#chips');
  const inp = root.querySelector('#q');
  const send = root.querySelector('#send');

  const addMsg = (html, role, extra) => {
    const box = document.createElement('div');
    box.className = 'msg ' + role;
    box.innerHTML = html;
    if (extra){
      box.dataset.q = extra.q || '';
      box.dataset.docId = extra.docId || '';
      box.dataset.docName = extra.docName || '';
    }
    msgs.appendChild(box);
    return box;
  };
  const scrollBottom = () => { msgs.scrollTop = msgs.scrollHeight; };

  const metaUser = docName => `<span class="tag-chip">Tú</span>${docName ? ` 📄 ${esc(docName)}` : ' 📚 Todos'}`;
  const metaAi = (intent, conf, docName) =>
    `<span class="tag-chip">SIGAD IA</span> · ${esc(intentLabel(intent))} · confianza ${Math.round((conf || 0) * 100)}%` +
    (docName ? ` · 📄 ${esc(docName)}` : '');

  const sourcesFooter = sources => {
    if (!sources || !sources.length) return '';
    return `<div class="sources"><b>Fuentes</b>` +
      sources.map(s => `<span class="src"><b>[${esc(s.n || sources.indexOf(s) + 1)}]</b> <a href="#/docs/${esc(s.id)}">${esc(s.name)}</a>${s.category ? ` · ${esc(s.category)}` : ''}</span>`).join('') +
      `</div>`;
  };

  const renderMsgs = () => {
    /* Hilo por ámbito: solo muestra los mensajes de este documento (o la conversación general) */
    const scoped = hist.filter(m => current ? m.docId === current.id : !m.docId);
    msgs.innerHTML = '';
    if (!scoped.length){
      msgs.innerHTML = current
        ? `<div class="empty"><div class="empty-title">📄 Consultando ${esc(current.name)}</div>` +
          `<p>Este es un hilo nuevo. Pregunta sobre su contenido o usa una sugerencia de arriba.</p>` +
          `<p class="dim">La IA responderá <b>solo</b> con lo que diga este documento.</p></div>`
        : `<div class="empty"><div class="empty-title">📚 Consulta general</div>` +
          `<p>Pregunta en lenguaje natural sobre todos los documentos, o usa una sugerencia de arriba.</p>` +
          `<p class="dim">💡 Para hablar solo de un documento, selecciónalo arriba o usa el botón "💬" del listado.</p></div>`;
      scrollBottom();
      return;
    }
    for (const m of scoped){
      if (m.role === 'user'){
        addMsg(`<div class="meta">${metaUser(m.docName)}</div><div class="q">${esc(m.text)}</div>`, 'user');
      } else {
        let body = `<div class="meta">${metaAi(m.intent, m.conf, m.docName)}</div>`;
        body += m.type === 'answer' && m.html ? m.html : esc(m.text || m.q || '');
        body += sourcesFooter(m.sources);
        addMsg(body, 'ai');
      }
    }
    scrollBottom();
  };

  const renderScope = () => {
    sel.value = current ? current.id : '';
    if (current){
      scope.hidden = false;
      scope.innerHTML = `📄 <b>Consultando sobre:</b> <a href="#/docs/${esc(current.id)}">${esc(current.name)}</a> <span class="tag">${esc(current.category || 'sin categoría')}</span> — la IA responde SOLO con el contenido de este documento.`;
      docClear.hidden = false;
      chips.innerHTML = DOC_CHIPS.map(c => `<button class="btn small ghost">${esc(c)}</button>`).join('');
      inp.placeholder = `Pregunta sobre "${current.name}"…`;
    } else {
      scope.hidden = true;
      docClear.hidden = true;
      chips.innerHTML = GENERAL_CHIPS.map(c => `<button class="btn small ghost">${esc(c)}</button>`).join('');
      inp.placeholder = 'Ej.: ¿cuánto suman los pagos de las facturas?';
    }
    chips.querySelectorAll('button').forEach(b => b.onclick = () => { inp.value = b.textContent; submit(); });
    renderMsgs();
  };

  const ask = async text => {
    const docId = current ? current.id : '';
    const docName = current ? current.name : '';
    addMsg(`<div class="meta">${metaUser(docName)}</div><div class="q">${esc(text)}</div>`, 'user', { q: text, docId, docName });
    hist.push({ role: 'user', text, docId, docName });
    const busy = addMsg(`<div class="meta"><span class="tag-chip">SIGAD IA</span></div><span class="spin">⟳</span> Analizando${current ? ` ${esc(current.name)}` : ' los documentos'}…`, 'ai');
    scrollBottom();
    try {
      const a = await api.post('/api/ask', current ? { q: text, docId: current.id } : { q: text });
      busy.remove();
      let out = `<div class="meta">${metaAi(a.intent, a.conf, a.docName || docName)}</div>`;
      out += a.type === 'answer' ? (a.html || esc(a.text || a.answer || '')) : (a.html || esc(a.message || a.text || 'No encontré respuesta suficiente en el repositorio.'));
      out += sourcesFooter(a.sources);
      addMsg(out, 'ai');
      hist.push({ role: 'ai', q: text, type: a.type, intent: a.intent, conf: a.conf, html: a.html, sources: a.sources, docId: a.docId || docId, docName: a.docName || docName });
      scrollBottom();
    } catch (err){
      busy.remove();
      addMsg(`<div class="meta"><span class="tag-chip">⚠️ Error</span></div>${esc(err.message)}`, 'ai');
      scrollBottom();
    }
  };

  const submit = () => {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    ask(text);
  };

  const clearChat = async () => {
    const docId = current ? current.id : '';
    try {
      await api.del('/api/chat' + (current ? '?docId=' + encodeURIComponent(docId) : ''));
      if (current) hist = hist.filter(m => m.docId !== current.id);
      else hist = [];
      renderMsgs();
    } catch (err){ /* noop */ }
  };

  sel.addEventListener('change', () => {
    const next = docs.find(d => d.id === sel.value) || null;
    if (current && next && current.id === next.id) return;
    current = next;      /* cambio de ámbito → se muestra el hilo de ese ámbito (o vacío) */
    renderScope();
  });
  docClear.onclick = () => { if (!current) return; current = null; renderScope(); };
  chatClear.onclick = clearChat;
  send.onclick = submit;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  renderScope();

  try {
    hist = await api.get('/api/chat') || [];
    renderMsgs();
  } catch (err){ /* sin historial */ }
}