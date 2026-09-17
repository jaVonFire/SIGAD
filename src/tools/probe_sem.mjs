// Prueba de valor semántico: busca consultas donde el modo semántico recupere
// documentos que el léxico (con expansión de sinónimos) no veía.
const B = 'http://localhost:3199/api';
const login = await (await fetch(B + '/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'sigad2024' })
})).json();
const T = login.data.token;
const H = { Authorization: 'Bearer ' + T };

for (const q of [
  'cuánto dinero se adeuda por mercancía recibida',
  'soportes de cobranza a clientes',
  'papeleo sobre abonos y saldos',
  'liquidación de honorarios por servicios prestados',
  'compromisos de pago firmados entre las partes',
  'documentos relativos a la entrega de bienes'
]) {
  const lex = (await (await fetch(B + '/search?q=' + encodeURIComponent(q), { headers: H })).json()).data;
  const sem = (await (await fetch(B + '/search?q=' + encodeURIComponent(q) + '&semantic=1', { headers: H })).json()).data;
  const lexIds = new Set(lex.map(x => x.id));
  const only = sem.filter(x => !lexIds.has(x.id));
  console.log(`\nQ: “${q}”`);
  console.log(`  léxica: ${lex.length} · semántica: ${sem.length} · solo-semánticos: ${only.length}`);
  only.slice(0, 3).forEach(x => console.log(`    → ${x.name} (cos ${x.cos.toFixed(3)})`));
}