// Captura automática del chat por documento de SIGAD para el informe de
// pruebas. Necesita: servidor en :3200 con corpus cargado, y playwright-core
// instalado en el prefijo indicado (PW_DIR). Continúa la numeración de las
// capturas del informe de funcionamiento (primera imagen 13_...).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const PW_DIR = 'C:/Users/javie/AppData/Local/Temp/opencode/pw';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3200';
const OUT = 'C:/Users/javie/OneDrive/Desktop/UTS/Sis Empresariales/sigad/04_Pruebas/imagenes';

const require = createRequire(path.join(PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser, page;
let stepNum = 13;

async function step(name, fn){
  await fn();
  await page.screenshot({ path: path.join(OUT, `${String(stepNum++).padStart(2, '0')}_${name}.png`) });
}

async function login(user, pass){
  await page.waitForSelector('#login-form');
  await page.fill('input[name=username]', user);
  await page.fill('input[name=password]', pass);
  await Promise.all([
    page.waitForSelector('#view h1', { timeout: 15000 }),
    page.click('#login-form button')
  ]);
  await sleep(1200);
}

const go = p => page.goto(BASE + '/#/' + p, { waitUntil: 'domcontentloaded' }).then(() => sleep(700));

async function ask(q){
  await page.fill('#view #q', q);
  const before = await page.locator('#view .msg.ai').count();
  await page.click('#view #send');
  await page.waitForFunction(n => document.querySelectorAll('#view .msg.ai').length > n, before, { timeout: 25000 });
  await page.waitForSelector('#view .msg.ai .sources', { timeout: 15000 }).catch(() => {});
  await sleep(1100);
}

browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await login('admin', 'sigad2024');

/* Listado de documentos con el botón 💬 */
await go('docs');
await page.waitForSelector('#view #docs-list a[href^="#/docs/"]', { timeout: 20000 }).catch(async e => {
  console.log('DOCS DUMP =>', await page.evaluate(() => document.querySelector('#view').innerText.slice(0, 400)));
  throw e;
});
await step('13_chat_listado', () => page.waitForTimeout(300));

/* Elegir una factura (FE-*) o el primer documento de la lista */
let chosen = null;
const rows = await page.$$('#view #docs-list tbody tr');
for (const r of rows){
  const txt = await r.textContent();
  if (/FE-/i.test(txt)){ chosen = r; break; }
}
if (!chosen) chosen = rows[0];
const btn = await chosen.$('[data-chat]');
if (!btn) throw new Error('No se encontró el botón 💬 en la fila elegida.');
await btn.click();
await page.waitForSelector('#view #scope:not([hidden])', { timeout: 15000 });
await page.waitForSelector('#view #chips button', { timeout: 15000 });
const docId = await page.evaluate(() => location.hash.split('/').pop());
const scopeText = await page.evaluate(() => document.querySelector('#view #scope').textContent);
console.log('Ámbito =>', await page.evaluate(() => location.hash), '|', scopeText.replace(/\s+/g, ' ').trim());

await step('14_chat_ambito', () => page.waitForTimeout(400));

/* Pregunta predeterminada: Resume este documento */
await page.click('#view #chips button:has-text("Resume este documento")');
await page.waitForSelector('#view .msg.ai .sources', { timeout: 25000 });
await sleep(1200);
await step('15_chat_resumen', () => page.waitForTimeout(100));

/* ¿Qué valores o montos aparecen? */
await ask('¿Qué valores o montos aparecen?');
await step('16_chat_valores', () => page.waitForTimeout(100));

/* ¿Qué fechas menciona? */
await ask('¿Qué fechas menciona?');
await step('17_chat_fechas', () => page.waitForTimeout(100));

/* ¿Hay algo sobre pagos pendientes? */
await ask('¿Hay algo sobre pagos pendientes?');
await step('18_chat_pagos', () => page.waitForTimeout(100));

/* Quitar documento -> ámbito general */
await page.click('#view #doc-clear');
await page.waitForSelector('#view #scope[hidden]', { timeout: 5000 }).catch(() => {});
await sleep(600);
await step('19_chat_general', () => page.waitForTimeout(100));

/* Consulta general con respuesta */
await ask('¿Cuánto suman los valores de las facturas?');
await step('20_chat_general_respuesta', () => page.waitForTimeout(100));

/* Limpiar conversación del ámbito general */
await page.click('#view #chat-clear');
await sleep(700);
await step('21_chat_limpiar', () => page.waitForTimeout(100));

/* Restaurar historial: borra el hilo del documento y el general por API */
await page.evaluate(id => fetch('/api/chat?docId=' + encodeURIComponent(id), { method: 'DELETE' }).then(r => r.json()), docId).catch(() => {});
await page.evaluate(() => fetch('/api/chat', { method: 'DELETE' }).then(r => r.json())).catch(() => {});

await browser.close();
console.log('CAPTURAS CHAT OK: ' + (stepNum - 13) + ' pantallas en ' + OUT);