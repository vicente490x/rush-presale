const box = document.getElementById('box');
const q = new URLSearchParams(location.search);
const code = q.get('code');
const dt = (i) => new Date(i).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

async function get() { const r = await fetch('/api/order/' + encodeURIComponent(code)); return r.ok ? r.json() : null; }

function done(o) {
  box.innerHTML = `
    <div class="tick"><svg viewBox="0 0 48 48"><path d="M10 25l9 9 19-20"/></svg></div>
    <h1 class="wide">ORDINE CONFERMATO</h1>
    <div class="code">${o.code}</div>
    <p>Maglietta Rush, taglia ${o.size} × ${o.quantity}. Ti abbiamo scritto una email di conferma.</p>
    <p>Se la produzione non parte entro il ${dt(o.expiresAt)}, ricevi il rimborso automatico.</p>
    <a class="btn2" href="/">Torna alla home</a>`;
}

(async () => {
  if (!code) return (box.innerHTML = '<p>Ordine non trovato.</p>');
  if (q.get('demo')) {
    box.innerHTML = `<h1 class="wide">PAGAMENTO DEMO</h1><p>Modalità di prova: premi per simulare il pagamento.</p><button class="cta" style="opacity:1;transform:none;animation:none" id="go">SIMULA PAGAMENTO</button>`;
    document.getElementById('go').onclick = async () => {
      await fetch('/api/demo/pay/' + code, { method: 'POST' });
      done(await get());
    };
    return;
  }
  for (let i = 0; i < 20; i++) {
    const o = await get();
    if (!o) return (box.innerHTML = '<p>Ordine non trovato.</p>');
    if (o.paymentStatus === 'paid') return done(o);
    if (o.paymentStatus === 'failed') return (box.innerHTML = '<h1 class="wide">PAGAMENTO NON RIUSCITO</h1><p>Nessun addebito. Puoi riprovare.</p><a class="btn2" href="/presale.html">Riprova</a>');
    await new Promise((r) => setTimeout(r, 1500));
  }
  box.innerHTML = '<h1 class="wide">PAGAMENTO IN ELABORAZIONE</h1><p>Appena confermato ti arriva una email con il riepilogo.</p>';
})();
