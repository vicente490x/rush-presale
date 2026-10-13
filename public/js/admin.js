const $ = (id) => document.getElementById(id);
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + '€';
const d = (i) => (i ? new Date(i).toLocaleDateString('it-IT') : '—');
const dt = (i) => (i ? new Date(i).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const LABEL = {
  in_raccolta: 'IN RACCOLTA', soglia_raggiunta: 'SOGLIA RAGGIUNTA',
  produzione_avviata: 'PRODUZIONE AVVIATA', produzione_completata: 'PRODUZIONE COMPLETATA',
  da_consegnare: 'Da consegnare', serata_rush: 'Consegna tramite serata Rush', tramite_pr: 'Consegna tramite PR', consegnata: 'Consegnata'
};
async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Richiesta non riuscita (${response.status}).`);
  return data;
}

function feedback(message = '') {
  $('feedback').textContent = message;
}

let dash;

async function load() {
  const r = await fetch('/api/admin/dashboard');
  if (r.status === 401) { $('login').hidden = false; $('app').hidden = true; return; }
  if (!r.ok) throw new Error(`Caricamento dashboard non riuscito (${r.status}).`);
  dash = await r.json();
  $('login').hidden = true; $('app').hidden = false;

  $('banner').innerHTML = dash.thresholdReached
    ? `<div class="banner">✓ Soglia raggiunta: ${dash.total} / ${dash.threshold} pezzi. Puoi impostare PRODUZIONE AVVIATA.</div>`
    : '';
  $('stats').innerHTML = [
    ['Pezzi prenotati', `${dash.total} / ${dash.threshold}`], ['Raggiungimento', dash.percent + '%'], ['Ordini totali', dash.ordersCount],
    ['Incassato', eur(dash.revenueCents)], ['PRE-SALE', dash.open ? 'APERTA' : 'CHIUSA'],
    ['Produzione', (LABEL[dash.production] || '').replace(' (in raccolta)', '')],
    ['In scadenza (7 gg)', dash.nearExpiry], ['Da rimborsare', dash.toRefund]
  ].map(([a, b]) => `<div class="card"><small>${a}</small><b style="font-size:${String(b).length > 12 ? 15 : 26}px">${b}</b></div>`).join('');
  $('toggle').textContent = dash.open ? 'Chiudi PRE-SALE' : 'Riapri PRE-SALE';
  $('toggle').className = 'btn ' + (dash.open ? '' : 'red');
  const stateIndex = dash.productionStates.indexOf(dash.production);
  $('prod').innerHTML = dash.productionStates.map((s, i) => {
    const unavailable = i < stateIndex
      || (s === 'produzione_avviata' && !dash.thresholdReached)
      || (s === 'produzione_completata' && dash.production !== 'produzione_avviata' && dash.production !== 'produzione_completata');
    return `<option value="${s}" ${s === dash.production ? 'selected' : ''} ${unavailable ? 'disabled' : ''}>${LABEL[s]}</option>`;
  }).join('');
  $('sizes').innerHTML = Object.entries(dash.bySize).map(([s, n]) => `<div><small>${s}</small><b>${n}</b></div>`).join('');

  const response = await fetch('/api/admin/orders');
  if (!response.ok) throw new Error(`Caricamento ordini non riuscito (${response.status}).`);
  const orders = await response.json();
  $('rows').innerHTML = orders.map((o) => `<tr>
    <td>${o.code}</td><td>${esc(o.first_name)} ${esc(o.last_name)}</td><td>${esc(o.email)}</td><td>${o.size}</td><td>${o.quantity}</td>
    <td>${eur(o.amount_cents)}</td><td>${dt(o.paid_at)}</td><td>${d(o.expires_at)}</td>
    <td><span class="tag ${o.payment_status === 'paid' ? 'ok' : ''}">${esc(o.payment_status)}</span></td>
    <td>${LABEL[dash.production]}</td>
    <td><span class="tag ${o.refund_status === 'refunded' ? 'ok' : o.refund_status === 'failed' ? 'bad' : ''}">${o.refund_status}</span></td>
    <td><select class="sel" style="height:34px" data-del="${o.id}">${dash.deliveryStates.map((s) => `<option value="${s}" ${s === o.delivery_status ? 'selected' : ''}>${LABEL[s]}</option>`).join('')}</select></td>
    <td>${o.payment_status !== 'paid' || o.refund_status === 'refunded' ? '' : `<button class="btn sm" data-ref="${o.id}">Rimborsa</button>`}</td></tr>`).join('');
  feedback();
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

$('lf').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await post('/api/admin/login', { password: $('pw').value });
    $('pw').value = '';
    $('lerr').textContent = '';
    await load();
  } catch (error) {
    $('lerr').textContent = error.message;
  }
};
$('out').onclick = async () => {
  try { await post('/api/admin/logout'); await load(); } catch (error) { feedback(error.message); }
};
$('toggle').onclick = async () => {
  if (dash.open && !confirm('Chiudere la PRE-SALE? Non verranno accettati nuovi ordini.')) return;
  try { await post('/api/admin/presale', { open: !dash.open }); await load(); } catch (error) { feedback(error.message); }
};
$('prod').onchange = async (e) => {
  if (e.target.value === 'produzione_avviata' && !confirm('Confermi: produzione avviata? Gli ordini non saranno più soggetti al rimborso automatico.')) {
    await load().catch((error) => feedback(error.message));
    return;
  }
  try { await post('/api/admin/production', { status: e.target.value }); await load(); }
  catch (error) {
    await load().catch((loadError) => feedback(loadError.message));
    feedback(error.message);
  }
};
$('rows').addEventListener('change', async (e) => {
  if (e.target.dataset.del) {
    try { await post(`/api/admin/orders/${e.target.dataset.del}/delivery`, { status: e.target.value }); feedback(); }
    catch (error) { feedback(error.message); }
  }
});
$('rows').addEventListener('click', async (e) => {
  const id = e.target.dataset.ref;
  if (id && confirm('Rimborsare questo ordine?')) {
    try { await post(`/api/admin/orders/${id}/refund`); await load(); }
    catch (error) { feedback(error.message); }
  }
});
load().catch((error) => feedback(error.message));
setInterval(() => { if (!$('app').hidden) load().catch((error) => feedback(error.message)); }, 30000);
