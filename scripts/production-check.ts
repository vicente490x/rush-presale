import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { productionProblems } from '../lib/deployment-config';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--env-file' || !args[1]) throw new Error('Uso: npm run production:check -- --env-file .env.production.local');
  const input = parseEnv(await readFile(args[1], 'utf8'));
  const problems = productionProblems(input);
  console.log('Verifica statica: nessuna connessione, migrazione, pagamento o email. Nessun valore segreto mostrato.');
  for (const problem of problems) console.log('- ' + problem);
  console.log(problems.length ? `NON PRONTO: ${problems.length} requisiti incompleti.` : 'FORMATO OK: completare le prove online e la checklist di rilascio.');
  process.exitCode = problems.length ? 1 : 0;
}
void main().catch(() => { console.error('Configurazione non leggibile. Uso: npm run production:check -- --env-file .env.production.local'); process.exitCode = 1; });
