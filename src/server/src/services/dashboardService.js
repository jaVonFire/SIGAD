import { db, parseJson } from '../db.js';
import { Index } from '../nlp/tfidf.js';

export const DashboardService = {
  all(){
    const docs = db.prepare('SELECT * FROM docs').all();
    const processed = docs.filter(d => d.status === 'procesado');
    const events = db.prepare('SELECT * FROM events ORDER BY ts DESC LIMIT 500').all();

    const words = processed.reduce((a, d) => a + (d.wordCount || 0), 0);
    const ents = processed.reduce((a, d) => a + Object.values(JSON.parse(d.entities || '{}') || {}).reduce((x, y) => x + y.length, 0), 0);

    const errorsByDoc = docs.filter(d => d.status === 'error').length;
    const errorsByEvent = events.filter(e => e.level === 'ERROR').length;
    const errors = errorsByDoc + errorsByEvent;

    const catCounts = ['Contrato', 'Factura', 'Correspondencia', 'Informe'].map(c => ({
      label: c, value: processed.filter(d => d.category === c).length,
      color: { Contrato:'#8C5A2B', Factura:'#3E6B4F', Correspondencia:'#B5401F', Informe:'#46628C' }[c]
    }));

    const fmtCounts = ['pdf', 'docx', 'txt'].map(e => ({ ext: e.toUpperCase(), value: docs.filter(d => d.ext === e).length }));

    const days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      const from = d.getTime(), to = from + 864e5;
      return { label: d.getDate(), count: events.filter(e => e.ts >= from && e.ts < to).length };
    });

    const totalByFmt = fmtCounts.reduce((a, b) => a + b.value, 0);
    const perCategory = {};
    for (const d of processed) if (d.category) perCategory[d.category] = (perCategory[d.category] || 0) + 1;

    return {
      docs: docs.length,
      processed: processed.length,
      pendientes: docs.filter(d => d.status === 'pendiente').length,
      procesando: docs.filter(d => d.status === 'procesando').length,
      errores: errors,
      words, entities: ents,
      index: Index.stats(),
      categories: catCounts,
      formats: fmtCounts,
      totalByFmt,
      perCategory,
      activity: days,
      recent: docs.sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 8).map(d => ({
        id: d.id, name: d.name, category: d.category, status: d.status, uploadedAt: d.uploadedAt, ext: d.ext
      })),
      events: events.slice(0, 8).map(e => ({ ts: e.ts, level: e.level, comp: e.comp, msg: e.msg, user: e.user }))
    };
  }
};