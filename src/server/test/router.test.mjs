import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, parseHash, resolveRoute } from '../../public/js/router.js';
import { parseJson } from '../src/db.js';

test('parseHash: #/docs/<id> extrae path e id', () => {
  assert.deepEqual(parseHash('#/docs/abc-123'), { path: 'docs', id: 'abc-123' });
});

test('parseHash: hash vacío resulta en path vacío sin id', () => {
  assert.deepEqual(parseHash(''), { path: '', id: null });
});

test('resolveRoute: #/docs/<id> despacha a la vista detail (admin)', () => {
  const r = resolveRoute('#/docs/abc-123', 'admin');
  assert.equal(r.routePath, 'docs');
  assert.equal(r.viewName, 'detail');
  assert.equal(r.id, 'abc-123');
});

test('resolveRoute: #/docs/<id> despacha a detail también para analista', () => {
  const r = resolveRoute('#/docs/abc-123', 'analista');
  assert.equal(r.routePath, 'docs');
  assert.equal(r.viewName, 'detail');
});

test('resolveRoute: #/docs sin id muestra el listado (docs)', () => {
  const r = resolveRoute('#/docs', 'admin');
  assert.equal(r.routePath, 'docs');
  assert.equal(r.viewName, 'docs');
});

test('resolveRoute: ruta desconocida cae en el panel (dashboard)', () => {
  const r = resolveRoute('#/nonexistente', 'admin');
  assert.equal(r.routePath, 'dashboard');
  assert.equal(r.viewName, 'dashboard');
});

test('resolveRoute: #/users es redirigido a docs para analista', () => {
  const r = resolveRoute('#/users', 'analista');
  assert.equal(r.routePath, 'docs');
  assert.equal(r.viewName, 'docs');
});

test('resolveRoute: #/users permanece en users para admin', () => {
  const r = resolveRoute('#/users', 'admin');
  assert.equal(r.routePath, 'users');
  assert.equal(r.viewName, 'users');
});

test('resolveRoute: #/docs/<id> con id numérico conserva el id', () => {
  const r = resolveRoute('#/docs/42', 'admin');
  assert.equal(r.viewName, 'detail');
  assert.equal(r.id, '42');
});

test('ROUTES: docs está registrado y detail no requiere ruta propia', () => {
  assert.ok(ROUTES.some(r => r.path === 'docs'));
  assert.ok(!ROUTES.some(r => r.path === 'detail'));
});

test('parseJson: desanida JSON doble-codificado (datos legados del seed)', () => {
  const ent = { fechas: ['15 de abril de 2024'], montos: ['COP $4,750,000'] };
  const anidado = JSON.stringify(JSON.stringify(JSON.stringify(ent)));
  const out = parseJson(anidado, {});
  assert.deepEqual(out, ent);
});

test('parseJson: JSON normal pasa igual y falla a fallback', () => {
  assert.deepEqual(parseJson(JSON.stringify(['a', 'b'])), ['a', 'b']);
  assert.equal(parseJson(undefined, 'FB'), 'FB');
  assert.equal(parseJson('no-json', null), null);
});