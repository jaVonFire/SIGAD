import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSummary } from '../src/nlp/analyst.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CORPUS = path.resolve(ROOT, '../11_Documentos_Prueba');

const read = f => fs.readFileSync(path.join(CORPUS, f), 'utf8');
const ct004 = read('CT-004.txt');
const fe001 = read('FE-001.txt');
const in007 = read('IN-007.txt');
const co001 = read('CO-001.txt');

test('analyst: contrato — redacta análisis con objeto, partes, cifra y plazo', () => {
  const s = analyzeSummary(ct004, { name: 'CT-004.txt', category: 'Contrato' });
  assert.ok(s.length >= 3, 'debería devolver ≥3 oraciones, devolvió ' + s.length);
  assert.ok(s.every(x => /[.!?]$/.test(x)), 'toda oración debe terminar en puntuación');
  assert.ok(s[0].includes('contrato'), 'la intro describe el tipo de documento');
  assert.ok(s.some(x => /mantenimiento preventivo/i.test(x)), 'incluye el objeto');
  assert.ok(s.some(x => /4,750,000/.test(x)), 'incluye la cifra del contrato');
  assert.ok(s.some(x => /Intervienen/.test(x)), 'incluye las partes');
  assert.ok(s.some(x => /Energia Industrial del Oriente/.test(x)), 'incluye la organización completa (sin colar "Entre")');
});

test('analyst: factura — total, forma de pago y organismos', () => {
  const s = analyzeSummary(fe001, { name: 'FE-001.txt', category: 'Factura' });
  assert.ok(s.length >= 3);
  assert.ok(s[0].includes('factura'));
  assert.ok(s.some(x => /Total a pagar/.test(x)), 'incluye el total a pagar');
  assert.ok(s.some(x => /Servicios Contables Andes/.test(x)), 'incluye la empresa principal');
  assert.ok(s.every(x => x.length > 12), 'sin oraciones vacías');
});

test('analyst: informe — conclusión y recomendaciones sintetizadas', () => {
  const s = analyzeSummary(in007, { name: 'IN-007.txt', category: 'Informe' });
  assert.ok(s.length >= 3);
  assert.ok(s.some(x => /96%/.test(x) || /96/.test(x)), 'incluye indicadores del resumen ejecutivo');
  assert.ok(s.some(x => /Recomendaciones/.test(x)), 'incluye recomendaciones del informe');
  assert.ok(s.some(x => /Conclusi/.test(x)), 'incluye la conclusión');
  const dup = new Set(s.map(x => x.toLowerCase()));
  assert.equal(dup.size, s.length, 'no repite el resumen ejecutivo como fragmento');
});

test('analyst: correspondencia — usa el asunto como tema y no mezcla "Para" en la persona', () => {
  const s = analyzeSummary(co001, { name: 'CO-001.txt', category: 'Correspondencia' });
  assert.ok(s.length >= 3);
  assert.ok(s[0].includes('comunicación'), 'la intro describe una comunicación');
  assert.ok(s.some(x => /pol[ií]tica de trabajo h[ií]brido/i.test(x)), 'usa el asunto del memo');
  assert.ok(s.some(x => /Ricardo Gomez Pena/.test(x) && !/Pena Para/.test(x)), 'persona sin "Para" pegado');
});

test('analyst: todas las oraciones son analíticas legibles (puntuación, sin fragmentos aislados)', () => {
  const casos = [
    analyzeSummary(ct004, { name: 'CT-004.txt', category: 'Contrato' }),
    analyzeSummary(fe001, { name: 'FE-001.txt', category: 'Factura' }),
    analyzeSummary(in007, { name: 'IN-007.txt', category: 'Informe' }),
    analyzeSummary(co001, { name: 'CO-001.txt', category: 'Correspondencia' })
  ];
  for (const s of casos){
    assert.ok(s.length >= 3);
    assert.ok(s.every(x => typeof x === 'string' && x.length > 10));
    assert.ok(s.every(x => /[.!?]$/.test(x)));
  }
});