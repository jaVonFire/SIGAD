/* ---------- Tokenización en español ----------
   Normalización, filtrado de stopwords y stemming ligero por sufijos.
   Es el preprocesamiento compartido por clasificación, resumen, TF-IDF y RAG.
*/

const STOPWORDS = new Set((
  'de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si ' +
  'porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra ' +
  'otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra tanto estos quienes nada muchos cual poco ' +
  'ella estar estas algunas algo nosotros mis tu te ti tus ellas usted ustedes ser es son fue fueron era han ha hemos haber ' +
  'tiene tienen tener sido muy ya cada vez aun sino'
).split(' ').filter(w => w.length > 1));

const SUFIJOS = [
  'aciones','amiento','imientos','acion','cion','sion','mente','idades','idad',
  'istas','ista','antes','ante','encias','encia','anzas','anza','ativa','ativo',
  'ivas','ivos','osos','osa','able','ible','iento'
];

export function stemEs(w){
  if (w.length <= 5) return w;
  for (const s of SUFIJOS){
    if (w.length - s.length >= 4 && w.endsWith(s)) return w.slice(0, -s.length);
  }
  if (w.endsWith('es') && w.length - 2 >= 4) return w.slice(0, -2);
  if (w.endsWith('s')  && w.length - 1 >= 4) return w.slice(0, -1);
  return w;
}

export function tokenizar(text){
  const raw = String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (raw.match(/[a-z0-9]{2,}/g) || [])
    .filter(w => !STOPWORDS.has(w))
    .map(stemEs);
}

export const sentences = text =>
  String(text).split(/\n+/).flatMap(p => (p.match(/[^.!?]+[.!?]+/g) || [p]));

export const countWords = text => String(text).split(/\s+/).filter(Boolean).length;

/* ---------- Expansión léxica para búsqueda y consulta ---------- */
const SYN_GROUPS = [
  ['pago','factura','valor','saldo','abono','pagar','pendiente','total'],
  ['contrato','clausula','acuerdo','partes','contratante','contratista','celebrar'],
  ['plazo','vence','vencimiento','fecha','vigencia','renovacion','terminacion'],
  ['empleado','trabajador','personal','nomina','salario','sueldo'],
  ['empresa','compañia','organizacion','razon','social','sociedad'],
  ['informe','analisis','resultado','conclusion','indicador','hallazgo'],
  ['servicio','honorario','profesional','mantenimiento'],
  ['arrendamiento','canon','inmueble','arriendo','arrendador','arrendatario'],
  ['reunion','acta','comite','sesion','asistente'],
  ['seguridad','politica','confidencialidad','dato','proteccion']
];

export function expand(q){
  const base = tokenizar(q);
  const out = new Map();
  base.forEach(t => out.set(t, 1));
  base.forEach(t => {
    for (const g of SYN_GROUPS){
      const gs = g.map(stemEs);
      if (gs.includes(t)) gs.forEach(s2 => { if (s2 !== t) out.set(s2, Math.max(out.get(s2) || 0, 0.7)); });
    }
  });
  return [...out].map(([t, w]) => ({ t, w }));
}