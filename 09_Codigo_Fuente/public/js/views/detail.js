import { api } from '../api.js';
import { esc, badge, fmtBytes, fmtDate, toast, busy } from '../ui.js';

const ENT_LABELS = {
  fechas: 'Fechas', montos: 'Montos y valores', correos: 'Correos', telefonos: 'Teléfonos',
  identificaciones: 'Identificaciones', personas: 'Personas', organizaciones: 'Organizaciones',
  ids: 'Identificadores'
};

export async function render(root, params){
  const id = params.id;
  root.innerHTML = '<div class="page-head"><div><h1 id="title">Cargando…</h1><div class="sub" id="sub"></div></div><div class="row" id="actions"></div></div>' +
    '<div class="grid cards" id="meta"></div>' +
    '<div class="grid cols-2" style="margin-top:14px"><div class="card" id="sum"><h2>Resumen ejecutivo (IA)</h2></div><div class="card" id="probs"><h2>Clasificación automática</h2><div class="hint dim" style="font-size:12px;margin-bottom:10px">Confianza del modelo por categoría (0–100%). La de mayor porcentaje es la categoría asignada.</div></div></div>' +
    '<div class="card" style="margin-top:14px"><h2>Entidades extraídas</h2><div id="ents"></div></div>';

  let busyProcess = false;

  const load = async () => {
    const d = await api.get('/api/docs/' + id);
    root.querySelector('#title').textContent = d.name;
    root.querySelector('#sub').innerHTML = `${badge(d.status)} ${d.status === 'error' ? '— ' + esc(d.error) : ''} subido por ${esc(d.ownerName)} · ${fmtDate(d.uploadedAt)}`;

    root.querySelector('#meta').innerHTML =
      `<div class="stat"><div class="label">Categoría IA</div><div class="value">${esc(d.category || '—')}</div><div class="hint">Clasificación automática del documento</div></div>` +
      `<div class="stat green"><div class="label">Palabras</div><div class="value">${d.wordCount?.toLocaleString('es-CO') || '—'}</div></div>` +
      `<div class="stat green"><div class="label">Formato</div><div class="value">${esc(d.ext.toUpperCase())}</div></div>` +
      `<div class="stat teal"><div class="label">Tamaño</div><div class="value">${fmtBytes(d.size)}</div></div>` +
      `<div class="stat"><div class="label">Páginas</div><div class="value">${d.pages || '—'}</div><div class="hint">Aplica a PDF</div></div>` +
      `<div class="stat"><div class="label">Repositorio</div><div class="value" style="font-size:18px">${esc(d.repoName || d.repoId)}</div></div>` +
      `<div class="stat orange"><div class="label">Procesado con IA</div><div class="value" style="font-size:17px">${d.analysisAt ? fmtDate(d.analysisAt) : 'Pendiente'}</div></div>`;

    root.querySelector('#sum').innerHTML = d.summary && d.summary.length
      ? d.summary.map(s => `<p style="margin:5px 0;line-height:1.5">• ${esc(s)}</p>`).join('')
      : '<div class="empty">Aún sin resumen. Procesa el documento con IA.</div>';

    const probs = Array.isArray(d.categoryProbs) ? d.categoryProbs : [];
    root.querySelector('#probs').innerHTML = probs.length
      ? probs.slice().sort((a, b) => b.p - a.p).map(pr => {
          const pct = Number.isFinite(Number(pr.p)) ? Math.round(pr.p * 100) : 0;
          return `<div class="hbar"><span class="lbl">${esc(pr.cat)}</span>
            <div class="track"><div class="fill" style="width:${pct}%;background:var(--accent)"></div></div>
            <span class="num">${pct}%</span></div>`;
        }).join('')
      : '<div class="empty">Sin probabilidades.</div>';

    const ents = d.entities || {};
    const rows = Object.entries(ents).filter(([, v]) => v && v.length);
    root.querySelector('#ents').innerHTML = rows.length
      ? `<table class="tbl entities"><tr><th>Entidad</th><th>Valores detectados</th></tr>` +
        rows.map(([k, v]) => `<tr><td><b>${esc(ENT_LABELS[k] || k)}</b></td><td>${v.map(x => esc(x)).join(' · ')}</td></tr>`).join('') + `</table>`
      : '<div class="empty">Procesa el documento para extraer entidades (fechas, valores, NIT, cuentas, teléfonos, correos, identificadores).</div>';

    /* Limpia antes de reconstruir para no duplicar botones en reproceso */
    const acts = root.querySelector('#actions');
    acts.innerHTML = '';

    if (d.status !== 'procesado'){
      const b = document.createElement('button');
      b.className = 'btn';
      b.innerHTML = '▶ Procesar con IA';
      b.onclick = async () => {
        if (busyProcess) return;
        busyProcess = true;
        busy(b, 'Analizando…', true);
        try {
          const r = await api.post(`/api/docs/${id}/process`);
          toast(r.doc.status === 'procesado' ? 'Procesado ✔' : r.error, r.doc.status === 'error' ? 'err' : 'ok');
        } catch (err){ toast(err.message, 'err'); }
        finally {
          busyProcess = false;
          busy(b, 'Procesar', false);
          load();
        }
      };
      acts.appendChild(b);
    }
    const re = document.createElement('button');
    re.className = 'btn small ghost';
    re.textContent = d.status === 'procesando' ? '⏳ Procesando…' : '↻ Reprocesar';
    re.disabled = d.status === 'procesando' || busyProcess;
    re.onclick = async () => {
      if (busyProcess) return;
      busyProcess = true;
      re.disabled = true;
      try {
        await api.post(`/api/docs/${id}/process`);
        toast('Reprocesado.');
      } catch (err){ toast(err.message, 'err'); }
      finally { busyProcess = false; load(); }
    };
    acts.appendChild(re);
    const dl = document.createElement('button');
    dl.className = 'btn small ghost';
    dl.textContent = '⬇ Descargar';
    dl.onclick = () => api.download(`/api/docs/${id}/download`).catch(err => toast(err.message, 'err'));
    acts.appendChild(dl);
    const chat = document.createElement('button');
    chat.className = 'btn small ghost';
    chat.innerHTML = '💬 Consultar en el chat';
    chat.onclick = () => { location.hash = '#/chat/' + id; };
    acts.appendChild(chat);
    const del = document.createElement('button');
    del.className = 'btn small danger';
    del.textContent = '✕ Eliminar';
    del.onclick = async () => {
      if (!confirm('¿Eliminar este documento?')) return;
      try { await api.del(`/api/docs/${id}`); toast('Eliminado.'); location.hash = '#/docs'; }
      catch (err){ toast(err.message, 'err'); }
    };
    acts.appendChild(del);

    /* Refresco automático si sigue procesando */
    if (d.status === 'procesando'){
      setTimeout(load, 1800);
    }
  };

  try { await load(); } catch (err){ root.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}