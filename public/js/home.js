const meta = document.getElementById('meta');
const cta = document.querySelector('.cta');
fetch('/api/status')
  .then((r) => {
    if (!r.ok) throw new Error('Impossibile leggere lo stato della PRE-SALE.');
    return r.json();
  })
  .then((s) => {
    cta.textContent = s.open ? 'PRE-SALE' : 'PRE-SALE CHIUSA';
    cta.setAttribute('aria-label', s.open ? 'Vai alla pagina PRE-SALE' : 'PRE-SALE chiusa: consulta lo stato degli ordini');
    meta.textContent = `${s.total} / ${s.threshold} pezzi prenotati${s.thresholdReached ? ' — SOGLIA RAGGIUNTA' : ''}`;
  })
  .catch(() => {
    meta.textContent = 'Contatore PRE-SALE temporaneamente non disponibile.';
  });

const c = document.getElementById('embers');
const ctx = c.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W, H, parts = [];
function size() {
  const d = Math.min(devicePixelRatio || 1, 2);
  W = c.clientWidth; H = c.clientHeight;
  c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
}
const mk = (init) => ({
  x: Math.random() * W,
  y: init ? Math.random() * H : H + 10,
  r: Math.random() * 1.8 + .4,
  vy: Math.random() * .8 + .3,
  vx: (Math.random() - .5) * .3,
  a: Math.random() * .7 + .2,
  hue: Math.random() < .25 ? 22 : 0
});
size(); addEventListener('resize', size);
if (reduce) {
  c.hidden = true;
} else {
  parts = Array.from({ length: 70 }, () => mk(true));
(function loop() {
  ctx.clearRect(0, 0, W, H);
  for (const p of parts) {
    p.y -= p.vy; p.x += p.vx + Math.sin(p.y / 40) * .15; p.a -= .0016;
    if (p.y < -10 || p.a <= 0) Object.assign(p, mk(false));
    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue},95%,55%,${p.a})`;
    ctx.shadowColor = `hsla(${p.hue},100%,50%,.9)`; ctx.shadowBlur = 8;
    ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  requestAnimationFrame(loop);
})();
}
