const $ = (id) => document.getElementById(id);
const eur = (c) => (c / 100).toFixed(c % 100 ? 2 : 0).replace('.', ',') + '€';
let st = null, qty = 1, shown = 0;

/* galleria */
const gal = $('gallery'), dots = [...$('dots').children], figs = [...gal.children];
gal.addEventListener('scroll', () => {
  const i = Math.round(gal.scrollLeft / gal.clientWidth);
  dots.forEach((d, k) => d.classList.toggle('on', k === i));
  figs.forEach((f, k) => f.classList.toggle('on', k === i));
}, { passive: true });

/* contatore animato */
function countTo(el, to) {
  const from = shown, t0 = performance.now();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; shown = to; return; }
  (function step(t) {
    const p = Math.min(1, (t - t0) / 900);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step); else shown = to;
  })(t0);
}

function render() {
  countTo($('n'), st.total);
  $('th').textContent = st.threshold;
  $('fill').style.width = Math.min(100, (st.total / st.threshold) * 100) + '%';
  $('counter').classList.toggle('reached', st.thresholdReached);
  $('cmsg').textContent = st.thresholdReached
    ? 'Soglia raggiunta: la produzione può partire. La PRE-SALE è ancora aperta.'
    : `${st.missing} ${st.missing === 1 ? 'pezzo mancante' : 'pezzi mancanti'} per raggiungere la soglia minima di produzione.`;
  $('price').textContent = eur(st.priceCents);
  $('total').textContent = eur(st.priceCents * qty);
  if ($('action').dataset.open !== String(st.open)) {
    $('action').innerHTML = st.open
      ? '<button class="pay" id="pay" type="submit">PRE-SALE</button>'
      : '<div class="closed" role="status">PRE-SALE CHIUSA</div>';
    $('action').dataset.open = String(st.open);
  }
  $('tryon').hidden = !st.tryon;
  $('demo').hidden = !st.demo;
}

async function load() {
  const response = await fetch('/api/status');
  if (!response.ok) throw new Error('Impossibile caricare lo stato della PRE-SALE. Ricarica la pagina.');
  st = await response.json();
  if (!$('sizes').children.length) {
    $('sizes').innerHTML = st.sizes.map((s, i) => `<input type="radio" name="size" id="s${i}" value="${s}"><label for="s${i}">${s}</label>`).join('');
  }
  render();
}
load().catch((error) => { $('err').textContent = error.message; });
setInterval(() => load().catch((error) => { $('err').textContent = error.message; }), 15000);

$('minus').onclick = () => {
  qty = Math.max(1, qty - 1);
  $('qty').textContent = qty;
  if (st) render(); else $('total').textContent = eur(2500 * qty);
};
$('plus').onclick = () => {
  qty = Math.min(st?.maxQty || 5, qty + 1);
  $('qty').textContent = qty;
  if (st) render(); else $('total').textContent = eur(2500 * qty);
};

if (new URLSearchParams(location.search).get('annullato')) $('err').textContent = 'Pagamento annullato. Puoi riprovare quando vuoi.';

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!st?.open) return ($('err').textContent = 'La PRE-SALE è chiusa.');
  const size = document.querySelector('input[name=size]:checked')?.value;
  $('err').textContent = '';
  if (!$('firstName').value.trim() || !$('lastName').value.trim()) return ($('err').textContent = 'Inserisci nome e cognome.');
  if (!$('email').checkValidity()) return ($('err').textContent = 'Inserisci un indirizzo email valido.');
  if (!size) return ($('err').textContent = 'Scegli una taglia.');
  if (!$('terms').checked) return ($('err').textContent = 'Devi accettare le condizioni della PRE-SALE.');
  const btn = $('pay'); btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch('/api/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size, quantity: qty, terms: true,
        firstName: $('firstName').value, lastName: $('lastName').value, email: $('email').value, website: $('website').value
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Errore');
    location.href = d.url;
  } catch (err) {
    $('err').textContent = err.message;
    btn.disabled = false; btn.textContent = 'PRE-SALE';
    load().catch((loadError) => { $('err').textContent += ` ${loadError.message}`; });
  }
});

/* prova AI */
$('photo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  $('terr').textContent = '';
  const out = $('tout'); out.classList.add('show', 'loading');
  $('timg').src = URL.createObjectURL(f);
  const fd = new FormData(); fd.append('photo', f);
  try {
    const r = await fetch('/api/tryon', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Errore');
    $('timg').src = d.imageUrl;
  } catch (err) {
    $('terr').textContent = err.message; out.classList.remove('show');
  } finally { out.classList.remove('loading'); }
});
