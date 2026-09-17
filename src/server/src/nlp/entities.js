/* ---------- Extracción de entidades con patrones ---------- */

export const ENT_LABELS = {
  fechas: 'Fechas',
  montos: 'Montos y valores',
  correos: 'Correos electrónicos',
  telefonos: 'Teléfonos',
  identificaciones: 'Identificaciones',
  personas: 'Personas',
  organizaciones: 'Organizaciones'
};

export function extractEntities(text){
  const out = {
    fechas: [], montos: [], correos: [], telefonos: [],
    identificaciones: [], personas: [], organizaciones: []
  };
  const push = (arr, v) => {
    v = String(v).trim().replace(/\s+/g, ' ');
    if (v && !arr.includes(v) && arr.length < 12) arr.push(v);
  };
  const grab = r => { const a = []; let m; while ((m = r.exec(text))) a.push(m); return a; };

  const meses = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
  grab(new RegExp('\\b\\d{1,2}\\s+de\\s+(?:' + meses + ')\\s+(?:de\\s+)?\\d{4}\\b', 'gi')).forEach(x => push(out.fechas, x[0]));
  grab(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g).forEach(x => push(out.fechas, x[0]));
  grab(/\b\d{4}-\d{2}-\d{2}\b/g).forEach(x => push(out.fechas, x[0]));

  grab(/\b(?:COP|USD|EUR)\s?\$?\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b/g).forEach(x => push(out.montos, x[0]));
  grab(/\$\s?\d{1,3}(?:\.\d{3})+(?:,\d{2})?/g).forEach(x => push(out.montos, x[0]));
  grab(/\b\d{1,3}(?:[.,]\d{3})*\s?(?:pesos|dolares|dólares)\b/gi).forEach(x => push(out.montos, x[0]));

  grab(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g).forEach(x => push(out.correos, x[0]));

  grab(/(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3}[\s\-]?\d{2,4}(?:[\s\-]?\d{2,4})?/g).forEach(x => {
    const d = (x[0].match(/\d/g) || []).length;
    if (d >= 7 && d <= 11) push(out.telefonos, x[0]);
  });

  grab(/\b(?:NIT|N\.I\.T|CC|C\.C|CE)\.?\s*[:#]?\s*\d[\d.\-]{3,}/g).forEach(x => push(out.identificaciones, x[0]));

  grab(/\b(?:Sr|Sra|Srta|Dr|Dra|Don|Doña|Ing|Abg)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}/g)
    .forEach(x => push(out.personas, x[0]));

  grab(/\b(?:[a-záéíóúñ]{1,5}\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+(?:[a-záéíóúñ]{1,5}\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,3}\s+(?:S\.?\s?A\.?\s?S?\.?|Ltda\.?|S\.?\s?L\.?|&\s?Cía\.?)\b/g)
    .forEach(x => push(out.organizaciones, x[0]));
  grab(/\b(?:Fundación|Universidad|Empresa|Corporación|Compañía|Cooperativa|Banco|Hospital|Centro|Inversiones|Comercializadora|Distribuidora|Logística|TecnoSuministros|Colegio|Panadería|Escuela|Clínica|Constructora|Agencia)\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+){0,2}/g)
    .forEach(x => push(out.organizaciones, x[0]));

  return out;
}

export function toNum(v){
  let s = String(v).replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(/,/g, '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s) || 0;
}