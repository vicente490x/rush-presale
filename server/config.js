import 'dotenv/config';

const n = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const config = {
  port: n(process.env.PORT, 3000),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  isProd: process.env.NODE_ENV === 'production',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL || '',
  priceCents: n(process.env.PRICE_CENTS, 2500),
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
