import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDefaults, importCorpus } from './src/services/seedService.js';
import { db } from './src/db.js';
import { Index } from './src/nlp/tfidf.js';
import { DocService } from './src/services/docService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS_DIR = path.resolve(__dirname, '../..', '11_Documentos_Prueba');

const args = process.argv.slice(2);
const doCorpus = !args.includes('--no-corpus');

ensureDefaults();
Index.rebuild(DocService.processedForIndex());

(async () => {
  if (doCorpus){
    console.log('[seed] Importando corpus desde', CORPUS_DIR);
    const r = await importCorpus(CORPUS_DIR);
    console.log('[seed] Resultado:', JSON.stringify(r));
  } else {
    console.log('[seed] Solo credenciales por defecto y repositorio General creados.');
  }
  db.close();
  process.exit(0);
})();