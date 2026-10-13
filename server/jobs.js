import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { db, dbPath, getSetting } from './db.js';
import { config } from './config.js';
import { refundOrder } from './payments.js';
import { notifyAdmin } from './mail.js';

export async function runExpiryJob() {
  const prod = getSetting('production_status');
  if (prod === 'produzione_avviata' || prod === 'produzione_completata') return;

  const now = new Date();
  const expired = db
    .prepare(`SELECT * FROM orders WHERE payment_status='paid' AND refund_status IN ('none','failed') AND expires_at <= ?`)
    .all(now.toISOString());
  for (const o of expired) await refundOrder(o);

  const soon = new Date(now.getTime() + 7 * 864e5).toISOString();
  const warn = db
    .prepare(`SELECT * FROM orders WHERE payment_status='paid' AND refund_status='none' AND warned=0 AND expires_at > ? AND expires_at <= ?`)
    .all(now.toISOString(), soon);
  if (warn.length) {
    const lines = warn.map((o) => `${o.code} — ${o.first_name} ${o.last_name} — scade il ${new Date(o.expires_at).toLocaleDateString('it-IT')}`);
    await notifyAdmin('RUSH PRE-SALE — ordini in scadenza entro 7 giorni', `La produzione non risulta avviata.\n\n${lines.join('\n')}`);
    const mark = db.prepare('UPDATE orders SET warned=1 WHERE id=?');
    warn.forEach((o) => mark.run(o.id));
  }
}

export function backupDb() {
  const dir = path.resolve(config.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `rush-${new Date().toISOString().slice(0, 10)}.db`);
  return db.backup(file).then(() => {
    const files = fs.readdirSync(dir).sort();
    files.slice(0, Math.max(0, files.length - 14)).forEach((f) => fs.unlinkSync(path.join(dir, f)));
    return file;
  });
}

export function startJobs() {
  cron.schedule('0 * * * *', () => runExpiryJob().catch((e) => console.error('expiry job', e)));
  cron.schedule('30 3 * * *', () => backupDb().catch((e) => console.error('backup', e)));
  runExpiryJob().catch(() => {});
}
