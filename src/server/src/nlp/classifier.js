import { tokenizar } from './tokenizer.js';

/* ---------- Clasificador Naive Bayes multinomial ----------
   Categorías: Contrato, Factura, Correspondencia, Informe.
   Se entrena con un corpus de dominio por categoría (vocabulario formal
   colombiano: NIT, IVA, cláusulas, memorandos, informes ejecutivos).
   Suavizado de Laplace + escala logarítmica para estabilidad numérica.
*/

export const CATEGORIES = ['Contrato', 'Factura', 'Correspondencia', 'Informe'];

const TRAIN = {
  Contrato: [
    'clausula primera objeto del contrato entre las partes',
    'las partes acuerdan celebrar el presente contrato de prestacion de servicios',
    'obligaciones y derechos del contratista y del contratante',
    'clausula penal por incumplimiento de las obligaciones contractuales',
    'contrato de arrendamiento de inmueble urbano canon mensual',
    'el arrendador entrega el inmueble al arrendatario en perfecto estado',
    'plazo contractual de doce meses con renovacion automatica',
    'terminacion anticipada del contrato por mutuo acuerdo de las partes',
    'garantia deposito en calidad de caucion del contrato',
    'representacion legal de las sociedades contratantes firma del documento'
  ],
  Factura: [
    'factura electronica de venta numero resolucion de facturacion',
    'subtotal impuesto sobre las ventas iva y total a pagar',
    'forma de pago transferencia electronica fecha de vencimiento',
    'concepto honorarios profesionales valor unitario y cantidad',
    'razon social del emisor y nit del vendedor comprador',
    'descuentos y retencion en la fuente aplicada a la factura',
    'medio de pago y moneda de la operacion comercial',
    'nota credito por devolucion asociada a la factura',
    'saldo pendiente de pago y estado de cartera vencida',
    'detalle de bienes y servicios prestados unidades y precio unitario'
  ],
  Correspondencia: [
    'por medio de la presente me dirijo a usted cordialmente',
    'estimado senor reciba un cordial saludo y mis mejores deseos',
    'atentamente firma del remitente y destinatario del comunicado',
    'memorando interno asunto politicas de la empresa',
    'circular informativa para todos los empleados de la organizacion',
    'agradecemos su pronta respuesta a esta comunicacion',
    'informamos que la reunion se realizara la proxima semana',
    'le notifico la renuncia presentada con el preaviso correspondiente',
    'solicito respetuosamente su colaboracion en este asunto',
    'comunicado oficial sobre el mantenimiento programado del sistema'
  ],
  Informe: [
    'informe ejecutivo de resultados y conclusiones del periodo',
    'metodologia aplicada para el analisis de los datos recolectados',
    'hallazgos y recomendaciones del estudio realizado',
    'indicadores de desempeno y porcentaje de cumplimiento',
    'antecedentes y objetivos especificos de la evaluacion',
    'grafica comparativa de las variables analizadas',
    'resumen ejecutivo con las conclusiones principales del informe',
    'analisis de las variables y comportamiento observado',
    'evaluacion del proyecto y desempeno del equipo de trabajo',
    'seccion de resultados con tablas y datos estadisticos'
  ]
};

let model = null;

function train(){
  const vocab = new Set();
  const cats = {};
  for (const [cat, docs] of Object.entries(TRAIN)){
    let total = 0;
    const counts = new Map();
    for (const d of docs) for (const t of tokenizar(d)){
      vocab.add(t);
      counts.set(t, (counts.get(t) || 0) + 1);
      total++;
    }
    cats[cat] = { total, counts };
  }
  model = { cats, V: vocab.size };
}

export function classify(text){
  if (!model) train();
  const toks = tokenizar(text);
  const entries = Object.entries(model.cats).map(([cat, m]) => {
    let s = 0;
    for (const t of toks) s += Math.log(((m.counts.get(t) || 0) + 1) / (m.total + model.V + 1));
    return { cat, log: s };
  });
  const mx = Math.max(...entries.map(e => e.log));
  const ex = entries.map(e => ({ cat: e.cat, p: Math.exp(e.log - mx) }));
  const sum = ex.reduce((a, b) => a + b.p, 0);
  return ex.map(e => ({ cat: e.cat, p: e.p / sum })).sort((a, b) => b.p - a.p);
}