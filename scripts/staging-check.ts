import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export { stagingProblems } from '../lib/deployment-config';
import { stagingProblems, type Environment } from '../lib/deployment-config';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--env-file' || !args[1]) {
    console.error('Uso: npm run staging:check -- --env-file .env.staging.local');
    console.error('Legge solo il file indicato; nessun fallback a .env.local o variabili della shell.');
    process.exitCode = 1;
    return;
  }
  let env: Environment;
  try { env = parseEnv(await readFile(resolve(args[1]), 'utf8')); }
  catch { console.error('File ambiente non leggibile o non valido. Nessun valore mostrato.'); process.exitCode = 1; return; }
  const problems = stagingProblems(env);
  console.log('Controllo statico locale: nessuna richiesta esterna, modifica, migrazione o invio email.');
  for (const problem of problems) console.log('- ' + problem);
  console.log(problems.length ? `CONFIGURAZIONE INCOMPLETA: ${problems.length} controlli da risolvere.` : 'FORMATO CONFIGURAZIONE OK. Credenziali, separazione DB e servizi esterni ancora da verificare sul provider.');
  process.exitCode = problems.length ? 1 : 0;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main();
