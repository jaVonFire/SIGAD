import { api } from '../api.js';
import { esc, toast, busy } from '../ui.js';

export async function render(root){
  root.innerHTML = `
    <div class="page-head"><div><h1>Respaldo y mantenimiento</h1><div class="sub">Exportación / restauración de la base de datos y re-importación del corpus</div></div></div>
    <div class="grid cols-2">
      <div class="card">
        <h2>Exportar respaldo</h2>
        <p class="dim">Descarga un JSON con repositorios, documentos, historial de chat y bitácora (sin contraseñas ni archivos).</p>
        <button class="btn" id="btn-export">Descargar respaldo JSON</button>
      </div>
      <div class="card">
        <h2>Restaurar respaldo</h2>
        <p class="dim">Pega el contenido JSON de un respaldo y restaura (solo administrador).</p>
        <textarea class="textarea" id="restore-json" placeholder='{ "users": [...], "repos": [...], ... }'></textarea>
        <div style="margin-top:10px"><button class="btn" id="btn-restore">Restaurar</button></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h2>Corpus de prueba</h2>
      <p class="dim">Re-importa los documentos de la carpeta <b>Documentacion/10_Documentos_Prueba</b> (construidos con el generador del proyecto) cuando se haya modificado o limpiado la base de datos.</p>
      <button class="btn small" id="btn-seed">Importar corpus (33 documentos)</button>
    </div>`;

  root.querySelector('#btn-export').onclick = async () => {
    try {
      const data = await api.get('/api/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const d = new Date();
      a.download = `SIGAD-respaldo-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
      toast('Respaldo exportado.');
    } catch (err){ toast(err.message, 'err'); }
  };

  root.querySelector('#btn-restore').onclick = async () => {
    const txt = root.querySelector('#restore-json').value.trim();
    if (!txt) return toast('Pega el contenido del respaldo.', 'err');
    let data;
    try { data = JSON.parse(txt); } catch (e) { return toast('JSON inválido.', 'err'); }
    const btn = root.querySelector('#btn-restore');
    busy(btn, 'Restaurando…', true);
    try { const r = await api.post('/api/backup/restore', data); toast(`Restauración completada: ${r.restored || ''}`); }
    catch (err){ toast(err.message, 'err'); }
    busy(btn, 'Restaurar', false);
  };

  root.querySelector('#btn-seed').onclick = async () => {
    const btn = root.querySelector('#btn-seed');
    busy(btn, 'Importando…', true);
    try { const r = await api.post('/api/seed/corpus'); toast(`Corpus: ${r.total} totales, ${r.ok} importados, ${r.dup} duplicados, ${r.failed} fallidos.`); }
    catch (err){ toast(err.message, 'err'); }
    busy(btn, 'Importar corpus', false);
  };
}