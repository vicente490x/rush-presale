import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
async function hidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error('Esegui da un terminale interattivo.');
  stdout.write(label); stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => { stdin.off('data', onData); stdin.off('end', onEnd); stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); if (error) reject(error); else resolve(value); };
    const onEnd = () => finish(new Error('Input interrotto: nessuna credenziale salvata.'));
    function onData(chunk: Buffer) {
      for (const c of chunk.toString('utf8')) {
        if (['\u0003', '\u0004', '\u001a'].includes(c)) { finish(new Error('Annullato.')); return; }
        if (c === '\r' || c === '\n') { finish(); return; }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1); else value += c;
      }
    }
    stdin.on('data', onData);
    stdin.once('end', onEnd);
  });
}
async function password(label: string) {
  const value = await hidden(label + ' (minimo 16 caratteri, input nascosto): ');
  if (value.length < 16 || Buffer.byteLength(value) > 72) throw new Error('Password: minimo 16 caratteri e massimo 72 byte UTF-8.');
  if (value !== await hidden('Ripeti: ')) throw new Error('Le password non coincidono.');
  return value;
}
export async function credentialFile(admin: string, gate: string) {
  for (const value of [admin, gate]) {
    if (value.length < 16 || Buffer.byteLength(value) > 72 || /\p{Cc}/u.test(value)) throw new Error('Password: minimo 16 caratteri, massimo 72 byte UTF-8 e nessun carattere di controllo.');
  }
  if (admin === gate) throw new Error('Le due password devono essere diverse.');
  const used = new Set([admin, gate]);
  const secret = () => {
    let value: string;
    do { value = randomBytes(32).toString('base64url'); } while (used.has(value));
    used.add(value); return value;
  };
  return [
    '# Valori letterali per Vercel Preview e staging:check (nessuna espansione di $).',
    '# Non usare direttamente come .env.local del runtime Next.',
    'ADMIN_ID=rush-admin', 'ADMIN_PASSWORD_HASH=' + await bcrypt.hash(admin, 12),
    'STAGING_PASSWORD_HASH=' + await bcrypt.hash(gate, 12),
    'SESSION_SECRET=' + secret(),
    'STAGING_SESSION_SECRET=' + secret(),
    'CRON_SECRET=' + secret(), ''
  ].join('\n');
}
async function main() {
  const admin = await password('Password amministratore');
  const gate = await password('Password condivisa anteprima');
  const content = await credentialFile(admin, gate);
  await writeFile('.env.staging.credentials.local', content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log('Hash e segreti scritti nel file locale ignorato .env.staging.credentials.local. Nessuna password in chiaro salvata. Copia i valori esclusivamente nelle variabili Vercel Preview; non condividere questo file.');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main().catch(error => { console.error(error instanceof Error && 'code' in error && error.code === 'EEXIST' ? 'File credenziali già esistente: nessuna sovrascrittura effettuata.' : error instanceof Error ? error.message : 'Creazione non riuscita.'); process.exitCode = 1; });
