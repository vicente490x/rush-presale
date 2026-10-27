import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const value = process.env.RUSH_TEST_DATABASE_URL;
if (!value) throw new Error('RUSH_TEST_DATABASE_URL richiesto.');
const db = new URL(value);
if (!['localhost', '127.0.0.1'].includes(db.hostname) || !db.pathname.startsWith('/rush_audit')) throw new Error('Serve un DB locale temporaneo rush_audit*.');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Avvia con npm run verify:release.');
mkdirSync('.test-results/release', { recursive: true });
const env = { ...process.env, APP_ENV: 'staging', STAGING_DATABASE_CONFIRMED: 'true', STRIPE_MODE: 'test', ALLOW_LIVE_PAYMENTS: 'false',
  NEXT_PUBLIC_SITE_URL: 'https://rush-staging.example.invalid', DATABASE_URL: value, DIRECT_URL: value };
const commands = [
  ['install', ['ci']], ['audit', ['audit', '--audit-level=high']],
  ...['lint', 'typecheck', 'test', 'db:validate', 'build', 'test:integration', 'test:migration', 'test:backup', 'test:http', 'test:browser']
    .map(name => [name.replaceAll(':', '-'), ['run', name]])
];
const from = process.argv[2]?.replace(/^--from=/, '');
const start = from ? commands.findIndex(([name]) => name === from) : 0;
if (start < 0 || process.argv.length > 3 || (from && !process.argv[2].startsWith('--from='))) throw new Error('Usa --from=<nome-controllo> per riprendere controlli documentati.');
const results = start ? JSON.parse(readFileSync('.test-results/release/results.json', 'utf8')).results.slice(0, start) : [];
if (results.length !== start || results.some((row, index) => row.name !== commands[index][0] || row.result !== 'PASS' ||
  createHash('sha256').update(readFileSync(row.log)).digest('hex') !== row.sha256)) throw new Error('Evidenze precedenti mancanti o incoerenti.');
for (const [name, args] of commands.slice(start)) {
  const startedAt = new Date().toISOString();
  console.log('CHECK ' + name);
  const result = spawnSync(process.execPath, [npm, ...args], { env, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
  const log = (result.stdout ?? '') + (result.stderr ?? '') + (result.error ? '\nRUNNER: ' + result.error.message : '');
  const file = '.test-results/release/' + name + '.log';
  writeFileSync(file, log);
  results.push({ name, command: 'npm ' + args.join(' '), startedAt, finishedAt: new Date().toISOString(),
    exitCode: result.status, result: result.status === 0 ? 'PASS' : 'FAIL', log: file, sha256: createHash('sha256').update(log).digest('hex') });
  writeFileSync('.test-results/release/results.json', JSON.stringify({ date: new Date().toISOString(), node: process.version,
    platform: process.platform, results }, null, 2));
  console.log(results.at(-1).result + ' ' + name);
  if (result.status !== 0) { console.error(log.slice(-5000)); process.exitCode = 1; break; }
}

