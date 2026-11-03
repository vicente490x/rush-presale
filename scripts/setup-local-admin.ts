import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Esegui questo comando nel terminale interattivo di VS Code.');
  }

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => {
      stdin.off('data', onData);
      stdin.off('end', onEnd);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onEnd = () => finish(new Error('Input interrotto: nessuna credenziale salvata.'));
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (['\u0003', '\u0004', '\u001a'].includes(character)) {
          finish(new Error('Configurazione annullata.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        } else {
          value += character;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
    stdin.once('end', onEnd);
  });
}

export function setEnvValue(content: string, name: string, value: string) {
  // Next expands $variables even inside quoted dotenv values.
  const line = `${name}=${value.replace(/\$/g, '\\$')}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  return pattern.test(content)
    ? content.replace(pattern, () => line)
    : `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  const envPath = '.env.local';
  let content: string;
  try {
    content = await readFile(envPath, 'utf8');
  } catch {
    throw new Error('.env.local non trovato. Configura prima PostgreSQL locale.');
  }

  const password = await readHidden('Nuova password admin (minimo 16 caratteri, input nascosto): ');
  const confirmation = await readHidden('Ripeti la password admin: ');
  if (password.length < 16 || Buffer.byteLength(password, 'utf8') > 72 || /\p{Cc}/u.test(password)) {
    throw new Error('La password deve contenere almeno 16 caratteri, non superare 72 byte UTF-8 e non contenere caratteri di controllo.');
  }
  if (password !== confirmation) {
    throw new Error('Le password non coincidono.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionSecret = randomBytes(32).toString('base64url');
  content = setEnvValue(content, 'ADMIN_PASSWORD_HASH', passwordHash);
  content = setEnvValue(content, 'SESSION_SECRET', sessionSecret);
  await writeFile(envPath, content, { encoding: 'utf8', mode: 0o600 });

  stdout.write('Credenziali admin salvate in .env.local. I segreti non sono stati mostrati.\n');
  stdout.write('Esegui npm run db:migrate e npm run create-admin per inizializzare l’account nel database. Un account esistente non viene modificato.\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Configurazione admin non riuscita.');
  process.exitCode = 1;
});
