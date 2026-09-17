import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from '../src/nlp/summarizer.js';
import { Index } from '../src/nlp/tfidf.js';
import { setDocsLoader, ask } from '../src/nlp/rag.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CORPUS = path.resolve(ROOT, '../Documentacion/10_Documentos_Prueba');

const fe001 = fs.readFileSync(path.join(CORPUS, 'FE-001.txt'), 'utf8');

test('summarizer: produce un resumen largo, concreto y en orden del documento', () => {
  const s = summarize(fe001, 10);
  assert.ok(s.length >= 4, 'debería devolver ≥4 oraciones, devolvió ' + s.length);
  assert.ok(s.every(x => typeof x === 'string' && x.length > 10));
  assert.ok(s.some(x => /\$|COP|total|\d/.test(x)), 'alguna oración debe ser concreta (valores/fechas)');
});

test('summarizer: elimina oraciones casi duplicadas', () => {
  const s = summarize('Hola mundo. Hola mundo otra vez. Hola mundo de nuevo. El valor total de la factura es de $500.000. La factura fue emitida el 12 de marzo de 2024. El cliente debe pagar antes del 10 de abril.', 6);
  const set = new Set(s.map(x => x.toLowerCase().slice(0, 10)));
  assert.equal(set.size, s.length, 'no debería haber duplicados');
});

test('rag: catálogo "¿cuáles documentos son informes?" responde con catálogo', async () => {
  Index.rebuild([
    { id: 'a1', text: 'informe ejecutivo de resultados y conclusiones del periodo analizando las variables observadas' },
    { id: 'b2', text: 'factura electronica de venta numero total a pagar iva valores' }
  ]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200 },
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('¿cuáles documentos son informes?');
  assert.equal(ans.type, 'answer');
  assert.equal(ans.intent, 'cat');
  assert.ok(ans.html.includes('INFORME-2024.txt'));
  assert.ok(!ans.html.includes('FE-099'));
});

test('rag: pregunta acotada a un documento usa solo ese documento', async () => {
  Index.rebuild([
    { id: 'a1', text: 'informe ejecutivo de resultados y conclusiones del periodo analizando las variables observadas' },
    { id: 'b2', text: 'factura electronica de venta numero total a pagar iva valores' }
  ]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200 },
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('¿quién emitió la factura?', { docId: 'b2' });
  assert.equal(ans.docId, 'b2');
  assert.equal(ans.docName, 'FE-099.txt');
  assert.ok(ans.sources.every(s => s.id === 'b2'), 'las fuentes deben acotarse a b2');
});

test('rag: "¿De qué trata?" acotado devuelve resumen (case-insensitive)', async () => {
  Index.rebuild([{ id: 'r1', text: fe001 }]);
  setDocsLoader(async () => [
    { id: 'r1', name: 'CT-RES.txt', status: 'procesado', category: 'Contrato', wordCount: 500, summary: ['Primera oración.', 'Segunda oración.', 'Tercera oración.'] }
  ]);
  const ans = await ask('¿De qué trata?', { docId: 'r1' });
  assert.equal(ans.type, 'answer');
  assert.ok(ans.html.includes('Resumen de'), 'debe devolver el bloque de resumen');
  assert.ok(ans.html.includes('Primera oración.'));
});

test('rag: aviso no sugiere repetir la misma pregunta', async () => {
  Index.rebuild([{ id: 'b2', text: 'factura electronica de venta numero total a pagar iva valores' }]);
  setDocsLoader(async () => [
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('¿Quiénes aparecen?', { docId: 'b2' });
  assert.equal(ans.type, 'none');
  assert.ok(!ans.html.includes('Quiénes aparecen'), 'no debe sugerir la misma pregunta');
});

test('rag: "¿de qué trata?" en general queda sin catálogo y sin resumen acotado', async () => {
  Index.rebuild([{ id: 'a1', text: 'informe ejecutivo de resultados y conclusiones del periodo analizando las variables observadas' }]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200, summary: ['x'] }
  ]);
  const ans = await ask('¿de qué trata?');
  assert.ok(['answer', 'none'].includes(ans.type));
});

test('rag: pregunta sobre documento NO procesado responde aviso', async () => {
  Index.rebuild([]);
  setDocsLoader(async () => [
    { id: 'x1', name: 'PENDIENTE.txt', status: 'pendiente', category: null, wordCount: 0 }
  ]);
  const ans = await ask('¿de qué trata?', { docId: 'x1' });
  assert.equal(ans.type, 'none');
  assert.ok(ans.html.includes('no ha sido procesado'));
});

test('rag: saludo devuelve respuesta de bienvenida con sugerencias', async () => {
  Index.rebuild([]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200 },
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('hola');
  assert.equal(ans.type, 'answer');
  assert.equal(ans.intent, 'saludo');
  assert.ok(ans.html.includes('2</b> documento'), 'debe mencionar la cantidad de documentos');
  assert.ok(ans.html.includes('¿Cuáles documentos son facturas?'));
});

test('rag: saludo acotado a un documento responde por ese documento', async () => {
  Index.rebuild([]);
  setDocsLoader(async () => [
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('buenas tardes', { docId: 'b2' });
  assert.equal(ans.intent, 'saludo');
  assert.ok(ans.html.includes('FE-099.txt'));
});

test('rag: "qué puedes hacer" responde con capacidades', async () => {
  Index.rebuild([]);
  setDocsLoader(async () => [
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('¿qué puedes hacer?');
  assert.equal(ans.type, 'answer');
  assert.equal(ans.intent, 'help');
  assert.ok(ans.html.includes('capacidades'));
});

test('rag: catálogo sin categoría agrupa por categoría con conteos', async () => {
  Index.rebuild([]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200 },
    { id: 'b2', name: 'FE-099.txt', status: 'procesado', category: 'Factura', wordCount: 300 }
  ]);
  const ans = await ask('¿qué documentos hay en el repositorio?');
  assert.equal(ans.intent, 'cat');
  assert.equal(ans.type, 'answer');
  assert.ok(ans.html.includes('2</b> documento'), 'debe mencionar el total');
  assert.ok(ans.html.includes('Informe'));
  assert.ok(ans.html.includes('Factura'));
});

test('rag: respuesta vacía incluye sugerencias generales', async () => {
  Index.rebuild([
    { id: 'a1', text: 'informe ejecutivo de resultados y conclusiones del periodo analizando las variables observadas' }
  ]);
  setDocsLoader(async () => [
    { id: 'a1', name: 'INFORME-2024.txt', status: 'procesado', category: 'Informe', wordCount: 1200 }
  ]);
  const ans = await ask('flurp quux');
  assert.equal(ans.type, 'none');
  assert.ok(ans.html.includes('Prueba con algo como'));
  assert.ok(ans.html.includes('¿Cuáles documentos son facturas?'));
});

test('rag: "resumen del documento" devuelve el resumen generado', async () => {
  const sum = summarize(fe001, 6);
  Index.rebuild([{ id: 'r1', text: fe001 }]);
  setDocsLoader(async () => [
    { id: 'r1', name: 'FE-RES.txt', status: 'procesado', category: 'Factura', wordCount: 500, summary: sum }
  ]);
  const ans = await ask('resume este documento', { docId: 'r1' });
  assert.equal(ans.type, 'answer');
  assert.ok(ans.html.includes('Resumen'));
  assert.ok(sum.every(s => ans.html.includes(s.slice(0, 30))), 'el resumen debe contener las oraciones generadas');
});