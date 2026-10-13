const $ = (id) => document.getElementById(id);
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + '€';
const d = (i) => (i ? new Date(i).toLocaleDateString('it-IT') : '—');
const LABEL = {
  in_raccolta: 'PRE-SALE APERTA (in raccolta)', soglia_raggiunta: 'SOGLIA RAGGIUNTA',
  produzione_avviata: 'PRODUZIONE AVVIATA', produzione_completata: 'PRODUZIONE COMPLETATA',
  da_consegnare: 'Da consegnare', serata_rush: 'Consegna tramite serata Rush', tramite_pr: 'Consegna tramite PR', consegnata: 'Consegnata'
};
const post = (u, b) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) });
let dash;

async function load() {
  const r = await fetch('/api/admin/dashboard');
  if (r.status === 401) { $('login').hidden = false; $('app').hidden = true; return; }
  dash = await r.json();
  $('login').hidden = true; $('app').hidden = false;

  $('banner').innerHTML = dash.thresholdReached
    ? `<div class="banner">✓ Soglia raggiunta: ${dash.total} / ${dash.threshold} pezzi. Puoi impostare PRODUZIONE AVVIATA.</div>`
    : '';
  $('stats').innerHTML = [
    ['Pezzi prenotati', `${dash.total} / ${dash.threshold}`], ['Raggiungimento', dash.percent + '%'], ['Ordini', dash.ordersCount],
    ['Incassato', eur(dash.revenueCents)], ['PRE-SALE', dash.open ? 'APERTA' : 'CHIUSA'],
    ['Produzione', (LABEL[dash.production] || '').replace(' (in raccolta)', '')],
    ['In scadenza (14 gg)', dash.nearExpiry], ['Da rimborsare (errori)', dash.toRefund]
  ].map(([a, b]) => `<div class="card"><small>${a}</small><b style="font-size:${String(b).length > 12 ? 15 : 26}px">${b}</b></div>`).join('');
  $('toggle').textContent = dash.open ? 'Chiudi PRE-SALE' : 'Riapri PRE-SALE';
  $('toggle').className = 'btn ' + (dash.open ? '' : 'red');
  $('prod').innerHTML = dash.productionStates.map((s) => `<option value="${s}" ${s === dash.production ? 'selected' : ''}>${LABEL[s]}</option>`).join('');
  $('sizes').innerHTML = Object.entries(dash.bySize).map(([s, n]) => `<div><small>${s}</small><b>${n}</b></div>`).join('');

  const orders = await (await fetch('/api/admin/orders')).json();
  $('rows').innerHTML = orders.map((o) => `<tr>
    <td>${o.code}</td><td>${esc(o.first_name)} ${esc(o.last_name)}</td><td>${esc(o.email)}</td><td>${o.size}</td><td>${o.quantity}</td>
    <td>${eur(o.amount_cents)}</td><td>${d(o.paid_at)}</td><td>${d(o.expires_at)}</td>
    <td><span class="tag ${o.payment_status === 'paid' ? 'ok' : ''}">${o.payment_status}</span></td>
    <td><span class="tag ${o.refund_status === 'refunded' ? 'ok' : o.refund_status === 'failed' ? 'bad' : ''}">${o.refund_status}</span></td>
    <td><select class="sel" style="height:34px" data-del="${o.id}">${dash.deliveryStates.map((s) => `<option value="${s}" ${s === o.delivery_status ? 'selected' : ''}>${LABEL[s]}</option>`).join('')}</select></td>
    <td>${o.refund_status === 'refunded' ? '' : `<button class="btn sm" data-ref="${o.id}">Rimborsa</button>`}</td></tr>`).join('');
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

$('lf').onsubmit = async (e) => {
  e.preventDefault();
  const r = await post('/api/admin/login', { password: $('pw').value });
  if (r.ok) { $('pw').value = ''; load(); } else $('lerr').textContent = 'Password errata.';
};
$('out').onclick = async () => { await post('/api/admin/logout'); load(); };
$('toggle').onclick = async () => {
  if (dash.open && !confirm('Chiudere la PRE-SALE? Non verranno accettati nuovi ordini.')) return;
  await post('/api/admin/presale', { open: !dash.open }); load();
};
$('prod').onchange = async (e) => {
  if (e.target.value === 'produzione_avviata' && !confirm('Confermi: produzione avviata? Gli ordini non saranno più soggetti al rimborso automatico.')) return load();
  await post('/api/admin/production', { status: e.target.value }); load();
};
$('rows').addEventListener('change', async (e) => {
  if (e.target.dataset.del) await post(`/api/admin/orders/${e.target.dataset.del}/delivery`, { status: e.target.value });
});
$('rows').addEventListener('click', async (e) => {
  const id = e.target.dataset.ref;
  if (id && confirm('Rimborsare questo ordine?')) { await post(`/api/admin/orders/${id}/refund`); load(); }
});
load();
setInterval(() => { if (!$('app').hidden) load(); }, 30000);
