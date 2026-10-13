import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, SIZES } from './config.js';
import { db, getSetting, setSetting, newOrderCode, publicStatus, totalPieces } from './db.js';
import { makeToken, passwordOk, requireAdmin } from './auth.js';
import { stripe, markPaid, refundOrder } from './payments.js';
import { startJobs } from './jobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://replicate.delivery', 'https://*.replicate.delivery'],
        'connect-src': ["'self'"],
        'form-action': ["'self'", 'https://checkout.stripe.com']
      }
    }
  })
);
app.use(cookieParser());

/* ---------- Stripe webhook (raw body, prima di express.json) ---------- */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(400).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }
  try {
    const s = event.data.object;
    if (event.type === 'checkout.session.completed' && s.payment_status === 'paid') {
      await markPaid(Number(s.metadata.order_id), { sessionId: s.id, paymentIntent: s.payment_intent });
    } else if (event.type === 'checkout.session.expired') {
      db.prepare(`UPDATE orders SET payment_status='failed' WHERE id=? AND payment_status='pending'`).run(Number(s.metadata.order_id));
    }
    res.json({ received: true });
  } catch (e) {
    console.error('webhook', e);
    res.status(500).end();
  }
});

app.use(express.json({ limit: '50kb' }));

/* ---------- API pubblica ---------- */
app.get('/api/status', (req, res) => res.json({ ...publicStatus(), sizes: SIZES, demo: config.demoMode }));

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/order', orderLimiter, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ url: '/' }); // honeypot
  const st = publicStatus();
  if (!st.open) return res.status(403).json({ error: 'PRE-SALE CHIUSA' });

  const first = String(b.firstName || '').trim().slice(0, 60);
  const last = String(b.lastName || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  const size = String(b.size || '');
  const qty = Math.floor(Number(b.quantity || 1));
  if (!first || !last) return res.status(400).json({ error: 'Inserisci nome e cognome.' });
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Email non valida.' });
  if (!SIZES.includes(size)) return res.status(400).json({ error: 'Scegli una taglia.' });
  if (!(qty >= 1 && qty <= config.maxQty)) return res.status(400).json({ error: 'Quantità non valida.' });
  if (b.terms !== true) return res.status(400).json({ error: 'Devi accettare le condizioni della PRE-SALE.' });

  const code = newOrderCode();
  const amount = config.priceCents * qty;
  const info = db
    .prepare(
      `INSERT INTO orders (code, first_name, last_name, email, size, quantity, amount_cents, terms_accepted_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(code, first, last, email, size, qty, amount, new Date().toISOString(), new Date().toISOString());
  const id = info.lastInsertRowid;

  try {
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [
          {
            quantity: qty,
            price_data: {
              currency: 'eur',
              unit_amount: config.priceCents,
              product_data: { name: `Rush T-Shirt — PRE-SALE (taglia ${size})` }
            }
          }
        ],
        metadata: { order_id: String(id), code },
        success_url: `${config.baseUrl}/conferma.html?code=${code}`,
        cancel_url: `${config.baseUrl}/presale.html?annullato=1`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60
      });
      db.prepare('UPDATE orders SET stripe_session_id=? WHERE id=?').run(session.id, id);
      return res.json({ url: session.url });
    }
    if (config.demoMode) return res.json({ url: `/conferma.html?code=${code}&demo=1` });
    throw new Error('Pagamenti non configurati');
  } catch (e) {
    console.error('checkout', e.message);
    db.prepare(`UPDATE orders SET payment_status='failed' WHERE id=?`).run(id);
    res.status(502).json({ error: 'Errore nel pagamento. Riprova tra poco.' });
  }
});

app.get('/api/order/:code', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE code=?').get(String(req.params.code).toUpperCase());
  if (!o) return res.status(404).json({ error: 'non_trovato' });
  res.json({ code: o.code, firstName: o.first_name, size: o.size, quantity: o.quantity, amountCents: o.amount_cents, paymentStatus: o.payment_status, expiresAt: o.expires_at });
});

// Pagamento simulato (solo DEMO_MODE senza Stripe)
app.post('/api/demo/pay/:code', async (req, res) => {
  if (!config.demoMode) return res.status(404).end();
  const o = db.prepare('SELECT * FROM orders WHERE code=?').get(String(req.params.code).toUpperCase());
  if (!o) return res.status(404).end();
  await markPaid(o.id);
  res.json({ ok: true });
});

/* ---------- Prova AI (opzionale) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype))
});
const tryonLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

app.post('/api/tryon', tryonLimiter, upload.single('photo'), async (req, res) => {
  if (!config.replicateToken || !config.replicateVersion) return res.status(501).json({ error: 'Prova AI non attiva.' });
  if (!req.file) return res.status(400).json({ error: 'Carica una foto JPG, PNG o WEBP (max 8 MB).' });
  try {
    const garment = fs.readFileSync(path.join(__dirname, '../public/img/front.jpg'));
    const human = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const garm = `data:image/jpeg;base64,${garment.toString('base64')}`;
    const headers = { Authorization: `Bearer ${config.replicateToken}`, 'Content-Type': 'application/json' };
    let p = await (
      await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { ...headers, Prefer: 'wait=60' },
        body: JSON.stringify({
          version: config.replicateVersion,
          input: { human_img: human, garm_img: garm, garment_des: 'black oversized t-shirt with small red Rush logo', category: 'upper_body' }
        })
      })
    ).json();
    for (let i = 0; i < 40 && p.status && !['succeeded', 'failed', 'canceled'].includes(p.status); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      p = await (await fetch(p.urls.get, { headers })).json();
    }
    const out = Array.isArray(p.output) ? p.output[0] : p.output;
    if (p.status !== 'succeeded' || !out) throw new Error(p.error || 'generazione fallita');
    res.json({ imageUrl: out });
  } catch (e) {
    console.error('tryon', e.message);
    res.status(502).json({ error: 'Non sono riuscito a generare l\'anteprima. Prova con un\'altra foto.' });
  }
});

/* ---------- Admin ---------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

app.post('/api/admin/login', loginLimiter, (req, res) => {
  if (!passwordOk(req.body?.password)) return res.status(401).json({ error: 'Password errata.' });
  res.cookie('rush_admin', makeToken(), { httpOnly: true, sameSite: 'strict', secure: config.isProd, maxAge: 12 * 3600 * 1000 });
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('rush_admin');
  res.json({ ok: true });
});

const PROD_STATES = ['in_raccolta', 'soglia_raggiunta', 'produzione_avviata', 'produzione_completata'];
const DELIVERY = ['da_consegnare', 'serata_rush', 'tramite_pr', 'consegnata'];

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const total = totalPieces();
  const paid = `payment_status='paid' AND refund_status NOT IN ('refunded')`;
  const bySize = Object.fromEntries(SIZES.map((s) => [s, 0]));
  db.prepare(`SELECT size, SUM(quantity) n FROM orders WHERE ${paid} GROUP BY size`).all().forEach((r) => (bySize[r.size] = r.n));
  const ordersCount = db.prepare(`SELECT COUNT(*) n FROM orders WHERE ${paid}`).get().n;
  const revenue = db.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM orders WHERE ${paid}`).get().n;
  const soon = new Date(Date.now() + 14 * 864e5).toISOString();
  const nearExpiry = db
    .prepare(`SELECT COUNT(*) n FROM orders WHERE payment_status='paid' AND refund_status='none' AND expires_at <= ?`)
    .get(soon).n;
  const toRefund = db.prepare(`SELECT COUNT(*) n FROM orders WHERE payment_status='paid' AND refund_status IN ('failed') `).get().n;
  res.json({
    total,
    threshold: config.threshold,
    percent: Math.min(100, Math.round((total / config.threshold) * 100)),
    ordersCount,
    revenueCents: revenue,
    bySize,
    open: getSetting('presale_open') === '1',
    production: getSetting('production_status'),
    thresholdReached: total >= config.threshold,
    nearExpiry,
    toRefund,
    productionStates: PROD_STATES,
    deliveryStates: DELIVERY
  });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE payment_status IN ('paid') OR refund_status!='none' ORDER BY id DESC`).all();
  res.json(rows);
});

app.post('/api/admin/presale', requireAdmin, (req, res) => {
  setSetting('presale_open', req.body?.open ? '1' : '0');
  res.json({ ok: true });
});

app.post('/api/admin/production', requireAdmin, (req, res) => {
  const s = req.body?.status;
  if (!PROD_STATES.includes(s)) return res.status(400).json({ error: 'stato non valido' });
  setSetting('production_status', s);
  res.json({ ok: true });
});

app.post('/api/admin/orders/:id/delivery', requireAdmin, (req, res) => {
  if (!DELIVERY.includes(req.body?.status)) return res.status(400).json({ error: 'stato non valido' });
  db.prepare('UPDATE orders SET delivery_status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/orders/:id/refund', requireAdmin, async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o || o.payment_status !== 'paid') return res.status(404).json({ error: 'ordine non trovato' });
  const ok = await refundOrder(o, { reason: 'manuale' });
  res.json({ ok });
});

app.get('/api/admin/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE payment_status='paid' ORDER BY id`).all();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Ordine', 'Nome', 'Cognome', 'Email', 'Taglia', 'Quantita', 'Importo EUR', 'Pagato il', 'Scadenza', 'Rimborso', 'Consegna'];
  const lines = rows.map((o) =>
    [o.code, o.first_name, o.last_name, o.email, o.size, o.quantity, (o.amount_cents / 100).toFixed(2).replace('.', ','), o.paid_at, o.expires_at, o.refund_status, o.delivery_status].map(esc).join(';')
  );
  const sizes = db
    .prepare(`SELECT size, SUM(quantity) n FROM orders WHERE payment_status='paid' AND refund_status!='refunded' GROUP BY size`)
    .all();
  const summary = ['', 'RIEPILOGO PER PRODUTTORE', ...SIZES.map((s) => `${s};${sizes.find((x) => x.size === s)?.n || 0}`)];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rush-ordini.csv"');
  res.send('\uFEFF' + [head.join(';'), ...lines, ...summary].join('\r\n'));
});

/* ---------- Statico ---------- */
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));

app.listen(config.port, () => {
  console.log(`Rush PRE-SALE su ${config.baseUrl}  (${config.demoMode ? 'DEMO: pagamenti simulati' : stripe ? 'Stripe attivo' : 'pagamenti NON configurati'})`);
  startJobs();
});
