import 'dotenv/config';

const n = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const config = {
  port: n(process.env.PORT, 3000),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  isProd: process.env.NODE_ENV === 'production',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL || '',
  priceCents: 2500,
  threshold: n(process.env.THRESHOLD, 15),
  maxQty: n(process.env.MAX_QTY, 5),
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  demoMode: !process.env.STRIPE_SECRET_KEY && process.env.DEMO_MODE !== 'false',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: n(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  mailFrom: process.env.MAIL_FROM || 'Rush <no-reply@localhost>',
  replicateToken: process.env.REPLICATE_API_TOKEN || '',
  replicateVersion: process.env.REPLICATE_MODEL_VERSION || '',
  dataDir: process.env.DATA_DIR || './data'
};

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function validateRuntimeConfig() {
  if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT deve essere un numero intero compreso tra 1 e 65535.');
  }
  if (!Number.isSafeInteger(config.threshold) || config.threshold < 1) {
    throw new Error('THRESHOLD deve essere un numero intero maggiore di zero.');
  }
  if (!Number.isSafeInteger(config.maxQty) || config.maxQty < 1) {
    throw new Error('MAX_QTY deve essere un numero intero maggiore di zero.');
  }
  if (config.maxQty > Math.floor(Number.MAX_SAFE_INTEGER / config.priceCents)) {
    throw new Error('MAX_QTY è troppo grande per calcolare in sicurezza il totale dell’ordine.');
  }
  if (!Number.isSafeInteger(config.smtp.port) || config.smtp.port < 1 || config.smtp.port > 65535) {
    throw new Error('SMTP_PORT deve essere un numero intero compreso tra 1 e 65535.');
  }
  if (!config.demoMode && !config.stripeKey) {
    throw new Error('DEMO_MODE=false richiede STRIPE_SECRET_KEY.');
  }
  if (!config.isProd) return;

  const errors = [];
  let publicUrl;
  try {
    publicUrl = new URL(config.baseUrl);
  } catch {
    errors.push('BASE_URL deve essere l’URL HTTPS pubblico del sito.');
  }
  if (publicUrl && (publicUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(publicUrl.hostname))) {
    errors.push('BASE_URL deve essere l’URL HTTPS pubblico del sito.');
  }
  if (config.adminPassword.length < 16 || config.adminPassword === 'admin') {
    errors.push('ADMIN_PASSWORD deve contenere almeno 16 caratteri e non può essere la password predefinita.');
  }
  if (config.sessionSecret.length < 32 || config.sessionSecret === 'dev-secret-change-me') {
    errors.push('SESSION_SECRET deve contenere almeno 32 caratteri casuali.');
  }
  if (!config.stripeKey.startsWith('sk_') || !config.stripeWebhookSecret.startsWith('whsec_')) {
    errors.push('Per la produzione sono obbligatorie STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET valide.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(config.adminEmail)) {
    errors.push('ADMIN_EMAIL deve essere un indirizzo email valido.');
  }
  const sender = config.mailFrom.match(/<([^>]+)>/)?.[1] || config.mailFrom;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sender) || sender.endsWith('@localhost')) {
    errors.push('MAIL_FROM deve essere un indirizzo email valido del dominio del mittente.');
  }
  if (!config.smtp.host) errors.push('SMTP_HOST è obbligatorio per inviare le email di conferma e rimborso.');
  if (errors.length) throw new Error(`Configurazione di produzione non valida:\n- ${errors.join('\n- ')}`);
}
