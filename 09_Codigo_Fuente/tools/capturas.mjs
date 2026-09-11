// Captura automática de pantallas del aplicativo SIGAD para el informe de
// pruebas de funcionamiento. Necesita: servidor en :3200 con corpus cargado,
// y playwright-core instalado en el prefijo indicado (PW_DIR).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const PW_DIR = 'C:/Users/javie/AppData/Local/Temp/opencode/pw';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3200';
const OUT = 'C:/Users/javie/OneDrive/Desktop/UTS/Sis Empresariales/sigad/04_Pruebas/imagenes';
const PROC_FILE = 'C:/Users/javie/AppData/Local/Temp/opencode/subida/PRUEBA-OPERATIVA-001.txt';
const EMPTY_FILE = 'C:/Users/javie/AppData/Local/Temp/opencode/subida/ERROR-VACIO.txt';

const require = createRequire(path.join(PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser, page;
let stepNum = 1;

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

const go = p => page.goto(BASE + '/#' + p, { waitUntil: 'domcontentloaded' }).then(() => sleep(700));
const nav = p => page.click(`a[data-path="${p}"]`).then(() => sleep(900));

browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
page = await ctx.newPage();

/* ---------- ADMIN ---------- */
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await step('01_login', () => page.waitForSelector('#login-form'));

await login('admin', 'sigad2024');
await step('02_panel', () => page.waitForTimeout(200));

await nav('docs');
await step('03_documentos', () => page.waitForSelector('#view #docs-list'));

const href = await page.waitForSelector('#view #docs-list table a[href^="#/docs/"]', { timeout: 15000 }).catch(() => null);
if (!href) throw new Error('No se renderizó la tabla de documentos.');
const target = await page.getAttribute('#view #docs-list table a[href^="#/docs/"]', 'href');
console.log('href =>', target);
await page.evaluate(h => { location.hash = h; }, target);
await page.waitForFunction(() => location.hash.startsWith('#/docs/'), { timeout: 5000 }).then(async () => {
  console.log('hash ok =>', await page.evaluate(() => location.hash));
});
await page.waitForSelector('#view #meta .stat', { timeout: 20000 }).catch(async () => {
  throw new Error('Detalle no renderizado. url=' + await page.evaluate(() => location.hash) + ' body: ' + (await page.evaluate(() => document.getElementById('view').innerText.slice(0, 200))));
});
await sleep(700);
await step('04_detalle_ia', () => page.waitForTimeout(100));

await nav('chat');
await page.fill('#view #q', '¿Cuál es el valor total de las facturas?');
await page.click('#view #send');
await page.waitForSelector('#view .msg.ai .sources', { timeout: 25000 });
await sleep(800);
await step('05_consulta_ia', () => page.waitForTimeout(100));

await nav('repos');
await page.fill('#view #r-name', 'Expediente Pruebas 2026');
await page.fill('#view #r-desc', 'Repositorio creado como evidencia de la prueba operativa.');
await page.click('#view #r-create');
await page.waitForSelector('#view tbody tr:has-text("Expediente Pruebas 2026")', { timeout: 8000 });
await sleep(500);
await step('06_repositorios', () => page.waitForTimeout(100));

await nav('users');
await step('07_usuarios', () => page.waitForSelector('#view #u-create'));

await nav('log');
await step('08_bitacora', () => page.waitForSelector('#view table'));

/* Carga de un documento y caso de error */
await nav('docs');
await page.waitForSelector('#view #file-input', { state: 'attached' });
await page.setInputFiles('#view #file-input', PROC_FILE);
await page.waitForSelector('#view td:has-text("PRUEBA-OPERATIVA-001.txt")', { timeout: 15000 });
await sleep(2500);
await page.waitForFunction(() => {
  const row = [...document.querySelectorAll('#view tbody tr')].find(r => r.textContent.includes('PRUEBA-OPERATIVA-001.txt'));
  return row && !row.textContent.includes('Procesando');
}, { timeout: 20000 });
await sleep(700);
await step('09_carga_documento', () => page.waitForTimeout(100));

await page.setInputFiles('#view #file-input', EMPTY_FILE);
await page.waitForSelector('#view td:has-text("ERROR-VACIO.txt")', { timeout: 15000 });
await sleep(1200);
await step('10_caso_error', () => page.waitForTimeout(100));

/* ---------- ANALISTA ---------- */
await page.click('#btn-logout');
await page.waitForSelector('#login-form', { timeout: 15000 });
await login('analista', 'analista2024');
await page.waitForSelector('#view h1');
await step('11_analista_menu', () => page.waitForTimeout(400));

await page.goto(BASE + '/#/users', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#view h1');
await sleep(1200);
await step('12_analista_redirect', () => page.waitForTimeout(200));

await browser.close();
console.log('CAPTURAS OK: ' + (stepNum - 1) + ' pantallas en ' + OUT);