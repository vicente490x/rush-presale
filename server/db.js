import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
export const dbPath = path.resolve(config.dataDir, 'rush.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TEXT,
  expires_at TEXT,
  warned INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'none',
  refunded_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'da_consegnare',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const defaults = {
  presale_open: '1',
  production_status: 'in_raccolta',
  threshold_notified: '0'
};
for (const [k, v] of Object.entries(defaults)) {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(k, v);
}

export const getSetting = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
export const setSetting = (k, v) =>
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, String(v));

export function newOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(6)) s += chars[b % chars.length];
  return `RUSH-${s}`;
}

export const totalPieces = () =>
  db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM orders WHERE payment_status='paid' AND refund_status NOT IN ('refunded')`).get().n;

export function publicStatus() {
  const total = totalPieces();
  return {
    total,
    threshold: config.threshold,
    missing: Math.max(0, config.threshold - total),
    thresholdReached: total >= config.threshold,
    open: getSetting('presale_open') === '1',
    production: getSetting('production_status'),
    priceCents: config.priceCents,
    maxQty: config.maxQty,
    tryon: Boolean(config.replicateToken && config.replicateVersion)
  };
}
