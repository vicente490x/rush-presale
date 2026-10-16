import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
async function hidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error('Esegui da un terminale interattivo.');
  stdout.write(label); stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => { stdin.off('data', onData); stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); if (error) reject(error); else resolve(value); };
    function onData(chunk: Buffer) {
      for (const c of chunk.toString('utf8')) {
        if (c === '\u0003') { finish(new Error('Annullato.')); return; }
        if (c === '\r' || c === '\n') { finish(); return; }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1); else value += c;
      }
    }
    stdin.on('data', onData);
  });
}
async function password(label: string) {
  const value = await hidden(label + ' (minimo 16 caratteri, input nascosto): ');
  if (value.length < 16 || Buffer.byteLength(value) > 72) throw new Error('Password: minimo 16 caratteri e massimo 72 byte UTF-8.');
  if (value !== await hidden('Ripeti: ')) throw new Error('Le password non coincidono.');
  return value;
}
async function main() {
  const admin = await password('Password amministratore');
  const gate = await password('Password condivisa anteprima');
  if (admin === gate) throw new Error('Le due password devono essere diverse.');
  const content = [
    'ADMIN_ID=rush-admin', 'ADMIN_PASSWORD_HASH=' + await bcrypt.hash(admin, 12),
    'STAGING_PASSWORD_HASH=' + await bcrypt.hash(gate, 12),
    'SESSION_SECRET=' + randomBytes(32).toString('base64url'),
    'STAGING_SESSION_SECRET=' + randomBytes(32).toString('base64url'),
    'CRON_SECRET=' + randomBytes(32).toString('base64url'), ''
  ].join('\n');
  await writeFile('.env.staging.credentials.local', content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log('Hash e segreti scritti nel file locale ignorato .env.staging.credentials.local. Nessuna password in chiaro salvata. Copia i valori esclusivamente nelle variabili Vercel Preview; non condividere questo file.');
}
main().catch(error => { console.error(error instanceof Error && 'code' in error && error.code === 'EEXIST' ? 'File credenziali già esistente: nessuna sovrascrittura effettuata.' : error instanceof Error ? error.message : 'Creazione non riuscita.'); process.exitCode = 1; });
